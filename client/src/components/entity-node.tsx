import { memo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { Database, MonitorSmartphone, FileText, FileCode, Table2, Cylinder } from 'lucide-react';
import { Entity } from '@shared/schema';

interface EntityNodeProps extends NodeProps {
  data: {
    entity: Entity;
    onClick?: (entity: Entity) => void;
  };
}

/**
 * Entity node for graph visualization
 */
export const EntityNode = memo(({ data, selected }: EntityNodeProps) => {
  const { entity, onClick } = data;

  // Get entity icon based on type
  const getEntityIcon = () => {
    switch (entity.type) {
      case 'Program':
      case 'Subprogram':
      case 'Procedure':
      case 'Function':
        return <FileCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'Database':
        return <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'Table':
        return <Table2 className="w-4 h-4 text-emerald-700 dark:text-emerald-500" />;
      case 'File':
        return <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'Screen':
        return <MonitorSmartphone className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'DataElement':
        return <Cylinder className="w-4 h-4 text-amber-700 dark:text-amber-500" />;
      default:
        return <FileCode className="w-4 h-4 text-slate-600 dark:text-slate-400" />;
    }
  };

  // Get node color based on entity type
  const getNodeStyles = () => {
    switch (entity.type) {
      case 'Program':
        return 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
      case 'Subprogram':
      case 'Function':
      case 'Procedure':
        return 'bg-sky-50 dark:bg-sky-900/30 border-sky-200 dark:border-sky-800';
      case 'File':
        return 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800';
      case 'Database':
        return 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800';
      case 'Table':
        return 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800';
      case 'Screen':
        return 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800';
      case 'DataElement':
        return 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800';
    }
  };
  
  return (
    <>
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 border-2 bg-background"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 border-2 bg-background"
      />
      
      {/* Node content */}
      <div
        className={`
          px-3 py-2 rounded-md border shadow-sm 
          ${getNodeStyles()}
          ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}
          transition-all duration-200 cursor-pointer
        `}
        onClick={() => onClick?.(entity)}
      >
        <div className="flex items-center space-x-2">
          {getEntityIcon()}
          <div className="font-medium text-sm truncate max-w-[120px]">
            {entity.name}
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground mt-1">
          {entity.type}
        </div>
      </div>
    </>
  );
});

EntityNode.displayName = "EntityNode";

export default EntityNode;