import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalysisReport } from "@shared/schema";
import { ChevronRight, ChevronDown, File, Database, Layers, FileCode, ExternalLink, AlertTriangle } from "lucide-react";

type ProgramSummaryTreeProps = {
  analysis?: AnalysisReport;
  isLoading?: boolean;
};

type TreeNodeProps = {
  label: string;
  description?: string;
  type: 'program' | 'copybook' | 'database' | 'procedure' | 'called-program' | 'missing';
  children?: React.ReactNode;
};

/**
 * A tree node component for the program summary tree visualization
 */
const TreeNode = ({ label, description, type, children }: TreeNodeProps) => {
  const [expanded, setExpanded] = useState(true);
  
  // Determine icon and color based on node type
  const getNodeStyles = () => {
    switch (type) {
      case 'program':
        return { icon: <FileCode className="h-4 w-4 text-blue-600" />, borderColor: 'border-blue-500' };
      case 'copybook':
        return { icon: <Layers className="h-4 w-4 text-indigo-600" />, borderColor: 'border-indigo-500' };
      case 'database':
        return { icon: <Database className="h-4 w-4 text-green-600" />, borderColor: 'border-green-500' };
      case 'procedure':
        return { icon: <File className="h-4 w-4 text-gray-600" />, borderColor: 'border-gray-500' };
      case 'called-program':
        return { icon: <ExternalLink className="h-4 w-4 text-purple-600" />, borderColor: 'border-purple-500' };
      case 'missing':
        return { icon: <AlertTriangle className="h-4 w-4 text-red-600" />, borderColor: 'border-red-500' };
      default:
        return { icon: <File className="h-4 w-4 text-gray-600" />, borderColor: 'border-gray-500' };
    }
  };
  
  const { icon, borderColor } = getNodeStyles();
  
  return (
    <div className="ml-1">
      <div 
        className={`flex items-center py-1 hover:bg-gray-50 rounded cursor-pointer ${children ? 'font-medium' : ''}`}
        onClick={() => children && setExpanded(!expanded)}
      >
        {children ? (
          <span className="mr-1 text-gray-500">
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </span>
        ) : <span className="ml-4 mr-1" />}
        
        <span className="mr-1.5">{icon}</span>
        
        <span className={`${type === 'missing' ? 'text-red-600' : ''}`}>
          {label}
        </span>
        
        {description && (
          <span className="ml-2 text-xs text-gray-500 italic">
            ({description})
          </span>
        )}
      </div>
      
      {children && expanded && (
        <div className={`ml-4 pl-3 border-l ${borderColor}`}>
          {children}
        </div>
      )}
    </div>
  );
};

export default function ProgramSummaryTree({ analysis, isLoading }: ProgramSummaryTreeProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Program Call Structure</CardTitle>
          <CardDescription>Program and module relationships with dependencies</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px]">
          <Skeleton className="h-full w-full rounded-md" />
        </CardContent>
      </Card>
    );
  }
  
  if (!analysis || !analysis.entities || analysis.entities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Program Call Structure</CardTitle>
          <CardDescription>Program and module relationships with dependencies</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[350px] text-neutral-500">
          <p>No program structure data available</p>
        </CardContent>
      </Card>
    );
  }
  
  // Find the main program entity
  const mainProgram = analysis.entities.find(e => e.type === 'Program');
  
  // Get all relationships for called programs
  const callRelationships = analysis.relationships.filter(
    rel => rel.type === 'Calls' || rel.type === 'DependsOn'
  );
  
  // Organize called programs and copybooks
  const calledPrograms = callRelationships
    .filter(rel => rel.source === mainProgram?.id)
    .map(rel => {
      const targetEntity = analysis.entities.find(e => e.id === rel.target);
      return {
        id: rel.target,
        name: targetEntity?.name || 'Unknown Program',
        type: targetEntity?.type || 'Unknown',
        description: rel.description || '',
        exists: !!targetEntity,
      };
    });
  
  // Find database relationships
  const databaseEntities = analysis.entities.filter(e => e.type === 'Database');
  
  // Find procedure entities
  const procedureEntities = analysis.entities.filter(e => e.type === 'Procedure');
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Program Call Structure</CardTitle>
        <CardDescription>Program and module relationships with dependencies</CardDescription>
      </CardHeader>
      <CardContent className="max-h-[350px] overflow-y-auto pt-2">
        <TreeNode 
          label={mainProgram?.name || 'Main Program'} 
          type="program"
          description={mainProgram?.description?.split('.')[0] || ''}
        >
          {calledPrograms.length > 0 && (
            <TreeNode label="Called Programs" type="program">
              {calledPrograms.map((program, index) => (
                <TreeNode 
                  key={program.id || index}
                  label={program.name}
                  description={program.description?.split('.')[0] || ''}
                  type={program.exists ? 'called-program' : 'missing'}
                />
              ))}
            </TreeNode>
          )}
          
          {databaseEntities.length > 0 && (
            <TreeNode label="Database Dependencies" type="database">
              {databaseEntities.map((db, index) => (
                <TreeNode 
                  key={db.id || index}
                  label={db.name}
                  description={db.description?.split('.')[0] || ''}
                  type="database"
                />
              ))}
            </TreeNode>
          )}
          
          {procedureEntities.length > 0 && (
            <TreeNode label="Internal Procedures" type="procedure">
              {procedureEntities.map((proc, index) => (
                <TreeNode 
                  key={proc.id || index}
                  label={proc.name}
                  description={proc.description?.split('.')[0] || ''}
                  type="procedure"
                />
              ))}
            </TreeNode>
          )}
          
          {/* Add copybooks section if we have them in the future */}
        </TreeNode>
      </CardContent>
    </Card>
  );
}