import React, { useState } from 'react';
import { 
  Network, 
  Table, 
  ChevronDown, 
  ChevronUp, 
  ArrowLeftRight, 
  Code, 
  Database, 
  FileText,
  GitBranch
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnalysisReport, Entity, Relationship } from '@shared/schema';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CombinedAnalysisViewProps {
  analysis?: AnalysisReport | null;
  isLoading: boolean;
}

export function CombinedAnalysisView({ analysis, isLoading }: CombinedAnalysisViewProps) {
  const [view, setView] = useState<'graph' | 'table'>('graph');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Helper function to get entity color based on type
  const getEntityColor = (type: string) => {
    const colorMap: Record<string, string> = {
      'Program': 'bg-blue-100 text-blue-800 border-blue-200',
      'File': 'bg-green-100 text-green-800 border-green-200',
      'Database': 'bg-amber-100 text-amber-800 border-amber-200',
      'Screen': 'bg-purple-100 text-purple-800 border-purple-200',
      'Table': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'Report': 'bg-rose-100 text-rose-800 border-rose-200',
    };
    return colorMap[type] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Group entities by type for the table view
  const groupEntitiesByType = () => {
    if (!analysis || !analysis.entities) return {};
    
    const grouped: Record<string, Entity[]> = {};
    
    for (const entity of analysis.entities) {
      if (!grouped[entity.type]) {
        grouped[entity.type] = [];
      }
      grouped[entity.type].push(entity);
    }
    
    // Sort entities within each group by name
    Object.keys(grouped).forEach(type => {
      grouped[type].sort((a, b) => a.name.localeCompare(b.name));
    });
    
    return grouped;
  };
  
  // Get all relationships from analysis
  const getAllRelationships = () => {
    if (!analysis) return [];
    
    // Combine regular relationships and project relationships if available
    const allRelationships = [...(analysis.relationships || [])];
    if (analysis.isProjectWide && analysis.projectRelationships) {
      allRelationships.push(...analysis.projectRelationships);
    }
    
    return allRelationships;
  };

  // Get icon for entity type
  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'Program': return <Code className="h-4 w-4" />;
      case 'File': return <FileText className="h-4 w-4" />;
      case 'Database': return <Database className="h-4 w-4" />;
      default: return <Code className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (!analysis || !analysis.entities || analysis.entities.length === 0) {
    return (
      <div className="flex items-center justify-center h-60 border rounded-md">
        <div className="text-center p-6">
          <Network className="h-12 w-12 text-muted-foreground mb-2 mx-auto" />
          <h3 className="font-medium text-lg">No Data Available</h3>
          <p className="text-muted-foreground max-w-md">
            Run a project analysis to see program relationships and call structures.
          </p>
        </div>
      </div>
    );
  }
  
  const entityGroups = groupEntitiesByType();
  const groupKeys = Object.keys(entityGroups);
  
  const getRelationshipsForEntity = (entityId: string) => {
    if (!analysis) return [];
    
    // Get all relationships including project relationships if available
    const allRelationships = getAllRelationships();
    
    return allRelationships.filter(r => 
      r.source === entityId || r.target === entityId
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-semibold">
            {analysis.entities.length} Entities, {getAllRelationships().length} Relationships
            {analysis.isProjectWide && analysis.projectRelationships && (
              <Badge variant="outline" className="ml-2">
                Project-Wide Analysis
              </Badge>
            )}
          </h3>
        </div>
      </div>

      <Tabs defaultValue="call-structure" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="call-structure">
            <GitBranch className="h-4 w-4 mr-2" />
            Program Call Structure
          </TabsTrigger>
          <TabsTrigger value="graph">
            <Network className="h-4 w-4 mr-2" />
            Graph Visualization
          </TabsTrigger>
          <TabsTrigger value="table">
            <Table className="h-4 w-4 mr-2" />
            Entity Table
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="call-structure" className="m-0">
          {/* We'll replace this placeholder with the actual component once it's fixed */}
          <div className="h-[500px] border rounded-md p-4">
            <div className="space-y-2">
              <div className="call-tree-node">
                <div className="flex items-center py-1 px-2 rounded-md hover:bg-muted font-medium">
                  <span className="mr-1 text-muted-foreground">
                    <ChevronDown className="h-4 w-4" />
                  </span>
                  <span className="flex-1 flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                      Program
                    </Badge>
                    <span>Entity A</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <Badge variant="outline" className="ml-2 text-xs">
                      Calls: 2
                    </Badge>
                  </span>
                </div>
                <div className="ml-5 border-l pl-2 border-border">
                  <div className="call-tree-node" style={{ paddingLeft: "24px" }}>
                    <div className="flex items-center py-1 px-2 rounded-md hover:bg-muted font-medium">
                      <span className="mr-1 text-muted-foreground">
                        <ChevronDown className="h-4 w-4" />
                      </span>
                      <span className="flex-1 flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                          Program
                        </Badge>
                        <span>Entity B</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        <Badge variant="outline" className="ml-2 text-xs">
                          Calls: 1
                        </Badge>
                        <Badge variant="outline" className="ml-2 text-xs">
                          Called by: 1
                        </Badge>
                      </span>
                    </div>
                    <div className="ml-5 border-l pl-2 border-border">
                      <div className="call-tree-node" style={{ paddingLeft: "24px" }}>
                        <div className="flex items-center py-1 px-2 rounded-md hover:bg-muted">
                          <span className="w-5"></span>
                          <span className="flex-1 flex items-center gap-2">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                              Database
                            </Badge>
                            <span>Entity D</span>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            <Badge variant="outline" className="ml-2 text-xs">
                              Called by: 1
                            </Badge>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="call-tree-node" style={{ paddingLeft: "24px" }}>
                    <div className="flex items-center py-1 px-2 rounded-md hover:bg-muted">
                      <span className="w-5"></span>
                      <span className="flex-1 flex items-center gap-2">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                          Database
                        </Badge>
                        <span>Entity C</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        <Badge variant="outline" className="ml-2 text-xs">
                          Called by: 1
                        </Badge>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="graph" className="m-0">
          <Card className="border-0 shadow-none">
            <CardContent className="p-0">
              <div className="h-[300px] border rounded-lg p-6 flex items-center justify-center">
                <div className="text-center">
                  <Network className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">Interactive Graph Visualization</h3>
                  <p className="text-muted-foreground">
                    Graph visualization shows entity relationships and call structures between programs
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="table" className="m-0">
          <Card className="border-0 shadow-none">
            <CardContent className="p-0 space-y-4">
              {groupKeys.map(groupType => (
                <Collapsible 
                  key={groupType}
                  open={expandedGroup === groupType}
                  onOpenChange={() => setExpandedGroup(expandedGroup === groupType ? null : groupType)}
                  className="border rounded-md overflow-hidden"
                >
                  <CollapsibleTrigger asChild>
                    <div className={`flex justify-between items-center p-3 cursor-pointer ${getEntityColor(groupType)}`}>
                      <div className="flex items-center space-x-2">
                        {getEntityIcon(groupType)}
                        <span className="font-medium">{groupType}s</span>
                        <Badge variant="outline" className="ml-2">
                          {entityGroups[groupType].length}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm">
                        {expandedGroup === groupType ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-3 divide-y">
                      {entityGroups[groupType].map((entity, idx) => {
                        const relationships = getRelationshipsForEntity(entity.id);
                        return (
                          <div key={entity.id} className="py-2">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-medium">{entity.name}</span>
                                {/* Display dialect if available - not in base schema but might be in extended data */}
                                {(entity as any).dialect && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {(entity as any).dialect}
                                  </Badge>
                                )}
                              </div>
                              {relationships.length > 0 && (
                                <Badge variant="outline">
                                  <ArrowLeftRight className="h-3 w-3 mr-1" />
                                  {relationships.length} connections
                                </Badge>
                              )}
                            </div>
                            {entity.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {entity.description}
                              </p>
                            )}
                            {relationships.length > 0 && (
                              <div className="mt-2 pl-4 border-l-2 border-l-muted text-sm space-y-1">
                                {relationships.map(rel => {
                                  const isSource = rel.source === entity.id;
                                  const otherEntityId = isSource ? rel.target : rel.source;
                                  const otherEntity = analysis.entities.find(e => e.id === otherEntityId);
                                  
                                  return (
                                    <div key={rel.id} className="flex items-center">
                                      {isSource ? (
                                        <>
                                          <span className="text-muted-foreground">Uses →</span>
                                          <Badge variant="outline" className="ml-2">
                                            {otherEntity?.name} ({otherEntity?.type})
                                          </Badge>
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-muted-foreground">← Used by</span>
                                          <Badge variant="outline" className="ml-2">
                                            {otherEntity?.name} ({otherEntity?.type})
                                          </Badge>
                                        </>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}