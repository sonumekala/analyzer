import { useCallback, useEffect, useState, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MarkerType,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  ConnectionLineType,
  NodeTypes,
  Panel,
  MiniMap,
  ReactFlowInstance,
  Connection,
  ConnectionMode,
  OnInit
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ZoomIn, ZoomOut, Maximize2, Plus, Minus, LayoutGrid, Network, ChevronDown, ChevronUp } from "lucide-react";
import { Entity, Relationship } from '@shared/schema';
import Neo4jBackground from './neo4j-background';
import GraphLegend from './graph-legend';

// Define custom node types and their styles for Neo4j-like visualization
const nodeTypes = {
  program: { className: 'bg-blue-100 text-blue-900 border-blue-500', icon: '🧮', borderColor: '#3b82f6' },
  database: { className: 'bg-green-100 text-green-900 border-green-500', icon: '💾', borderColor: '#22c55e' },
  api: { className: 'bg-purple-100 text-purple-900 border-purple-500', icon: '🔌', borderColor: '#a855f7' }, 
  file: { className: 'bg-yellow-100 text-yellow-900 border-yellow-500', icon: '📄', borderColor: '#eab308' },
  screen: { className: 'bg-indigo-100 text-indigo-900 border-indigo-500', icon: '🖥️', borderColor: '#6366f1' },
  kafka: { className: 'bg-red-100 text-red-900 border-red-500', icon: '📨', borderColor: '#ef4444' },
  queue: { className: 'bg-orange-100 text-orange-900 border-orange-500', icon: '🔄', borderColor: '#f97316' },
  procedure: { className: 'bg-teal-100 text-teal-900 border-teal-500', icon: '📋', borderColor: '#14b8a6' },
  dataelement: { className: 'bg-gray-100 text-gray-900 border-gray-500', icon: '🔢', borderColor: '#6b7280' },
};

type EntityNodeProps = {
  data: {
    label: string;
    type: string;
    description: string;
    entity?: any;
    isMain?: boolean;
    isMissing?: boolean;
  };
};

