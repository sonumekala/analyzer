import React, { useCallback, useMemo, useState, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  NodeTypes,
  Panel,
  Position,
  ReactFlowInstance,
  ReactFlowProvider,
  ConnectionMode,
  ConnectionLineType,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Network, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Relationship, type AnalysisReport } from '@shared/schema';
import Neo4jBackground from './neo4j-background';
import GraphLegend from './graph-legend';

// Styles for different entity types in Neo4j style
const entityTypeStyles: Record<string, { color: string, borderColor: string, icon: string, bgColor: string }> = {
  file: { 
    color: '#1e40af', 
    borderColor: '#3b82f6',
    bgColor: '#dbeafe',
    icon: '📄'
  },
  program: { 
    color: '#1e3a8a', 
    borderColor: '#3b82f6',
    bgColor: '#bfdbfe',
    icon: '🧮'
  },
  copybook: { 
    color: '#166534', 
    borderColor: '#22c55e',
    bgColor: '#dcfce7',
    icon: '📋'
  },
  database: { 
    color: '#065f46', 
    borderColor: '#10b981',
    bgColor: '#d1fae5',
    icon: '💾'
  },
  api: { 
    color: '#581c87', 
    borderColor: '#a855f7',
    bgColor: '#f3e8ff',
    icon: '🔌'
  },
  relationship: {
    color: '#7c2d12',
    borderColor: '#f97316',
    bgColor: '#ffedd5',
    icon: '🔄'
  },
  dataelement: {
    color: '#1f2937',
    borderColor: '#6b7280',
    bgColor: '#f3f4f6',
    icon: '🔢'
  },
  procedure: {
    color: '#0e7490',
    borderColor: '#06b6d4',
    bgColor: '#cffafe',
    icon: '📑'
  },
  function: {
    color: '#0f766e',
    borderColor: '#14b8a6',
    bgColor: '#ccfbf1',
    icon: '🔸'
  },
  screen: {
    color: '#4f46e5',
    borderColor: '#6366f1',
    bgColor: '#e0e7ff',
    icon: '🖥️'
  },
  queue: {
    color: '#b45309',
    borderColor: '#d97706',
    bgColor: '#fef3c7',
    icon: '🔄'
  },
  kafka: {
    color: '#9f1239',
    borderColor: '#e11d48',
    bgColor: '#ffe4e6',
    icon: '📨'
  },
  variable: {
    color: '#4b5563',
    borderColor: '#9ca3af',
    bgColor: '#f9fafb',
    icon: '📊'
  }
};

