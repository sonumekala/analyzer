import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactFlow, { 
  Background, 
  Controls, 
  Edge, 
  Node, 
  NodeChange, 
  applyNodeChanges, 
  Handle, 
  Position,
  MiniMap,
  NodeTypes
} from "reactflow";
import "reactflow/dist/style.css";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Database, 
  Loader2, 
  FileCode, 
  ScreenShare, 
  Network, 
  Layers, 
  MessageSquare, 
  Zap, 
  Store, 
  FileText,
  Filter,
  FilterX
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import GraphLegend from "./graph-legend";
import { Entity, RelationshipType } from "@shared/schema";

// Custom node styles for different entity types
const entityColorMap: Record<string, { bg: string; border: string; text: string }> = {
  Program: { bg: "bg-blue-600", border: "border-blue-400", text: "text-white" },
  Database: { bg: "bg-green-600", border: "border-green-400", text: "text-white" },
  API: { bg: "bg-purple-600", border: "border-purple-400", text: "text-white" },
  File: { bg: "bg-orange-600", border: "border-orange-400", text: "text-white" },
  Screen: { bg: "bg-teal-600", border: "border-teal-400", text: "text-white" },
  Kafka: { bg: "bg-red-600", border: "border-red-400", text: "text-white" },
  Queue: { bg: "bg-pink-600", border: "border-pink-400", text: "text-white" },
  Procedure: { bg: "bg-indigo-600", border: "border-indigo-400", text: "text-white" },
  DataElement: { bg: "bg-yellow-600", border: "border-yellow-400", text: "text-white" },
};

