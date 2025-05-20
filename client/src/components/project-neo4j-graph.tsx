import { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  Edge,
  Node,
  NodeTypes,
  EdgeTypes,
  MarkerType,
  useReactFlow,
} from 'reactflow';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Maximize2, Minimize2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AnalysisReport, Entity, Relationship } from '@shared/schema';
// Import components with explicit paths to avoid module not found errors
import EntityNode from './entity-node.js';
import FileNode from './file-node.js';
import EntityDetailsPopup from './entity-details-popup.js';

// Define node types for ReactFlow
const nodeTypes: NodeTypes = {
  'entity': EntityNode,
  'file': FileNode
};

interface ProjectNeo4jGraphProps {
  analysis?: AnalysisReport;
  isLoading?: boolean;
}

export default function ProjectNeo4jGraph({ analysis, isLoading = false }: ProjectNeo4jGraphProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Parse entities and relationships from analysis data
  useEffect(() => {
    if (!analysis) {
      setNodes([]);
      setEdges([]);
      return;
    }
    
    console.log("[ProjectNeo4jGraph] Analysis data:", analysis);
    const { entities = [], relationships = [], projectRelationships = [] } = analysis;
    console.log("[ProjectNeo4jGraph] Project relationships:", projectRelationships.length);
    
    // Create entity nodes
    const projectNodes: Node[] = [];
    const projectRelationshipEdges: Edge[] = [];
    
    // Maps for entity lookup and tracking processed entities
    const processedEntityIds = new Set<string>();
    const fileEntitiesMap = new Map<string, Entity>();
    
    // Set up a radial layout for nodes
    const radius = 300;
    
    // First pass: identify and collect file entity nodes
    // Look specifically for file-{id} entities created during project analysis
    const fileEntities = entities.filter((entity: Entity) => 
      entity.type === 'File' || 
      entity.id.startsWith('file-')
    );
    
    console.log("[ProjectNeo4jGraph] Found file entities:", fileEntities.length);
    
    // If we don't have enough file entities, something may be wrong with our analysis
    if (fileEntities.length < 2 && entities.length > 0) {
      console.warn("[ProjectNeo4jGraph] Not enough file entities found, using program entities as fallback");
      // Use program entities as substitute for files
      const programEntities = entities.filter(e => e.type === 'Program' || e.type === 'Subprogram');
      programEntities.forEach((entity: Entity, index: number) => {
        const angle = (index / programEntities.length) * 2 * Math.PI;
        const x = radius * Math.cos(angle) + 400;
        const y = radius * Math.sin(angle) + 300;
        
        fileEntitiesMap.set(entity.id, entity);
        
        projectNodes.push({
          id: `entity-${entity.id}`,
          type: 'entity',
          position: { x, y },
          data: {
            entity: entity,
            onClick: () => setSelectedEntity(entity)
          }
        });
        
        processedEntityIds.add(entity.id);
      });
    } else {
      // Position file entities in a circle
      fileEntities.forEach((entity: Entity, index: number) => {
        const angle = (index / fileEntities.length) * 2 * Math.PI;
        const x = radius * Math.cos(angle) + 400;
        const y = radius * Math.sin(angle) + 300;
        
        fileEntitiesMap.set(entity.id, entity);
        
        projectNodes.push({
          id: `entity-${entity.id}`,
          type: 'file',
          position: { x, y },
          data: {
            file: {
              id: entity.id,
              filename: entity.name, // Use filename property which matches CobolFile type
              content: '', // Required field 
              uploadedAt: new Date(),
              fileSize: 0,
              isValid: true
            },
            onClick: () => setSelectedEntity(entity)
          }
        });
        
        processedEntityIds.add(entity.id);
      });
    }
    
    // Process project-wide relationships between files if they exist
    if (projectRelationships && projectRelationships.length > 0) {
      console.log("[ProjectNeo4jGraph] Adding project relationships:", projectRelationships.length);
      
      projectRelationships.forEach((relationship: Relationship) => {
        if (!relationship.source || !relationship.target) {
          console.warn("[ProjectNeo4jGraph] Relationship missing source or target:", relationship);
          return;
        }
        
        // Ensure source and target nodes exist
        const sourceNodeId = `entity-${relationship.source}`;
        const targetNodeId = `entity-${relationship.target}`;
        
        if (!projectNodes.some(n => n.id === sourceNodeId)) {
          console.warn(`[ProjectNeo4jGraph] Source node not found: ${relationship.source}`);
          return;
        }
        
        if (!projectNodes.some(n => n.id === targetNodeId)) {
          console.warn(`[ProjectNeo4jGraph] Target node not found: ${relationship.target}`);
          return;
        }
        
        // Create relationship edge between file entities
        projectRelationshipEdges.push({
          id: `edge-${relationship.id}`,
          source: sourceNodeId,
          target: targetNodeId,
          label: relationship.type,
          type: 'default',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
          },
          style: {
            strokeWidth: 2,
            stroke: getEdgeColorByType(relationship.type)
          },
          animated: true
        });
      });
    } else if (relationships && relationships.length > 0) {
      // If no project relationships exist, use regular entity relationships as fallback
      console.log("[ProjectNeo4jGraph] No project relationships, using regular relationships as fallback");
      
      // Add important non-file entities to the graph
      const seenSourceTargetPairs = new Set<string>(); // To avoid duplicates
      
      relationships.forEach((relationship: Relationship) => {
        if (!relationship.source || !relationship.target) return;
        
        // Skip self-references
        if (relationship.source === relationship.target) return;
        
        // Check if we've already processed this source-target pair
        const pairKey = `${relationship.source}-${relationship.target}`;
        if (seenSourceTargetPairs.has(pairKey)) return;
        seenSourceTargetPairs.add(pairKey);
        
        // Add source entity if it's not a file and hasn't been processed
        if (!processedEntityIds.has(relationship.source)) {
          const sourceEntity = entities.find(e => e.id === relationship.source);
          if (sourceEntity) {
            const position = { 
              x: Math.random() * 800, 
              y: Math.random() * 600
            };
            
            projectNodes.push({
              id: `entity-${sourceEntity.id}`,
              type: 'entity',
              position: position,
              data: {
                entity: sourceEntity,
                onClick: () => setSelectedEntity(sourceEntity)
              }
            });
            
            processedEntityIds.add(sourceEntity.id);
          }
        }
        
        // Add target entity if it's not a file and hasn't been processed
        if (!processedEntityIds.has(relationship.target)) {
          const targetEntity = entities.find(e => e.id === relationship.target);
          if (targetEntity) {
            const position = { 
              x: Math.random() * 800, 
              y: Math.random() * 600
            };
            
            projectNodes.push({
              id: `entity-${targetEntity.id}`,
              type: 'entity',
              position: position,
              data: {
                entity: targetEntity,
                onClick: () => setSelectedEntity(targetEntity)
              }
            });
            
            processedEntityIds.add(targetEntity.id);
          }
        }
        
        // Ensure both source and target nodes exist in our current graph
        const sourceExists = projectNodes.some(n => n.id === `entity-${relationship.source}`);
        const targetExists = projectNodes.some(n => n.id === `entity-${relationship.target}`);
        
        if (sourceExists && targetExists) {
          // Create relationship edge
          projectRelationshipEdges.push({
            id: `edge-${relationship.id}`,
            source: `entity-${relationship.source}`,
            target: `entity-${relationship.target}`,
            label: relationship.type,
            type: 'default',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
            },
            style: {
              strokeWidth: 2,
              stroke: getEdgeColorByType(relationship.type)
            },
            animated: true
          });
        }
      });
    }
    
    console.log("[ProjectNeo4jGraph] Setting up graph with:", { 
      nodes: projectNodes.length, 
      edges: projectRelationshipEdges.length 
    });
    
    setNodes(projectNodes);
    setEdges(projectRelationshipEdges);
  }, [analysis]);
  
  function getEdgeColorByType(type: string): string {
    switch (type) {
      case 'Calls':
        return '#0ea5e9'; // blue
      case 'Uses':
        return '#8b5cf6'; // purple
      case 'Reads':
        return '#10b981'; // green
      case 'Writes':
        return '#f97316'; // orange
      case 'Includes':
        return '#8b5cf6'; // purple
      default:
        return '#64748b'; // slate
    }
  }
  
  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  // Handle closing the entity details popup
  const handleCloseEntityDetails = () => {
    setSelectedEntity(null);
  };
  
  return (
    <Card className={isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full'}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              Project Entity Relationships
              <Badge variant="outline" className="ml-2">
                {nodes.length} entities
              </Badge>
              <Badge variant="outline">
                {edges.length} relationships
              </Badge>
            </CardTitle>
            <CardDescription>
              Neo4j-style visualization of all entities and their relationships across the project
            </CardDescription>
          </div>
          <button 
            onClick={toggleFullscreen}
            className="p-1 hover:bg-muted rounded-md"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </CardHeader>
      <CardContent className={isFullscreen ? 'h-[calc(100vh-80px)]' : 'h-[500px]'}>
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            <ReactFlowProvider>
              <div className="h-full w-full">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  nodeTypes={nodeTypes}
                  proOptions={{ hideAttribution: true }}
                  fitView
                >
                  <Background gap={12} size={1} className="!bg-card" />
                  <Controls />
                  <MiniMap 
                    nodeStrokeWidth={3}
                    className="bg-card border border-border"
                    nodeColor={(node) => {
                      // Handle different node types properly
                      if (node.type === 'file') {
                        return '#6366f1'; // Indigo for file nodes
                      }
                      
                      // For entity nodes, get type from entity prop
                      const entityType = node.data?.entity?.type || 'Program';
                      switch (entityType) {
                        case 'Program': return '#2563eb';
                        case 'Subprogram': return '#3b82f6';
                        case 'Function': return '#60a5fa';
                        case 'Database': return '#10b981';
                        case 'Table': return '#059669';
                        case 'Screen': return '#f59e0b';
                        case 'DataElement': return '#fbbf24';
                        case 'File': return '#6366f1';
                        default: return '#64748b';
                      }
                    }}
                  />
                </ReactFlow>
              </div>
            </ReactFlowProvider>
            
            {/* Entity Details Popup */}
            {selectedEntity && (
              <EntityDetailsPopup 
                entity={selectedEntity} 
                relationships={[
                  ...(analysis?.relationships || []),
                  ...(analysis?.projectRelationships || [])
                ]}
                onClose={handleCloseEntityDetails} 
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}