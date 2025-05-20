import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FilePlus, FileCode, Download, Folder, FolderOpen } from 'lucide-react';
import { Entity, Relationship, AnalysisReport } from '@shared/schema';

interface ProjectAttachmentsProps {
  analysis?: AnalysisReport | null;
  isLoading: boolean;
}

export function ProjectAttachments({ analysis, isLoading }: ProjectAttachmentsProps) {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<'json' | 'markdown'>('json');
  
  // Get the file entities from the analysis
  const fileEntities = analysis?.entities?.filter(entity => 
    entity.type === 'File' || entity.type === 'Program'
  ) || [];
  
  // Sort by name
  fileEntities.sort((a, b) => a.name.localeCompare(b.name));
  
  // For each file entity, find all the entities that relate to it
  const getRelatedEntities = (fileEntity: Entity) => {
    if (!analysis?.relationships) return [];
    
    // Find all relationships where this file is the source
    const relationships = analysis.relationships.filter(rel => 
      rel.source === fileEntity.id
    );
    
    // Get the target entities
    return relationships.map(rel => {
      const targetEntity = analysis.entities?.find(e => e.id === rel.target);
      return {
        relationship: rel,
        entity: targetEntity
      };
    }).filter(item => item.entity); // Filter out undefined entities
  };
  
  // Get the currently selected file entity
  const selectedFile = selectedFileId 
    ? fileEntities.find(e => e.id === selectedFileId) 
    : null;
  
  // Get the related entities for the selected file
  const relatedEntities = selectedFile 
    ? getRelatedEntities(selectedFile)
    : [];
  
  // Group related entities by type
  const groupedEntities = relatedEntities.reduce((acc, { entity, relationship }) => {
    if (!entity) return acc;
    
    const type = entity.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    
    acc[type].push({ entity, relationship });
    return acc;
  }, {} as Record<string, { entity: Entity, relationship: Relationship }[]>);
  
  // Get stats for entity types
  const entityTypeStats = Object.entries(
    fileEntities.reduce((acc, fileEntity) => {
      const related = getRelatedEntities(fileEntity);
      related.forEach(({ entity }) => {
        if (!entity) return;
        
        if (!acc[entity.type]) {
          acc[entity.type] = 0;
        }
        acc[entity.type] += 1;
      });
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]); // Sort by count desc
  
  const getEntityColor = (type: string) => {
    const colors: Record<string, string> = {
      'Program': 'bg-blue-100 text-blue-800',
      'File': 'bg-green-100 text-green-800',
      'Database': 'bg-amber-100 text-amber-800',
      'Screen': 'bg-purple-100 text-purple-800',
      'Table': 'bg-cyan-100 text-cyan-800',
      'Report': 'bg-rose-100 text-rose-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };
  
  const getRelationshipIcon = (type: string) => {
    switch (type) {
      case 'Reads': return '📖';
      case 'Writes': return '✏️';
      case 'Calls': return '📞';
      case 'Uses': return '🔧';
      case 'Contains': return '📂';
      default: return '🔄';
    }
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Attachments</CardTitle>
          <CardDescription>Analyzing project files and dependencies...</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Processing files...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!analysis || !analysis.entities || fileEntities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Attachments</CardTitle>
          <CardDescription>No project files have been analyzed yet</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <FolderOpen className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground">Run project analysis to see file attachments</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Project Attachments</CardTitle>
            <CardDescription>
              View dependencies for {fileEntities.length} files in the project
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            {/* Entity type legend */}
            <div className="flex items-center space-x-1">
              {entityTypeStats.slice(0, 3).map(([type, count]) => (
                <Badge key={type} className={`${getEntityColor(type)} mr-1`}>
                  {type}: {count}
                </Badge>
              ))}
              {entityTypeStats.length > 3 && (
                <Badge variant="outline">
                  +{entityTypeStats.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* File selector */}
          <div className="lg:col-span-1 border rounded-md">
            <div className="p-3 border-b bg-muted/30">
              <h3 className="font-medium flex items-center">
                <Folder className="h-4 w-4 mr-2" />
                Project Files ({fileEntities.length})
              </h3>
            </div>
            <ScrollArea className="h-[400px]">
              <div className="space-y-0.5 p-2">
                {fileEntities.map(entity => (
                  <Button
                    key={entity.id}
                    variant={selectedFileId === entity.id ? "secondary" : "ghost"}
                    className={`w-full justify-start text-left ${
                      selectedFileId === entity.id ? "" : "hover:bg-accent"
                    }`}
                    onClick={() => setSelectedFileId(entity.id)}
                  >
                    <FileCode className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="truncate">{entity.name}</span>
                    <span className="ml-auto opacity-50 text-xs">
                      {getRelatedEntities(entity).length}
                    </span>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          {/* Entity details */}
          <div className="lg:col-span-2 border rounded-md">
            {selectedFile ? (
              <>
                <div className="p-3 border-b bg-muted/30 flex justify-between items-center">
                  <h3 className="font-medium">
                    <FileCode className="h-4 w-4 mr-2 inline-block" />
                    {selectedFile.name}
                  </h3>
                  <div>
                    <Tabs defaultValue="json" className="w-[240px]">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="json" onClick={() => setDownloadFormat('json')}>
                          JSON
                        </TabsTrigger>
                        <TabsTrigger value="markdown" onClick={() => setDownloadFormat('markdown')}>
                          Markdown
                        </TabsTrigger>
                      </TabsList>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => {
                          // Create a placeholder for actual download functionality
                          alert(`Download ${selectedFile.name} analysis as ${downloadFormat}`);
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Analysis
                      </Button>
                    </Tabs>
                  </div>
                </div>
                <ScrollArea className="h-[400px]">
                  <div className="p-4 space-y-4">
                    {/* Entity details */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">File Properties</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="border rounded p-2 bg-muted/20">
                          <span className="text-xs text-muted-foreground">Type</span>
                          <div>{selectedFile.type}</div>
                        </div>
                        <div className="border rounded p-2 bg-muted/20">
                          <span className="text-xs text-muted-foreground">ID</span>
                          <div className="truncate">{selectedFile.id}</div>
                        </div>
                        {(selectedFile as any).dialect && (
                          <div className="border rounded p-2 bg-muted/20">
                            <span className="text-xs text-muted-foreground">Dialect</span>
                            <div>{(selectedFile as any).dialect}</div>
                          </div>
                        )}
                        {selectedFile.description && (
                          <div className="border rounded p-2 bg-muted/20 col-span-2">
                            <span className="text-xs text-muted-foreground">Description</span>
                            <div>{selectedFile.description}</div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Related entities */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Dependencies & Relationships</h4>
                      
                      {Object.keys(groupedEntities).length === 0 ? (
                        <div className="text-center p-4 border rounded-md bg-muted/10">
                          <p className="text-muted-foreground">No dependencies found for this file</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {Object.entries(groupedEntities).map(([type, items]) => (
                            <div key={type} className="border rounded-md overflow-hidden">
                              <div className={`${getEntityColor(type)} p-2 font-medium text-sm`}>
                                {type}s ({items.length})
                              </div>
                              <div className="p-2 divide-y">
                                {items.map(({ entity, relationship }) => (
                                  <div key={entity.id} className="py-2 first:pt-0 last:pb-0">
                                    <div className="flex items-center">
                                      <span className="font-medium">{entity.name}</span>
                                      <Badge variant="outline" className="ml-2">
                                        {getRelationshipIcon(relationship.type)} {relationship.type}
                                      </Badge>
                                    </div>
                                    {entity.description && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {entity.description}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="h-full flex items-center justify-center flex-col p-6">
                <FilePlus className="h-12 w-12 text-muted-foreground/20 mb-4" />
                <h3 className="text-lg font-medium">No File Selected</h3>
                <p className="text-muted-foreground text-center max-w-md mt-2">
                  Select a file from the list to view its dependencies and related entities
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}