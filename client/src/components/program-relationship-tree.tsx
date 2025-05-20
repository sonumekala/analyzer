import React, { useState, useCallback } from 'react';
import { 
  Card, CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { 
  ArrowRight, 
  FileText,
  ChevronRight,
  ChevronDown,
  FolderTree,
  Loader2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AnalysisReport } from '@shared/schema';

interface ProgramRelationshipTreeProps {
  className?: string;
  isLoading?: boolean;
  projectAnalysis?: AnalysisReport;
}

type TreeNode = {
  id: string;
  name: string;
  program_id: string;
  description: string;
  children: TreeNode[];
  level: number;
};

export function ProgramRelationshipTree({ 
  className, 
  isLoading = false,
  projectAnalysis 
}: ProgramRelationshipTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  // Helper to toggle node expansion
  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);
  
  // Build program call tree from relationships
  const buildCallTree = useCallback(() => {
    if (!projectAnalysis || !projectAnalysis.projectPrograms || !projectAnalysis.projectRelationships) {
      return [];
    }
    
    // First, build a map of programs
    const programsMap: Record<string, any> = {};
    projectAnalysis.projectPrograms.forEach(program => {
      programsMap[program.id] = {
        ...program,
        children: [],
        level: 0
      };
    });
    
    // Then, build the call relationships
    const callRelationships = projectAnalysis.projectRelationships.filter(
      rel => rel.type === 'Calls'
    );
    
    // Find all top-level programs (those that are not called by any other program)
    const calledPrograms = new Set(callRelationships.map(rel => rel.target));
    const rootPrograms = projectAnalysis.projectPrograms
      .filter(program => !calledPrograms.has(program.id))
      .map(program => program.id);
    
    // If no root programs found, use programs that call others
    const rootProgramIds = rootPrograms.length > 0 
      ? rootPrograms 
      : [...new Set(callRelationships.map(rel => rel.source))];
    
    // Build the tree structure with program calls
    const result: TreeNode[] = [];
    
    const processNode = (nodeId: string, level: number, visited: Set<string> = new Set()) => {
      // Prevent circular references
      if (visited.has(nodeId)) {
        return null;
      }
      
      const program = programsMap[nodeId];
      if (!program) {
        return null;
      }
      
      const newVisited = new Set(visited);
      newVisited.add(nodeId);
      
      const node: TreeNode = {
        ...program,
        level,
        children: []
      };
      
      // Find all calls from this program
      const calls = callRelationships.filter(rel => rel.source === nodeId);
      
      // Process child nodes
      calls.forEach(call => {
        const childNode = processNode(call.target, level + 1, newVisited);
        if (childNode) {
          node.children.push(childNode);
        }
      });
      
      return node;
    };
    
    // Process each root program
    rootProgramIds.forEach(rootId => {
      const node = processNode(rootId, 0);
      if (node) {
        result.push(node);
      }
    });
    
    return result;
  }, [projectAnalysis]);
  
  // Render a tree node recursively
  const renderTreeNode = useCallback((node: TreeNode) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    
    return (
      <div key={node.id} className="ml-4 border-l border-l-muted pl-2">
        <div 
          className={`flex items-center py-1 hover:bg-muted/50 rounded px-2 ${node.level === 0 ? 'font-semibold' : ''}`}
          onClick={() => hasChildren && toggleNode(node.id)}
          style={{ cursor: hasChildren ? 'pointer' : 'default' }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 mr-1 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-1 text-muted-foreground" />
            )
          ) : (
            <div className="w-5"></div> // Spacer
          )}
          
          <FileText className="h-4 w-4 mr-1 text-primary" />
          <span className="truncate text-sm">{node.name}</span>
          
          <Badge variant="outline" className="ml-2 text-xs">
            Program
          </Badge>
        </div>
        
        {isExpanded && hasChildren && (
          <div className="ml-4">
            {node.children.map(child => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  }, [expandedNodes, toggleNode]);
  
  // Render the call tree
  const callTree = buildCallTree();
  
  // Render loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Program Call Structure</CardTitle>
          <CardDescription>Hierarchical view of program calls</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  // Render empty state
  if (!projectAnalysis || !callTree.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Program Call Structure</CardTitle>
          <CardDescription>Hierarchical view of program calls</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FolderTree className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              No program call structure found. Please run a project-wide analysis.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Program Call Structure</CardTitle>
        <CardDescription>Hierarchical view of program calls</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto max-h-[500px]">
          {callTree.map(node => renderTreeNode(node))}
        </div>
      </CardContent>
    </Card>
  );
}