// Custom Node Component
function EntityNode({ data, isConnectable }: any) {
  const { type, name, description } = data;
  const colors = entityColorMap[type] || { bg: "bg-gray-600", border: "border-gray-400", text: "text-white" };
  
  return (
    <div className={cn("relative group")}>
      {/* Popover for node details */}
      <Popover>
        <PopoverTrigger asChild>
          <div 
            className={cn(
              "px-4 py-2 rounded-lg shadow-md border-2",
              colors.bg, colors.border, colors.text,
              "cursor-pointer min-w-[160px] text-center transition-all duration-200",
              "hover:shadow-lg hover:scale-105"
            )}
          >
            <div className="font-semibold truncate max-w-[160px]">{name}</div>
            <div className="text-xs opacity-80">{type}</div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" side="right">
          <div className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className={cn("w-3 h-3 rounded-full", colors.bg)} />
              <h3 className="text-lg font-semibold">{name}</h3>
            </div>
            <div className="text-xs bg-muted p-1 rounded mb-2">{type}</div>
            <p className="text-sm text-muted-foreground">{description}</p>
            
            {data.operations && data.operations.length > 0 && (
              <div className="mt-3">
                <h4 className="text-sm font-semibold mb-1">Operations:</h4>
                <div className="flex flex-wrap gap-1">
                  {data.operations.map((op: string, i: number) => (
                    <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {op}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {data.details && (
              <div className="mt-3 text-sm">
                <h4 className="font-semibold mb-1">Details:</h4>
                <div className="text-xs space-y-1">
                  {Object.entries(data.details).map(([key, value]) => (
                    <div key={key} className="flex">
                      <span className="font-medium mr-2">{key}:</span>
                      <span className="text-muted-foreground">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 border-2 bg-background"
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 border-2 bg-background"
        isConnectable={isConnectable}
      />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  entity: EntityNode,
};

// Edge type to relationship type mapping
const edgeTypeMapping: Record<RelationshipType, { color: string, label: string }> = {
  Calls: { color: "#3b82f6", label: "Calls" }, // blue
  CalledBy: { color: "#8b5cf6", label: "Called By" }, // purple
  Reads: { color: "#10b981", label: "Reads" }, // green
  Writes: { color: "#ef4444", label: "Writes" }, // red
  Contains: { color: "#f59e0b", label: "Contains" }, // amber
  Uses: { color: "#6366f1", label: "Uses" }, // indigo
  DependsOn: { color: "#ec4899", label: "Depends On" }, // pink
  Invokes: { color: "#0ea5e9", label: "Invokes" }, // sky blue
};

// Main component
interface Neo4jGraphViewerProps {
  analysisMode?: 'individual' | 'project';
}

export default function Neo4jGraphViewer({ analysisMode = 'individual' }: Neo4jGraphViewerProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedEntityTypes, setSelectedEntityTypes] = useState<string[]>([]);
  const [selectedRelationshipTypes, setSelectedRelationshipTypes] = useState<RelationshipType[]>([]);
  const [showLabelsOnEdges, setShowLabelsOnEdges] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredNodes, setFilteredNodes] = useState<Node[]>([]);
  const [filteredEdges, setFilteredEdges] = useState<Edge[]>([]);
  
  // Fetch the Neo4j graph data
  const { data: graphData, isLoading } = useQuery({
    queryKey: ['/api/neo4j/graph'],
    refetchOnWindowFocus: false,
  });
  
  // Process the graph data to ReactFlow format
  useEffect(() => {
    if (!graphData) return;
    
    // Get all unique entity types
    const entityTypes = [...new Set(graphData.entities.map((e: Entity) => e.type))];
    setSelectedEntityTypes(entityTypes);
    
    // Get all unique relationship types
    const relationshipTypes = [...new Set(graphData.relationships.map((r: any) => r.type))] as RelationshipType[];
    setSelectedRelationshipTypes(relationshipTypes);
    
    // Create nodes
    const flowNodes: Node[] = graphData.entities.map((entity: Entity) => ({
      id: entity.id,
      type: 'entity',
      position: { x: Math.random() * 800, y: Math.random() * 600 }, // Random initial position
      data: { ...entity },
    }));
    
    // Create edges
    const flowEdges: Edge[] = graphData.relationships.map((rel: any) => ({
      id: rel.id,
      source: rel.source,
      target: rel.target,
      label: rel.type,
      animated: true,
      style: { stroke: edgeTypeMapping[rel.type as RelationshipType]?.color || '#999' },
      data: { ...rel },
    }));
    
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [graphData]);
  
  // Apply filters when nodes, edges, or filters change
  useEffect(() => {
    if (!nodes.length) return;
    
    // Filter by entity type and search query
    let filtered = nodes.filter(node => 
      selectedEntityTypes.includes(node.data.type) &&
      (searchQuery === '' || 
       node.data.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       node.data.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    
    // Get IDs of filtered nodes
    const nodeIds = new Set(filtered.map(n => n.id));
    
    // Filter edges to only include those between filtered nodes
    let filteredRelationships = edges.filter(edge => 
      nodeIds.has(edge.source) && 
      nodeIds.has(edge.target) &&
      selectedRelationshipTypes.includes(edge.data.type as RelationshipType)
    );
    
    // Update edge labels based on toggle
    filteredRelationships = filteredRelationships.map(edge => ({
      ...edge,
      label: showLabelsOnEdges ? edge.label : undefined,
    }));
    
    setFilteredNodes(filtered);
    setFilteredEdges(filteredRelationships);
  }, [nodes, edges, selectedEntityTypes, selectedRelationshipTypes, searchQuery, showLabelsOnEdges]);
  
  // Node drag handler
  const onNodesChange = (changes: NodeChange[]) => {
    setNodes(nds => applyNodeChanges(changes, nds));
  };
  
  // Handler for entity type selection
  const handleEntityTypeToggle = (type: string) => {
    setSelectedEntityTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };
  
  // Handler for relationship type selection
  const handleRelationshipTypeChange = (value: string) => {
    setSelectedRelationshipTypes(value === "all" 
      ? Object.keys(edgeTypeMapping) as RelationshipType[]
      : [value as RelationshipType]
    );
  };
  
  // Reset filters
  const handleResetFilters = () => {
    if (!graphData) return;
    const entityTypes = [...new Set(graphData.entities.map((e: Entity) => e.type))];
    const relationshipTypes = [...new Set(graphData.relationships.map((r: any) => r.type))] as RelationshipType[];
    
    setSelectedEntityTypes(entityTypes);
    setSelectedRelationshipTypes(relationshipTypes);
    setSearchQuery('');
  };
  
  // Calculate some stats
  const stats = useMemo(() => {
    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      filteredNodes: filteredNodes.length,
      filteredEdges: filteredEdges.length,
      entityTypeCounts: nodes.reduce((acc: Record<string, number>, node) => {
        acc[node.data.type] = (acc[node.data.type] || 0) + 1;
        return acc;
      }, {}),
    };
  }, [nodes, edges, filteredNodes, filteredEdges]);
  
  // Get entity type icon
  const getEntityTypeIcon = (type: string) => {
    switch (type) {
      case 'Program': return <FileCode className="h-4 w-4" />;
      case 'Database': return <Database className="h-4 w-4" />;
      case 'API': return <Network className="h-4 w-4" />;
      case 'File': return <FileText className="h-4 w-4" />;
      case 'Screen': return <ScreenShare className="h-4 w-4" />;
      case 'Kafka': return <MessageSquare className="h-4 w-4" />;
      case 'Queue': return <Layers className="h-4 w-4" />;
      case 'Procedure': return <Zap className="h-4 w-4" />;
      case 'DataElement': return <Store className="h-4 w-4" />;
      default: return <FileCode className="h-4 w-4" />;
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Neo4j Graph...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] flex flex-col gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-full w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // No data state
  if (!graphData || !graphData.entities || graphData.entities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Neo4j Graph Database</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] flex flex-col items-center justify-center">
            <Database className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">No Data Available</h3>
            <p className="text-muted-foreground max-w-md text-center">
              There are no entities or relationships in the Neo4j database. 
              Run an analysis on some COBOL files first to populate the database.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full border">
      <CardHeader className="bg-muted/50 pb-2">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              {analysisMode === 'individual'
                ? 'Program Entity Relationship Graph' 
                : 'Project-Wide Entity Relationship Graph'}
            </CardTitle>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search entities..."
                  className="w-[200px] pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1">
                    <Filter className="h-4 w-4" />
                    Filters
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2 text-sm">Entity Types</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.keys(entityColorMap).map(type => (
                          <button
                            key={type}
                            onClick={() => handleEntityTypeToggle(type)}
                            className={cn(
                              "flex items-center gap-1 text-xs px-2 py-1 rounded-full border",
                              selectedEntityTypes.includes(type)
                                ? `${entityColorMap[type].bg} ${entityColorMap[type].text} border-transparent`
                                : "bg-muted/50 text-muted-foreground border-border"
                            )}
                          >
                            {getEntityTypeIcon(type)}
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2 text-sm">Relationship Types</h4>
                      <Select 
                        onValueChange={handleRelationshipTypeChange}
                        value={selectedRelationshipTypes.length === Object.keys(edgeTypeMapping).length ? "all" : selectedRelationshipTypes[0]}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select relationship types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="all">All Relationships</SelectItem>
                            {Object.entries(edgeTypeMapping).map(([type, { label }]) => (
                              <SelectItem key={type} value={type}>{label}</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="show-labels"
                        checked={showLabelsOnEdges}
                        onCheckedChange={setShowLabelsOnEdges}
                      />
                      <Label htmlFor="show-labels">Show relationship labels</Label>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1 w-full"
                      onClick={handleResetFilters}
                    >
                      <FilterX className="h-4 w-4" />
                      Reset Filters
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-4">
              <div className="text-muted-foreground">
                <span className="font-medium">{filteredNodes.length}</span> entities
              </div>
              <div className="text-muted-foreground">
                <span className="font-medium">{filteredEdges.length}</span> relationships
              </div>
            </div>
            
            <GraphLegend />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden">
        <div style={{ height: 600 }} className="bg-[#1E1E2E]">
          <ReactFlow
            nodes={filteredNodes}
            edges={filteredEdges}
            onNodesChange={onNodesChange}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.1}
            maxZoom={2}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
            }}
          >
            <Controls position="bottom-right" />
            <MiniMap 
              nodeColor={(node) => {
                const type = node.data.type || 'default';
                return entityColorMap[type]?.bg.replace('bg-', '') || '#666';
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
              className="!bg-[#12121A]/40 !border !border-border !rounded !bottom-5 !right-16"
            />
            <Background 
              gap={16} 
              size={1} 
              color="#444" 
              variant={"dots"} 
              className="!bg-[#12121A]"
            />
          </ReactFlow>
        </div>
      </CardContent>
    </Card>
  );
}