// Custom Neo4j-style node component with circular design
const EntityNode = ({ data }: EntityNodeProps) => {
  const type = data.type.toLowerCase();
  const nodeConfig = nodeTypes[type as keyof typeof nodeTypes] || nodeTypes.dataelement;
  
  // Get the color for node based on entity type
  const getNodeColor = () => {
    if (data.isMissing) {
      return '#ef4444'; // Red for missing entities
    } else if (data.isMain) {
      return '#3b82f6'; // Blue for main entities
    } else {
      return nodeConfig.borderColor;
    }
  };
  
  // Size should be larger for main nodes, smaller for others
  const getNodeSize = () => {
    if (data.isMain) {
      return 80; // Larger size for main nodes
    } else {
      return 70; // Standard size for other nodes
    }
  };
  
  // Get text color based on background to ensure contrast
  const getTextColor = () => {
    const color = getNodeColor();
    // Simple color luminance check - dark background gets white text
    const isLightColor = 
      ['#eab308', '#22c55e', '#f97316'].includes(color) ||
      color.toLowerCase().includes('yellow') || 
      color.toLowerCase().includes('green');
    
    return isLightColor ? '#1a202c' : '#ffffff';  
  };

  const nodeSize = getNodeSize();
  const nodeColor = getNodeColor();
  const textColor = getTextColor();
  
  return (
    <div 
      className="neo4j-node flex items-center justify-center"
      style={{ 
        position: "relative",
        width: `${nodeSize}px`, 
        height: `${nodeSize}px`,
        borderRadius: '50%',
        backgroundColor: nodeColor,
        color: textColor,
        boxShadow: `0 4px 12px rgba(0, 0, 0, 0.2), 0 0 0 2px ${data.isMissing ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
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
        <div 
          style={{ 
            fontSize: data.isMain ? '14px' : '13px', 
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
        {data.type}
      </div>
    </div>
  );
};

// Define custom node components
const customNodeTypes: NodeTypes = {
  entityNode: EntityNode,
};

// Edge types and styles for Neo4j-like visualization
const edgeTypes = {
  calls: { color: '#3182ce', animated: true, label: 'CALLS', width: 2 },
  calledby: { color: '#805ad5', animated: true, label: 'CALLED_BY', width: 2 },
  reads: { color: '#38a169', animated: false, label: 'READS', width: 2 },
  writes: { color: '#e53e3e', animated: true, label: 'WRITES', width: 2 },
  contains: { color: '#d69e2e', animated: false, label: 'CONTAINS', width: 1.5 },
  uses: { color: '#6b46c1', animated: false, label: 'USES', width: 1.5 },
  dependson: { color: '#dd6b20', animated: false, label: 'DEPENDS_ON', width: 1.5 },
  filed_under: { color: '#64748b', animated: false, label: 'FILED_UNDER', width: 1 },
  has_passenger: { color: '#0ea5e9', animated: false, label: 'HAS_PASSENGER', width: 1 },
  has_witness: { color: '#0ea5e9', animated: false, label: 'HAS_WITNESS', width: 1 },
  has_driver_rating: { color: '#0284c7', animated: false, label: 'HAS_DRIVER_RATING', width: 1 },
  has_credit_rating: { color: '#0284c7', animated: false, label: 'HAS_CREDIT_RATING', width: 1 },
  has_financial_statement: { color: '#0284c7', animated: false, label: 'HAS_FINANCIAL_STATEMENT', width: 1 },
  has_risk_segment: { color: '#0284c7', animated: false, label: 'HAS_RISK_SEGMENT', width: 1 },
  claim_filed_for: { color: '#64748b', animated: false, label: 'CLAIM_FILED_FOR', width: 1 },
  insured_by: { color: '#64748b', animated: false, label: 'INSURED_BY', width: 1 },
  insured_in_policy: { color: '#64748b', animated: false, label: 'INSURED_IN_POLICY', width: 1 },
  claim_filed_by: { color: '#64748b', animated: false, label: 'CLAIM_FILED_BY', width: 1 },
  is_assigned: { color: '#64748b', animated: false, label: 'IS_ASSIGNED', width: 1 },
  has_agent: { color: '#64748b', animated: false, label: 'HAS_AGENT', width: 1 },
  has_address: { color: '#64748b', animated: false, label: 'HAS_ADDRESS', width: 1 },
  has_city: { color: '#64748b', animated: false, label: 'HAS_CITY', width: 1 },
  has_state: { color: '#64748b', animated: false, label: 'HAS_STATE', width: 1 },
  located_at: { color: '#64748b', animated: false, label: 'LOCATED_AT', width: 1 },
  has_claim_status: { color: '#64748b', animated: false, label: 'HAS_CLAIM_STATUS', width: 1 },
  has_date: { color: '#64748b', animated: false, label: 'HAS_DATE', width: 1 },
};

type RelationshipGraphProps = {
  entities?: Entity[];
  relationships?: Relationship[];
  isLoading?: boolean;
  mode?: 'standard' | 'callingChain';
  flowEntities?: Entity[];
};

// Neo4j-style background is imported from ./neo4j-background

// Using GraphLegend component imported from './graph-legend'

export default function RelationshipGraph({ 
  entities = [], 
  relationships = [], 
  isLoading = false,
  mode = 'standard',
  flowEntities
}: RelationshipGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [visualizationType, setVisualizationType] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'graph' | 'table'>('graph');
  const [depthLevel, setDepthLevel] = useState<number>(2);
  
  // Force directed layout with central positioning
  const applyForceDirectedLayout = (entities: Entity[], relationships: Relationship[]) => {
    // Position main program in the center and others around it
    let mainProgram: Entity | undefined;
    let otherEntities: Entity[] = [];
    
    // Find the main program entity and separate the rest
    entities.forEach(entity => {
      if (entity.type === "Program") {
        mainProgram = entity;
      } else {
        otherEntities.push(entity);
      }
    });
    
    // If no explicit program entity found, use the first entity as main
    if (!mainProgram && entities.length > 0) {
      mainProgram = entities[0];
      otherEntities = entities.slice(1);
    }
    
    const nodes: Node[] = [];
    
    // Position main program in center
    if (mainProgram) {
      // Apply a different visual style to the main program node
      nodes.push({
        id: mainProgram.id,
        type: 'entityNode',
        position: { x: 300, y: 250 }, // Center of the canvas
        data: {
          label: mainProgram.name,
          type: mainProgram.type,
          description: mainProgram.description,
          entity: mainProgram,
          isMain: true // Flag as main program
        }
      });
    }
    
    // Get categorized entities for better organization
    const databaseEntities = otherEntities.filter(e => e.type === 'Database');
    const procedureEntities = otherEntities.filter(e => e.type === 'Procedure');
    const dataElementEntities = otherEntities.filter(e => e.type === 'DataElement');
    const externalProgramEntities = otherEntities.filter(e => e.type === 'Program' && e.id !== mainProgram?.id);
    const otherRemainingEntities = otherEntities.filter(e => 
      e.type !== 'Database' && 
      e.type !== 'Procedure' && 
      e.type !== 'DataElement' && 
      (e.type !== 'Program' || e.id === mainProgram?.id)
    );
    
    // Helper function to position entities in arcs based on category
    const positionEntitiesInArc = (
      entityList: Entity[], 
      startAngle: number, 
      endAngle: number, 
      radiusMin: number,
      radiusMax: number
    ) => {
      entityList.forEach((entity, index) => {
        const angleRange = endAngle - startAngle;
        const angle = startAngle + (index / (entityList.length || 1)) * angleRange;
        
        // Vary radius slightly to create more natural looking clusters
        const radius = radiusMin + (Math.random() * (radiusMax - radiusMin));
        
        // Position nodes in an arc segment around the center point
        const x = Math.cos(angle) * radius + 300; // Center X = 300
        const y = Math.sin(angle) * radius + 250; // Center Y = 250
        
        // Check if the entity is missing (referenced but not found) based on relationships
        const missingEntity = relationships.some(rel => 
          rel.target === entity.id && 
          !entities.some(e => e.id === rel.source)
        );
        
        nodes.push({
          id: entity.id,
          type: 'entityNode',
          position: { x, y },
          data: {
            label: entity.name,
            type: entity.type,
            description: entity.description,
            entity, // Store the full entity for reference
            isMissing: missingEntity
          }
        });
      });
    };
    
    // Position different entity types in different segments around the center
    positionEntitiesInArc(databaseEntities, Math.PI * 0.2, Math.PI * 0.6, 180, 220); // Top right
    positionEntitiesInArc(procedureEntities, Math.PI * 0.8, Math.PI * 1.2, 150, 190); // Bottom right
    positionEntitiesInArc(dataElementEntities, Math.PI * 1.3, Math.PI * 1.7, 180, 220); // Bottom left
    positionEntitiesInArc(externalProgramEntities, Math.PI * 1.8, Math.PI * 0.1, 200, 250); // Top left
    positionEntitiesInArc(otherRemainingEntities, 0, Math.PI * 2, 230, 280); // Outer ring
    
    return nodes;
  };
  
  // Helper to get only relevant entities based on depth level
  const filterEntitiesByDepth = useCallback((
    startEntities: Entity[], 
    allRelationships: Relationship[], 
    maxDepth: number
  ): Entity[] => {
    // If depth is 0 or no relationships, just return starting entities
    if (maxDepth === 0 || allRelationships.length === 0) {
      return startEntities;
    }
    
    // Map of entity IDs to keep track of visited entities and their depth
    const entityMap = new Map<string, number>();
    
    // Initialize with starting entities at depth 0
    startEntities.forEach(entity => {
      entityMap.set(entity.id, 0);
    });
    
    // For each level of depth, find all connected entities
    for (let currentDepth = 0; currentDepth < maxDepth; currentDepth++) {
      // Get all entities at current depth
      const currentDepthEntities = Array.from(entityMap.entries())
        .filter(([_, depth]) => depth === currentDepth)
        .map(([id]) => id);
      
      // For each entity at current depth, find all connected entities
      currentDepthEntities.forEach(entityId => {
        // Find all relationships where this entity is the source
        allRelationships
          .filter(rel => rel.source === entityId)
          .forEach(rel => {
            // If target is not already visited or has higher depth, add it
            if (!entityMap.has(rel.target) || entityMap.get(rel.target)! > currentDepth + 1) {
              entityMap.set(rel.target, currentDepth + 1);
            }
          });
      });
    }
    
    // Return all entities at any depth, filtered from the original entities list
    return entities.filter(entity => entityMap.has(entity.id));
  }, [entities]);

  // Convert entities and relationships to ReactFlow nodes and edges
  const convertToNodesAndEdges = useCallback(() => {
    // Apply depth filtering in calling chain mode
    const filteredEntities = mode === 'callingChain' && flowEntities 
      ? filterEntitiesByDepth(
          // Start with main program entity
          flowEntities.filter(e => e.type === 'Program').slice(0, 1),
          relationships,
          depthLevel
        )
      : (mode === 'callingChain' && flowEntities ? flowEntities : entities);
    
    // Create nodes with force-directed layout
    const nodes: Node[] = applyForceDirectedLayout(filteredEntities, relationships);
    
    // Filter relationships by visualization type and depth
    const filteredRelationships = relationships.filter(rel => {
      // Apply visualization type filter
      if (visualizationType !== "all") {
        const relType = rel.type.toLowerCase();
        // Filter by specific relationship types
        switch (visualizationType) {
          case "programCalls":
            return relType === "calls" || relType === "calledby";
          case "databaseCalls":
            return relType === "reads" || relType === "writes";
          case "dependencies":
            return relType === "dependson" || relType === "uses";
          default:
            return true;
        }
      }
      return true;
    });
    
    // Create edges
    const edges: Edge[] = filteredRelationships
      .filter(rel => {
        // For calling chain mode, only include relationships between filtered entities
        if (mode === 'callingChain') {
          const entityIds = filteredEntities.map(e => e.id);
          return entityIds.includes(rel.source) && entityIds.includes(rel.target);
        }
        return true;
      })
      .map((relationship) => {
        const relType = relationship.type.toLowerCase() as keyof typeof edgeTypes;
        const edgeStyle = edgeTypes[relType] || edgeTypes.dependson;
        
        return {
          id: relationship.id,
          source: relationship.source,
          target: relationship.target,
          type: 'straight',
          animated: edgeStyle.animated,
          label: relationship.description || edgeStyle.label, // Use description if available
          labelBgStyle: { fill: 'rgba(255,255,255,0.9)', padding: 4, borderRadius: 4 }, // White background with opacity
          labelStyle: { 
            fill: '#000000', 
            fontWeight: 600, 
            fontSize: 10, 
            fontFamily: 'sans-serif',
            textTransform: 'uppercase',
            padding: '4px',
          },
          style: { 
            stroke: edgeStyle.color, 
            strokeWidth: edgeStyle.width || 1
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edgeStyle.color,
            width: 15,
            height: 15
          },
          // Use handles for Neo4j-style connections with circle connection points
          sourceHandle: 'source-handle',
          targetHandle: 'target-handle',
          data: {
            relationship // Store the full relationship for reference
          }
        };
      });
    
    setNodes(nodes);
    setEdges(edges);
  }, [entities, relationships, flowEntities, mode, setNodes, setEdges, visualizationType, depthLevel, filterEntitiesByDepth]);
  
  useEffect(() => {
    if (!isLoading && (entities.length > 0 || (mode === 'callingChain' && flowEntities && flowEntities.length > 0))) {
      convertToNodesAndEdges();
    }
  }, [convertToNodesAndEdges, entities, relationships, isLoading, mode, flowEntities]);
  
  // Reference to ReactFlow instance for controlling zoom/pan
  const reactFlowInstance = useRef<any>(null);
  
  // Handle node click to show entity details
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    // Find the entity that corresponds to this node
    const entity = entities.find(e => e.id === node.id);
    if (entity) {
      setSelectedEntity(entity);
      setDialogOpen(true);
    }
  }, [entities]);
  
  // Handle zoom and fit view functionality
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
  
  // Render loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Relationship Graph</CardTitle>
          <CardDescription>Neo4j-style visualization of COBOL program relationships</CardDescription>
        </CardHeader>
        <CardContent className="h-[500px] flex items-center justify-center">
          <div className="w-full">
            <Skeleton className="h-[400px] w-full rounded-md" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Render empty state
  if (entities.length === 0 && (!flowEntities || flowEntities.length === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Relationship Graph</CardTitle>
          <CardDescription>Neo4j-style visualization of COBOL program relationships</CardDescription>
        </CardHeader>
        <CardContent className="h-[500px] flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p>No entities found for visualization</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Flow component to be rendered in both the main card and the fullscreen dialog
  const GraphFlow = () => (
    <ReactFlowProvider>
      <div className="h-full w-full relative overflow-hidden">
        {/* Neo4j-style dark background with subtle grid pattern */}
        <div className="absolute inset-0 w-full h-full bg-[#050c2e]" />
        <Neo4jBackground />
        
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={customNodeTypes}
          connectionLineType={ConnectionLineType.Straight}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          minZoom={0.2}
          maxZoom={2}
          fitView
          onNodeClick={onNodeClick}
          onInit={setInstance => {
            reactFlowInstance.current = setInstance;
          }}
          elementsSelectable={true}
          nodesConnectable={false}
          nodesDraggable={true}
          zoomOnScroll={true}
          panOnScroll={true}
          panOnDrag={true}
          selectionOnDrag={false}
          snapToGrid={false}
          connectionMode={"loose" as ConnectionMode}
          proOptions={{ hideAttribution: true }}
          style={{ background: 'transparent' }}
        >
          {/* Neo4j-style Background */}
          <Neo4jBackground />
          
          {/* Background grid */}
          <Background 
            color="rgba(255, 255, 255, 0.03)" 
            gap={15} 
            size={1}
            variant={undefined}
            style={{ backgroundColor: 'transparent' }}
          />
          
          {/* Visualization control panel */}
          <Panel position="top-left" className="space-y-1">
            <div className="p-1.5 bg-gray-900/80 backdrop-blur-sm rounded-md shadow-lg flex items-center space-x-1 border border-gray-800">
              {/* Relationship type filter */}
              <div className="mr-2">
                <select
                  value={visualizationType}
                  onChange={(e) => setVisualizationType(e.target.value)}
                  className="text-xs bg-gray-800 text-white border-0 rounded p-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Relationships</option>
                  <option value="programCalls">Program Calls</option>
                  <option value="databaseCalls">Database Access</option>
                  <option value="dependencies">Dependencies</option>
                </select>
              </div>
              
              {mode === 'callingChain' && (
                <div className="flex items-center space-x-1 mr-2 border-r border-gray-700 pr-2">
                  <span className="text-xs text-white">Depth:</span>
                  <button
                    onClick={() => setDepthLevel(Math.max(1, depthLevel - 1))}
                    className="bg-gray-800 hover:bg-gray-700 text-white p-1 rounded text-xs"
                    disabled={depthLevel <= 1}
                  >
                    -
                  </button>
                  <span className="text-xs text-white w-4 text-center">{depthLevel}</span>
                  <button
                    onClick={() => setDepthLevel(depthLevel + 1)}
                    className="bg-gray-800 hover:bg-gray-700 text-white p-1 rounded text-xs"
                  >
                    +
                  </button>
                </div>
              )}
              
              {/* View mode toggle */}
              {mode === 'callingChain' && (
                <div className="flex items-center space-x-1 mr-2 border-r border-gray-700 pr-2">
                  <button
                    onClick={() => setViewMode('graph')}
                    className={`text-xs p-1 rounded ${viewMode === 'graph' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}
                  >
                    Graph
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`text-xs p-1 rounded ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}
                  >
                    Table
                  </button>
                </div>
              )}
              
              <div className="flex space-x-1 border-r border-gray-700 pr-2 mr-2">
                <button 
                  onClick={handleZoomIn}
                  className="bg-gray-800 hover:bg-gray-700 transition-colors p-1 rounded text-white"
                  title="Zoom in"
                >
                  <ZoomIn size={14} />
                </button>
                <button 
                  onClick={handleZoomOut}
                  className="bg-gray-800 hover:bg-gray-700 transition-colors p-1 rounded text-white"
                  title="Zoom out"
                >
                  <ZoomOut size={14} />
                </button>
                <button 
                  onClick={handleFitView}
                  className="bg-gray-800 hover:bg-gray-700 transition-colors p-1 rounded text-white"
                  title="Fit view"
                >
                  <Maximize2 size={14} />
                </button>
              </div>
              
              <GraphLegend />
              
              <button
                onClick={() => setIsFullscreen(true)}
                className="bg-gray-800 hover:bg-gray-700 transition-colors p-1 rounded text-white"
                title="Fullscreen"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          </Panel>
          
          {/* Mini map in bottom right */}
          <MiniMap 
            nodeColor={(node) => {
              const type = node.data.type.toLowerCase();
              const nodeConfig = nodeTypes[type as keyof typeof nodeTypes] || nodeTypes.dataelement;
              return nodeConfig.borderColor;
            }}
            maskColor="rgba(5, 12, 46, 0.6)"
            style={{
              backgroundColor: 'rgba(17, 24, 39, 0.7)',
              border: '1px solid rgba(31, 41, 55, 0.8)',
              borderRadius: 4
            }}
            zoomable
            pannable
          />
          <Panel position="top-right">
            <div className="bg-white/10 backdrop-blur-sm p-2 rounded border border-white/10 text-white text-xs">
              {/* Collapsible Relationship Types */}
              <Collapsible className="mb-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold mb-2 cursor-pointer">Relationship Types</div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-0 h-5 w-5">
                      <ChevronDown className="h-3 w-3 text-white/70" />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div className="space-y-1.5">
                    {Object.entries(edgeTypes).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <div 
                          className="w-4 h-0.5 flex-shrink-0" 
                          style={{ 
                            backgroundColor: value.color,
                            height: `${value.width}px`
                          }}
                        />
                        <span className="text-[10px]">{value.label}</span>
                        
                        {/* Show animation indicator if animated */}
                        {value.animated && (
                          <span className="flex h-1.5 w-1.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Collapsible Entity Types */}
              <Collapsible>
                <div className="flex items-center justify-between">
                  <div className="font-bold mb-2 cursor-pointer">Entity Types</div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-0 h-5 w-5">
                      <ChevronDown className="h-3 w-3 text-white/70" />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                    {Object.entries(nodeTypes).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-1.5">
                        <div 
                          className="w-2 h-2 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: value.borderColor }}
                        />
                        <span className="text-[10px] capitalize">{key}</span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
              
              <div className="mt-4 p-1.5 bg-white/5 rounded text-[10px] text-white/80">
                <div className="font-medium mb-1">Tips:</div>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Click on nodes to see details</li>
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
  );
  
  return (
    <>
      <Card className="relative">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <div>
            <CardTitle>
              {mode === 'callingChain' ? 'Program Calling Chain' : 'Entity Relationships'}
            </CardTitle>
            <CardDescription>Neo4j-style visualization of COBOL program relationships</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center border rounded overflow-hidden">
              <Button
                variant={viewMode === 'graph' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none h-8 px-2"
                onClick={() => setViewMode('graph')}
              >
                <Network className="w-4 h-4 mr-1" />
                Graph
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none h-8 px-2"
                onClick={() => setViewMode('table')}
              >
                <LayoutGrid className="w-4 h-4 mr-1" />
                Table
              </Button>
            </div>
            
            {/* Depth Controls for Call Graph */}
            {mode === 'callingChain' && (
              <div className="flex items-center gap-1 border rounded p-1">
                <span className="text-xs px-1">Depth:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setDepthLevel(Math.max(1, depthLevel - 1))}
                  disabled={depthLevel <= 1}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="text-xs font-medium w-4 text-center">{depthLevel}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setDepthLevel(Math.min(5, depthLevel + 1))}
                  disabled={depthLevel >= 5}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            )}
            
            {/* Relationship Type Filter */}
            <Select
              value={visualizationType}
              onValueChange={setVisualizationType}
            >
              <SelectTrigger className="w-[180px] h-8">
                <SelectValue placeholder="View Relationship Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Relationships</SelectItem>
                <SelectItem value="programCalls">Program Calls</SelectItem>
                <SelectItem value="databaseCalls">Database Calls</SelectItem>
                <SelectItem value="dependencies">Dependencies</SelectItem>
              </SelectContent>
            </Select>
            
            <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 px-2 py-1 h-auto text-xs"
                  onClick={() => setIsFullscreen(true)}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Fullscreen
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 overflow-hidden">
                <DialogHeader className="p-4">
                  <DialogTitle>
                    {mode === 'callingChain' ? 'Program Calling Chain' : 'Entity Relationships'} (Fullscreen)
                  </DialogTitle>
                </DialogHeader>
                <div className="h-[calc(90vh-70px)]">
                  <GraphFlow />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="h-[500px] pt-0">
          {viewMode === 'graph' ? (
            <GraphFlow />
          ) : (
            <div className="h-full overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="p-2 text-left font-medium">Source</th>
                    <th className="p-2 text-left font-medium">Relationship</th>
                    <th className="p-2 text-left font-medium">Target</th>
                    <th className="p-2 text-left font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {relationships
                    .filter(rel => {
                      // Apply visualization type filter
                      if (visualizationType !== "all") {
                        const relType = rel.type.toLowerCase();
                        switch (visualizationType) {
                          case "programCalls":
                            return relType === "calls" || relType === "calledby";
                          case "databaseCalls":
                            return relType === "reads" || relType === "writes";
                          case "dependencies":
                            return relType === "dependson" || relType === "uses";
                          default:
                            return true;
                        }
                      }
                      return true;
                    })
                    .map((rel, index) => {
                      // Find source and target entities
                      const sourceEntity = entities.find(e => e.id === rel.source);
                      const targetEntity = entities.find(e => e.id === rel.target);
                      const relType = rel.type.toLowerCase() as keyof typeof edgeTypes;
                      const edgeStyle = edgeTypes[relType] || edgeTypes.dependson;
                      
                      return (
                        <tr key={rel.id} className={index % 2 === 0 ? 'bg-transparent' : 'bg-muted/20'}>
                          <td className="p-2 border-b">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ 
                                  backgroundColor: sourceEntity 
                                    ? nodeTypes[(sourceEntity.type.toLowerCase() as keyof typeof nodeTypes) || 'dataelement'].borderColor 
                                    : '#ccc' 
                                }}
                              />
                              <span>{sourceEntity?.name || rel.source}</span>
                            </div>
                          </td>
                          <td className="p-2 border-b">
                            <span 
                              className="text-xs font-mono px-2 py-0.5 rounded" 
                              style={{ 
                                backgroundColor: `${edgeStyle.color}20`,
                                color: edgeStyle.color,
                                borderLeft: `3px solid ${edgeStyle.color}`
                              }}
                            >
                              {edgeStyle.label}
                            </span>
                          </td>
                          <td className="p-2 border-b">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ 
                                  backgroundColor: targetEntity 
                                    ? nodeTypes[(targetEntity.type.toLowerCase() as keyof typeof nodeTypes) || 'dataelement'].borderColor 
                                    : '#ccc' 
                                }}
                              />
                              <span>{targetEntity?.name || rel.target}</span>
                            </div>
                          </td>
                          <td className="p-2 border-b text-xs text-muted-foreground">
                            {rel.description || `${sourceEntity?.name || 'Entity'} ${rel.type.toLowerCase()} ${targetEntity?.name || 'entity'}`}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entity Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedEntity?.name}
              <span className="ml-2 text-sm font-normal text-gray-500">({selectedEntity?.type})</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold">Description</h4>
              <p className="text-sm">{selectedEntity?.description}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Operations</h4>
              <ul className="list-disc list-inside text-sm">
                {selectedEntity?.operations.map((op, i) => (
                  <li key={i}>{op}</li>
                ))}
              </ul>
            </div>
            {selectedEntity?.details && (
              <div>
                <h4 className="text-sm font-semibold">Details</h4>
                <div className="rounded-md bg-gray-50 p-3 text-sm">
                  <pre className="whitespace-pre-wrap text-xs">
                    {JSON.stringify(selectedEntity.details, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}