// Custom Neo4j-style node component with circular design
const FileNode = ({ data }: { data: any }) => {
  const style = entityTypeStyles[data.entityType] || entityTypeStyles.file;
  const nodeSize = 70;
  
  // Add a visual indicator icon based on entity type
  const getEntityIcon = () => {
    return style.icon || '📄';
  };
  
  return (
    <div 
      className="neo4j-node flex items-center justify-center"
      style={{ 
        position: "relative",
        width: `${nodeSize}px`, 
        height: `${nodeSize}px`,
        borderRadius: '50%',
        backgroundColor: style.borderColor,
        color: 'white',
        boxShadow: `0 4px 12px rgba(0, 0, 0, 0.2), 0 0 0 2px rgba(255, 255, 255, 0.1)`,
        cursor: 'grab'
      }}
    >
      {/* Invisible handles that allow connections */}
      <div className="source-handle" style={{ 
        position: 'absolute', width: '16px', height: '16px', 
        borderRadius: '50%', opacity: 0, left: '-8px', top: '50%', 
        transform: 'translateY(-50%)', zIndex: 100,
        cursor: 'crosshair'
      }} />
      <div className="target-handle" style={{ 
        position: 'absolute', width: '16px', height: '16px', 
        borderRadius: '50%', opacity: 0, right: '-8px', top: '50%', 
        transform: 'translateY(-50%)', zIndex: 100,
        cursor: 'crosshair'
      }} />
      
      <div className="flex flex-col items-center justify-center text-center">
        {/* Entity type icon */}
        <div className="text-lg mb-1">
          {getEntityIcon()}
        </div>
        {/* Entity label */}
        <div 
          style={{ 
            fontSize: '12px', 
            fontWeight: 600,
            padding: '0 8px',
            maxWidth: `${nodeSize - 10}px`,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {data.label}
        </div>
      </div>
      
      {/* Label below the circle */}
      <div 
        style={{ 
          position: 'absolute', 
          bottom: '-22px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '11px', 
          fontWeight: 500,
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '1px 8px',
          borderRadius: '4px',
          whiteSpace: 'nowrap'
        }}
      >
        {data.entityType}
      </div>
    </div>
  );
};

// Define custom node types
const customNodeTypes: NodeTypes = {
  fileNode: FileNode,
};

type ProjectRelationshipGraphProps = {
  className?: string;
  projectAnalysis?: AnalysisReport;
  isLoading?: boolean;
};

export default function ProjectRelationshipGraph({ 
  className,
  projectAnalysis,
  isLoading = false
}: ProjectRelationshipGraphProps) {
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  // Track if we've set up the graph 
  const [isGraphSetup, setIsGraphSetup] = useState(false);

  useMemo(() => {
    if (isLoading || !projectAnalysis || !(projectAnalysis as any).isProjectWide || isGraphSetup) {
      return;
    }

    // Reset graph when new analysis comes in
    setNodes([]);
    setEdges([]);

    // Get all entities from the project analysis
    const entities = projectAnalysis.entities || [];
    const projectRelationships = (projectAnalysis as any).projectRelationships || [];
    
    // Map to track all unique entity IDs in the graph
    const entityMap = new Map<string, boolean>();
    
    // First, collect all entities involved in relationships
    projectRelationships.forEach((relationship: Relationship) => {
      entityMap.set(relationship.source, true);
      entityMap.set(relationship.target, true);
    });
    
    // Add all entities from the analysis to ensure we display even disconnected entities
    entities.forEach(entity => {
      entityMap.set(entity.id, true);
    });
    
    // Helper function to determine entity type
    const getEntityType = (id: string) => {
      const entity = entities.find(e => e.id === id);
      if (entity) {
        return entity.type.toLowerCase();
      }
      
      // Handle special cases for IDs
      if (id.startsWith('file-')) return 'file';
      if (id.startsWith('prog-')) return 'program';
      if (id.startsWith('db-')) return 'database';
      if (id.startsWith('cpybk-')) return 'copybook';
      if (id.startsWith('api-')) return 'api';
      
      return 'dataelement'; // Default type
    };
    
    // Helper function to get entity name
    const getEntityName = (id: string) => {
      const entity = entities.find(e => e.id === id);
      if (entity) {
        return entity.name;
      }
      
      // Extract numeric portion for default labels
      if (id.includes('-')) {
        const parts = id.split('-');
        const idNumber = parseInt(parts[1]);
        const type = parts[0];
        
        switch (type) {
          case 'file':
            return `File ${idNumber}`;
          case 'prog':
            return `Program ${idNumber}`;
          case 'db':
            return `Database ${idNumber}`;
          case 'cpybk':
            return `Copybook ${idNumber}`;
          case 'api':
            return `API ${idNumber}`;
          default:
            return `Entity ${idNumber}`;
        }
      }
      
      return id; // Fallback to ID
    };
    
    // Helper function to get entity description
    const getEntityDescription = (id: string) => {
      const entity = entities.find(e => e.id === id);
      if (entity && entity.description) {
        return entity.description;
      }
      return `Description for ${getEntityName(id)}`;
    };
    
    // Create a force-directed layout for better node positioning
    // Each entity type will have a different starting region on the canvas
    const getInitialPosition = (id: string, index: number) => {
      const type = getEntityType(id);
      let quadrant = { x: 0, y: 0 };
      
      switch (type) {
        case 'program':
          quadrant = { x: 100, y: 100 }; // Top left
          break;
        case 'database':
          quadrant = { x: 500, y: 100 }; // Top right
          break;
        case 'copybook':
          quadrant = { x: 100, y: 400 }; // Bottom left
          break;
        case 'file':
          quadrant = { x: 500, y: 400 }; // Bottom right
          break;
        default:
          quadrant = { x: 300, y: 250 }; // Center
      }
      
      // Add some randomness to prevent perfect overlaps
      return { 
        x: quadrant.x + Math.random() * 200 - 100, 
        y: quadrant.y + Math.random() * 200 - 100
      };
    };
    
    // Create nodes for all entities
    const entityNodes: Node[] = Array.from(entityMap.keys()).map((entityId, index) => {
      const entityType = getEntityType(entityId);
      const name = getEntityName(entityId);
      const description = getEntityDescription(entityId);
      const position = getInitialPosition(entityId, index);
      
      return {
        id: entityId,
        type: 'fileNode', // We're using the fileNode renderer for all entity types
        position,
        data: { 
          label: name,
          entityType,
          description
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });
    
    // Create Neo4j style edges for relationships
    const relationshipEdges: Edge[] = projectRelationships.map((relationship: Relationship, index: number) => {
      // Get relationship type in uppercase for Neo4j style
      const relType = relationship.type?.toUpperCase() || 'RELATES_TO';
      
      // Determine edge style based on relationship type
      let edgeColor = '#f97316'; // Default orange color
      let edgeWidth = 2;
      let animated = false;
      
      if (relType.includes('CALL')) {
        edgeColor = '#3b82f6'; // blue for calls
        edgeWidth = 3;
        animated = true;
      } else if (relType.includes('READ')) {
        edgeColor = '#22c55e'; // green for read operations
        edgeWidth = 2;
      } else if (relType.includes('WRITE')) {
        edgeColor = '#ef4444'; // red for write operations
        edgeWidth = 3;
        animated = true;
      } else if (relType.includes('DEPEND')) {
        edgeColor = '#a855f7'; // purple for dependencies
        edgeWidth = 2;
      }
      
      return {
        id: `edge-${index}`,
        source: relationship.source,
        target: relationship.target,
        label: relationship.description || relType,
        type: 'straight',
        animated: animated,
        labelBgStyle: { fill: 'rgba(255,255,255,0.9)', padding: 4, borderRadius: 4 }, // White background with opacity
        labelStyle: { 
          fill: '#000000', 
          fontWeight: 600, 
          fontSize: 11, 
          fontFamily: 'sans-serif',
          textTransform: 'uppercase',
          padding: '4px',
        },
        style: { 
          stroke: edgeColor, 
          strokeWidth: edgeWidth
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor,
          width: 15,
          height: 15
        },
        sourceHandle: 'source-handle',
        targetHandle: 'target-handle',
        data: {
          description: relationship.description,
          relType: relType
        }
      };
    });

    // Set the nodes and edges
    setNodes(entityNodes);
    setEdges(relationshipEdges);
    setIsGraphSetup(true);
  }, [projectAnalysis, isLoading, setNodes, setEdges, isGraphSetup]);

  // Zoom and fit view control handlers
  const handleZoomIn = useCallback(() => {
    if (reactFlowInstance.current) {
      reactFlowInstance.current.zoomIn();
    }
  }, []);
  
  const handleZoomOut = useCallback(() => {
    if (reactFlowInstance.current) {
      reactFlowInstance.current.zoomOut();
    }
  }, []);
  
  const handleFitView = useCallback(() => {
    if (reactFlowInstance.current) {
      reactFlowInstance.current.fitView({ padding: 0.2 });
    }
  }, []);
  
  // Handle layout reset
  const resetLayout = useCallback(() => {
    // Simple force-directed layout reset
    setNodes(nodes => nodes.map((node, index) => ({
      ...node,
      position: { 
        x: 100 + (index % 3) * 300, 
        y: 100 + Math.floor(index / 3) * 200 
      }
    })));
    
    // After rearranging, fit the view
    setTimeout(() => {
      if (reactFlowInstance.current) {
        reactFlowInstance.current.fitView({ padding: 0.2 });
      }
    }, 10);
  }, [setNodes]);

  if (isLoading) {
    return (
      <Card className="w-full shadow-xl border-gray-200/10 h-[500px] bg-gradient-to-br from-slate-900 to-slate-950">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-lg text-white group">
            <Network className="mr-2 h-5 w-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-indigo-300 font-bold">
              Project-Wide Relationships
            </span>
            <div className="ml-3 text-xs font-normal bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/20">
              Loading...
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 h-[400px] bg-[#050c2e]/80 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-6 bg-slate-900/30 p-8 rounded-lg border border-white/5 backdrop-blur-sm shadow-xl">
            <div className="flex justify-center">
              <div className="h-12 w-12 relative">
                <div className="absolute left-0 top-0 h-12 w-12 rounded-full border-t-2 border-b-2 border-blue-500 animate-spin"></div>
                <div className="absolute left-1 top-1 h-10 w-10 rounded-full border-r-2 border-l-2 border-indigo-300 animate-spin"></div>
                <Network className="absolute left-2.5 top-2.5 h-7 w-7 text-blue-400/80" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48 bg-white/5" />
                <Skeleton className="h-4 w-36 bg-white/5" />
              </div>
              <div className="flex justify-center space-x-4 pt-4">
                <div className="flex flex-col items-center">
                  <Skeleton className="h-20 w-20 rounded-md bg-white/5" />
                  <Skeleton className="h-3 w-16 mt-2 bg-white/5" />
                </div>
                <div className="flex flex-col items-center">
                  <Skeleton className="h-20 w-20 rounded-md bg-white/5" />
                  <Skeleton className="h-3 w-16 mt-2 bg-white/5" />
                </div>
              </div>
              <div className="pt-2 flex justify-center space-x-3">
                <Skeleton className="h-2 w-16 rounded-full bg-blue-500/20" />
                <Skeleton className="h-2 w-16 rounded-full bg-indigo-500/20" />
              </div>
            </div>
            <div className="text-xs text-white/40 font-mono">Analyzing project relationships...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!projectAnalysis || !(projectAnalysis as any).isProjectWide || !(projectAnalysis as any).projectRelationships) {
    return (
      <Card className="w-full shadow-xl border-gray-200/10 h-[500px] bg-gradient-to-br from-slate-900 to-slate-950">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-lg text-white group">
            <Network className="mr-2 h-5 w-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-indigo-300 font-bold">
              Project-Wide Relationships
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 h-[400px] flex items-center justify-center bg-[#050c2e]/80">
          <div className="text-center p-8 max-w-md bg-slate-900/50 rounded-lg border border-white/5 backdrop-blur-sm shadow-xl">
            <Network className="w-12 h-12 mx-auto mb-4 text-blue-400/50" />
            <h3 className="text-xl font-bold text-white mb-2">No Project Analysis Available</h3>
            <p className="text-blue-200/70 mb-4">
              To visualize cross-program relationships, you need to:
            </p>
            <ol className="text-sm text-white/60 space-y-2 text-left list-decimal list-inside mb-6">
              <li>Upload multiple COBOL files to the system</li>
              <li>Run the project-wide analysis using the AI config options</li>
              <li>View the auto-generated relationship map with Neo4j-style visualization</li>
            </ol>
            <div className="text-xs text-white/40 bg-white/5 rounded p-2">
              <span className="font-semibold text-blue-300">Tip:</span> Project analysis helps identify hidden dependencies and calling chains between your COBOL programs.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-xl border-gray-200/10 h-[500px] bg-gradient-to-br from-slate-900 to-slate-950">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-white group">
            <Network className="mr-2 h-5 w-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-indigo-300 font-bold">
              Project-Wide Relationships
            </span>
            <div className="ml-3 text-xs font-normal bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/20">
              Neo4j Style
            </div>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs px-2 py-0 bg-white/5 text-blue-200 hover:bg-white/10 transition-colors">
              {(projectAnalysis as any).projectRelationships.length} Relationships
            </Badge>
            <Badge variant="secondary" className="text-xs px-2 py-0 bg-white/5 text-emerald-200 hover:bg-white/10 transition-colors">
              {nodes.length} Entities
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 h-[400px]">
        <ReactFlowProvider>
          <div className="h-full w-full relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={customNodeTypes}
              connectionLineType={ConnectionLineType.Straight}
              fitView
              minZoom={0.2}
              maxZoom={2}
              snapToGrid={false}
              nodesConnectable={false}
              nodesDraggable={true}
              zoomOnScroll={true}
              panOnScroll={true}
              panOnDrag={true}
              selectionOnDrag={false}
              connectionMode={"loose" as ConnectionMode}
              onInit={setInstance => {
                reactFlowInstance.current = setInstance;
              }}
              proOptions={{ hideAttribution: true }}
            >
              {/* Neo4j-style Background */}
              <Neo4jBackground />
              
              <Background 
                color="rgba(255, 255, 255, 0.03)" 
                gap={15} 
                size={1}
                variant={undefined}
                style={{ backgroundColor: 'transparent' }}
              />
              
              {/* Custom controls in addition to default ones */}
              <Panel position="top-left" className="space-y-1">
                <div className="p-1 bg-white/10 backdrop-blur-sm rounded shadow flex space-x-1">
                  <button 
                    onClick={handleZoomIn}
                    className="bg-white/20 hover:bg-white/30 transition-colors p-1 rounded text-white"
                    title="Zoom in"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <button 
                    onClick={handleZoomOut}
                    className="bg-white/20 hover:bg-white/30 transition-colors p-1 rounded text-white"
                    title="Zoom out"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <button 
                    onClick={handleFitView}
                    className="bg-white/20 hover:bg-white/30 transition-colors p-1 rounded text-white"
                    title="Fit view"
                  >
                    <Maximize2 size={16} />
                  </button>
                  <GraphLegend />
                </div>
              </Panel>
              
              <Controls showInteractive={true} />
              
              <MiniMap 
                nodeColor={(node) => {
                  const entityType = node.data.entityType?.toLowerCase() || 'file';
                  const style = entityTypeStyles[entityType] || entityTypeStyles.file;
                  return style.borderColor;
                }}
                maskColor="rgba(5, 12, 46, 0.6)"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 4
                }}
              />
              
              <Panel position="top-right">
                <div className="bg-white/10 backdrop-blur-sm p-2 rounded border border-white/10 text-white text-xs">
                  <div className="font-bold mb-2">Project Relationship Legend</div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-0.5 bg-blue-500" />
                      <span className="text-[10px]">CALLS</span>
                      <span className="flex h-1.5 w-1.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-0.5 bg-green-500" />
                      <span className="text-[10px]">READS</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-0.5 bg-red-500" />
                      <span className="text-[10px]">WRITES</span>
                      <span className="flex h-1.5 w-1.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-0.5 bg-purple-500" />
                      <span className="text-[10px]">DEPENDS_ON</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-1.5 bg-white/5 rounded text-[10px] text-white/80">
                    <div className="font-medium mb-1">Usage Tips:</div>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>Drag nodes to rearrange diagram</li>
                      <li>Use mouse wheel to zoom in/out</li>
                      <li>Double-click background to fit view</li>
                    </ul>
                  </div>
                </div>
              </Panel>
            </ReactFlow>
          </div>
        </ReactFlowProvider>
      </CardContent>
      <CardFooter className="justify-between pt-2 border-t border-white/5">
        <div className="text-xs text-white/30">
          <span className="font-mono">powered by</span> <span className="font-semibold text-blue-300">Neo4j-style</span> <span className="font-mono">visualization</span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleFitView}
            className="text-xs text-white/70 hover:text-white hover:bg-white/10"
          >
            <Maximize2 className="w-3.5 h-3.5 mr-1" />
            Fit View
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetLayout}
                  className="text-xs text-white bg-gradient-to-r from-indigo-500/20 to-blue-500/20 hover:from-indigo-500/30 hover:to-blue-500/30 border-blue-500/30"
                >
                  Reset Layout
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Rearrange all nodes in a grid layout</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardFooter>
    </Card>
  );
}