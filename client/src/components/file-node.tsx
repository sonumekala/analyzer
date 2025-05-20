import { memo } from "react";
import { Handle, NodeProps, Position } from "reactflow";
import { FileText, CheckCircle2, XCircle } from "lucide-react";
import { type CobolFile } from "@shared/schema";

interface FileNodeProps extends NodeProps {
  data: {
    file: CobolFile;
    onClick?: (file: CobolFile) => void;
  };
}

/**
 * File node for graph visualization
 */
export const FileNode = memo(({ data, selected }: FileNodeProps) => {
  const { file, onClick } = data;
  
  // Get validity indicator
  const getValidityIndicator = () => {
    // Check if the file object is properly defined and has an isValid property
    if (file && file.isValid === true) {
      return <CheckCircle2 className="w-3 h-3 text-green-500 absolute -top-1 -right-1" />;
    } else if (file && file.isValid === false) {
      return <XCircle className="w-3 h-3 text-red-500 absolute -top-1 -right-1" />;
    }
    // Default to neutral indicator if validity is unknown
    return null;
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
          bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800
          ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}
          transition-all duration-200 cursor-pointer
        `}
        onClick={() => onClick?.(file)}
      >
        <div className="flex items-center space-x-2 relative">
          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {getValidityIndicator()}
          <div className="font-medium text-sm truncate max-w-[120px]">
            {file?.filename || "Unknown File"}
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground mt-1">
          COBOL File
        </div>
      </div>
    </>
  );
});

FileNode.displayName = "FileNode";

export default FileNode;