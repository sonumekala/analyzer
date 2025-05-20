import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, ChevronDown, Database, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { AnalysisReport, Entity, Relationship } from '@shared/schema';

interface ProgramCallStructureProps {
  analysis?: AnalysisReport;
  isLoading?: boolean;
}

// Represents a node in the call structure tree
interface CallNode {
  entity: Entity;
  callsOut: CallRelationship[];
  calledBy: CallRelationship[];
  expanded: boolean;
}

// Represents a relationship in the call structure
interface CallRelationship {
  entity: Entity;
  type: string;
  description?: string;
}

export default function ProgramCallStructure({ analysis, isLoading = false }: ProgramCallStructureProps) {
  const [callNodes, setCallNodes] = useState<Map<string, CallNode>>(new Map());
  const [rootNodes, setRootNodes] = useState<string[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'hierarchy' | 'flat'>('hierarchy');

  // Build the call structure based on relationships and/or callingChain
  useEffect(() => {
    if (!analysis) return;
    
    const { entities = [], relationships = [], projectRelationships = [], callingChain, isProjectWide } = analysis;
    
    // Create a map of all entities for quick lookup
    const entityMap = new Map<string, Entity>();
    entities.forEach(entity => {
      entityMap.set(entity.id, entity);
    });
    
    // Create initial call nodes
    const nodes = new Map<string, CallNode>();
    
    // First priority: Use callingChain when available (especially for project-wide analysis)
    if (callingChain && callingChain.flow && callingChain.flow.length > 0) {
      console.log("Using callingChain for program call structure");
      
      // Add all programs from the flow to our nodes
      callingChain.flow.forEach(entity => {
        if (entity.type === 'Program') {
          // Add to entity map if not already there
          if (!entityMap.has(entity.id)) {
            entityMap.set(entity.id, entity);
          }
          
          // Initialize the call node
          nodes.set(entity.id, {
            entity,
            callsOut: [],
            calledBy: [],
            expanded: false
          });
        }
      });
      
      // Process relationships to build call structure with this data
      const allRelationships = [...relationships, ...(projectRelationships || [])];
      
      allRelationships.forEach(rel => {
        // Only include "Calls" relationships
        if (rel.type === 'Calls') {
          const sourceId = rel.source || rel.sourceId;
          const targetId = rel.target || rel.targetId;
          
          if (!sourceId || !targetId) return;
          
          const sourceEntity = entityMap.get(sourceId);
          const targetEntity = entityMap.get(targetId);
          
          // Only include relationships between Program entities
          if (!sourceEntity || !targetEntity) return;
          if (sourceEntity.type !== 'Program' || targetEntity.type !== 'Program') return;
          
          // Add call relationship to source node's callsOut
          const sourceNode = nodes.get(sourceId);
          if (sourceNode) {
            sourceNode.callsOut.push({
              entity: targetEntity,
              type: rel.type,
              description: rel.description
            });
          }
          
          // Add call relationship to target node's calledBy
          const targetNode = nodes.get(targetId);
          if (targetNode) {
            targetNode.calledBy.push({
              entity: sourceEntity,
              type: rel.type,
              description: rel.description
            });
          }
        }
      });
    } else {
      console.log("Using relationships for program call structure");
      
      // Initialize nodes only for Program entities
      // This ensures we only show actual COBOL programs in the call structure
      entities.forEach(entity => {
        // Only include Program entities in the call structure
        if (entity.type === 'Program') {
          nodes.set(entity.id, {
            entity,
            callsOut: [],
            calledBy: [],
            expanded: false
          });
        }
      });
      
      // Process ONLY "Calls" relationships to build the call structure - be very strict
      const allRelationships = [...relationships, ...(projectRelationships || [])];
      
      allRelationships.forEach(rel => {
        // Only include actual "Calls" relationships (not Uses or other types)
        // This ensures we only show relationships with actual evidence in the code
        if (rel.type === 'Calls') {
          const sourceId = rel.source || rel.sourceId;
          const targetId = rel.target || rel.targetId;
          
          if (!sourceId || !targetId) return;
          
          const sourceEntity = entityMap.get(sourceId);
          const targetEntity = entityMap.get(targetId);
          
          // Only include relationships between Program entities
          if (!sourceEntity || !targetEntity) return;
          if (sourceEntity.type !== 'Program' || targetEntity.type !== 'Program') return;
          
          // Add call relationship to source node's callsOut
          const sourceNode = nodes.get(sourceId);
          if (sourceNode) {
            sourceNode.callsOut.push({
              entity: targetEntity,
              type: rel.type,
              description: rel.description
            });
          }
          
          // Add call relationship to target node's calledBy
          const targetNode = nodes.get(targetId);
          if (targetNode) {
            targetNode.calledBy.push({
              entity: sourceEntity,
              type: rel.type,
              description: rel.description
            });
          }
        }
      });
    }
    
    // Identify root nodes (those that are not called by anything else)
    const roots: string[] = [];
    nodes.forEach((node, id) => {
      if (node.calledBy.length === 0 && node.callsOut.length > 0) {
        roots.push(id);
      }
    });
    
    // If no clear root nodes are found, pick programs with the most outgoing calls
    if (roots.length === 0) {
      const programsWithCalls = Array.from(nodes.entries())
        .filter(([_, node]) => node.callsOut.length > 0)
        .sort((a, b) => b[1].callsOut.length - a[1].callsOut.length);
      
      if (programsWithCalls.length > 0) {
        roots.push(programsWithCalls[0][0]);
      } else {
        // If still no roots with calls, just pick any program nodes
        const programNodes = Array.from(nodes.entries());
        if (programNodes.length > 0) {
          roots.push(programNodes[0][0]);
        }
      }
    }
    
    setCallNodes(nodes);
    setRootNodes(roots);
    
    // Auto-expand root nodes
    const initialExpanded = new Set<string>();
    roots.forEach(id => initialExpanded.add(id));
    setExpandedNodes(initialExpanded);
    
  }, [analysis]);
  
  // Toggle node expansion
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };
  
  // Get node type color
  const getNodeTypeColor = (type: string) => {
    switch (type) {
      case 'Program':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
      case 'Subprogram':
      case 'Function':
      case 'Procedure':
        return 'bg-sky-50 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300';
      case 'Database':
      case 'Table':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300';
      case 'File':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300';
      default:
        return 'bg-slate-50 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300';
    }
  };
  
  // Recursive function to render call tree
  const renderCallTree = (nodeId: string, level = 0, visited = new Set<string>()) => {
    // Prevent infinite recursion
    if (visited.has(nodeId)) {
      return null;
    }
    
    const node = callNodes.get(nodeId);
    if (!node) return null;
    
    const isExpanded = expandedNodes.has(nodeId);
    
    // Track visited nodes to prevent circular reference issues
    const newVisited = new Set(visited);
    newVisited.add(nodeId);
    
    return (
      <div key={nodeId} className="call-tree-node" style={{ paddingLeft: `${level * 24}px` }}>
        <div 
          className={`
            flex items-center py-1 px-2 rounded-md cursor-pointer hover:bg-muted
            ${node.callsOut.length > 0 ? 'font-medium' : ''}
          `}
          onClick={() => toggleNode(nodeId)}
        >
          {node.callsOut.length > 0 ? (
            <span className="mr-1 text-muted-foreground">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </span>
          ) : (
            <span className="w-5" />
          )}
          
          <span className="flex-1 flex items-center gap-2">
            <Badge variant="outline" className={getNodeTypeColor(node.entity.type)}>
              {node.entity.type}
            </Badge>
            <span>{node.entity.name}</span>
          </span>
          
          <span className="text-xs text-muted-foreground">
            {node.callsOut.length > 0 && (
              <Badge variant="outline" className="ml-2 text-xs">
                Calls: {node.callsOut.length}
              </Badge>
            )}
            {node.calledBy.length > 0 && (
              <Badge variant="outline" className="ml-2 text-xs">
                Called by: {node.calledBy.length}
              </Badge>
            )}
          </span>
        </div>
        
        {isExpanded && node.callsOut.length > 0 && (
          <div className="ml-5 border-l pl-2 border-border">
            {node.callsOut.map(rel => {
              return renderCallTree(rel.entity.id, level + 1, newVisited);
            })}
          </div>
        )}
      </div>
    );
  };
  
  // Render flat list view with call relationships
  const renderFlatList = () => {
    return Array.from(callNodes.values())
      .sort((a, b) => {
        // Sort by: most called-by first, then alphabetically
        if (a.calledBy.length !== b.calledBy.length) {
          return b.calledBy.length - a.calledBy.length;
        }
        return a.entity.name.localeCompare(b.entity.name);
      })
      .map(node => {
        const isExpanded = expandedNodes.has(node.entity.id);
        
        return (
          <div key={node.entity.id} className="mb-4 border rounded-md p-3">
            <div 
              className="flex items-center cursor-pointer"
              onClick={() => toggleNode(node.entity.id)}
            >
              {(node.callsOut.length > 0 || node.calledBy.length > 0) && (
                <span className="mr-1 text-muted-foreground">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </span>
              )}
              
              <span className="flex-1 flex items-center gap-2">
                <Badge className={getNodeTypeColor(node.entity.type)}>
                  {node.entity.type}
                </Badge>
                <span className="font-medium">{node.entity.name}</span>
              </span>
              
              <div className="flex gap-2">
                {node.calledBy.length > 0 && (
                  <Badge variant="outline">
                    Called by: {node.calledBy.length}
                  </Badge>
                )}
                {node.callsOut.length > 0 && (
                  <Badge variant="outline">
                    Calls: {node.callsOut.length}
                  </Badge>
                )}
              </div>
            </div>
            
            {isExpanded && (
              <div className="mt-3 pl-5">
                {node.calledBy.length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm font-medium text-muted-foreground mb-2">Called by:</div>
                    <div className="space-y-1">
                      {node.calledBy.map((rel, i) => (
                        <div key={`calledby-${i}`} className="flex items-center py-1 px-2 rounded-md bg-muted/50">
                          <Badge className={getNodeTypeColor(rel.entity.type)}>
                            {rel.entity.type}
                          </Badge>
                          <span className="ml-2">{rel.entity.name}</span>
                          <Badge variant="outline" className="ml-auto">
                            {rel.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {node.callsOut.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">Calls:</div>
                    <div className="space-y-1">
                      {node.callsOut.map((rel, i) => (
                        <div key={`callsout-${i}`} className="flex items-center py-1 px-2 rounded-md bg-muted/50">
                          <Badge className={getNodeTypeColor(rel.entity.type)}>
                            {rel.entity.type}
                          </Badge>
                          <span className="ml-2">{rel.entity.name}</span>
                          {rel.entity.type === 'Database' && (
                            <Database className="h-4 w-4 ml-1 text-emerald-500" />
                          )}
                          <Badge variant="outline" className="ml-auto">
                            {rel.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
    });
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl flex items-center gap-2">
          Program Call Structure
          <Badge variant="outline" className="ml-2">
            {callNodes.size} programs
          </Badge>
        </CardTitle>
        <CardDescription className="flex justify-between items-center">
          <span>Visualizing the calling relationships between programs</span>
          <div className="flex gap-2">
            <Button 
              variant={viewMode === 'hierarchy' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('hierarchy')}
            >
              Hierarchy
            </Button>
            <Button 
              variant={viewMode === 'flat' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('flat')}
            >
              Flat List
            </Button>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : rootNodes.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground text-center">
              No program call structure detected.<br />
              Try analyzing COBOL files with program calls.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            {viewMode === 'hierarchy' ? (
              <div className="space-y-2">
                {rootNodes.map(nodeId => renderCallTree(nodeId))}
              </div>
            ) : (
              <div>
                {renderFlatList()}
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}