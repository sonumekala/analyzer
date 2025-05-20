import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Code, Database, FileText, RefreshCw, GitGraph, LineChart } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { analyzeProjectRelationships, getAllCobolFiles } from '@/lib/cobol-service';
import { AIConfig, type AnalysisReport } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import DirectoryUpload from './directory-upload';
import ProjectRelationshipGraph from './project-relationship-graph';
import { ProjectSynopsis } from './project-synopsis';
import { ProgramRelationshipTree } from './program-relationship-tree';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

interface ProjectAnalysisProps {
  onProjectAnalysisStarted?: () => void;
  onProjectAnalysisComplete?: (analysis: AnalysisReport) => void;
  aiConfig: AIConfig;
}

export default function ProjectAnalysis({
  onProjectAnalysisStarted,
  onProjectAnalysisComplete,
  aiConfig
}: ProjectAnalysisProps) {
  const [activeTab, setActiveTab] = useState('upload');
  const [projectAnalysis, setProjectAnalysis] = useState<AnalysisReport | undefined>(undefined);
  const { toast } = useToast();

  // Get all files to check if we have enough for project analysis
  const { 
    data: files,
    isLoading: isLoadingFiles,
    refetch: refetchFiles
  } = useQuery({
    queryKey: ['/api/files'],
    queryFn: getAllCobolFiles
  });

  // Mutation for project analysis
  const { 
    mutate: runProjectAnalysis,
    isPending: isAnalyzing
  } = useMutation({
    mutationFn: (config: AIConfig) => analyzeProjectRelationships(config),
    onSuccess: (data) => {
      setProjectAnalysis(data);
      setActiveTab('synopsis');
      
      // Pass the analysis data back to the parent component
      if (onProjectAnalysisComplete) {
        onProjectAnalysisComplete(data);
      }
      
      toast({
        title: 'Project Analysis Complete',
        description: `Analyzed ${files?.length || 0} files and generated project synopsis and relationship data.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    }
  });

  // Handle starting project analysis
  const handleRunAnalysis = async () => {
    if (!files || files.length < 2) {
      toast({
        title: 'Not Enough Files',
        description: 'Upload at least two COBOL files to perform project-wide analysis.',
        variant: 'destructive',
      });
      return;
    }

    // If using GPT-4o, check for API key
    if (aiConfig.modelName === "gpt-4o") {
      // Prompt the user for an API key if not already set
      const apiKey = window.prompt("Please enter your OpenAI API key to use GPT-4o:");
      
      if (!apiKey) {
        toast({
          title: "API Key Required",
          description: "An OpenAI API key is required to use GPT-4o.",
          variant: "destructive"
        });
        return;
      }
      
      // Set the API key
      try {
        const response = await fetch('/api/set-openai-key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ key: apiKey.trim() }),
        });
        
        if (!response.ok) {
          toast({
            title: "API Key Error",
            description: "Failed to set the OpenAI API key.",
            variant: "destructive"
          });
          return;
        }
      } catch (error) {
        toast({
          title: "API Key Error",
          description: "Failed to set the OpenAI API key.",
          variant: "destructive"
        });
        return;
      }
    }

    // Use the aiConfig prop instead of hardcoded config
    if (onProjectAnalysisStarted) {
      onProjectAnalysisStarted();
    }
    
    runProjectAnalysis(aiConfig);
  };

  // Handle file upload success
  const handleUploadSuccess = () => {
    refetchFiles();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Project-Wide Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Analyze relationships between multiple COBOL files to understand the overall structure and dependencies of your project.
            </p>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="upload" className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Upload
                </TabsTrigger>
                <TabsTrigger value="synopsis" className="flex items-center">
                  <LineChart className="h-4 w-4 mr-2" />
                  Synopsis
                </TabsTrigger>
                <TabsTrigger value="callstructure" className="flex items-center">
                  <GitGraph className="h-4 w-4 mr-2" />
                  Call Structure
                </TabsTrigger>
                <TabsTrigger value="relationships" className="flex items-center">
                  <Code className="h-4 w-4 mr-2" />
                  Graph
                </TabsTrigger>
                <TabsTrigger value="summary" className="flex items-center">
                  <BarChart className="h-4 w-4 mr-2" />
                  Summary
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="mt-4">
                <DirectoryUpload onUploadSuccess={handleUploadSuccess} />
                
                <div className="mt-6 bg-gray-50 p-4 rounded-md border border-gray-200">
                  <h3 className="text-md font-medium flex items-center">
                    <Database className="h-4 w-4 mr-2" />
                    Project Files
                  </h3>
                  {isLoadingFiles ? (
                    <div className="mt-2 space-y-2">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ) : files && files.length > 0 ? (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 mb-2">
                        {files.length} COBOL file{files.length !== 1 ? 's' : ''} available for analysis
                      </p>
                      <ul className="text-xs space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2 bg-white">
                        {files.map((file) => (
                          <li key={file.id} className="flex justify-between">
                            <span className="font-medium truncate">{file.filename}</span>
                            <span className="text-gray-500">{Math.round(file.fileSize / 1024)} KB</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-2">
                      No files uploaded yet. Upload COBOL files to begin analysis.
                    </p>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="synopsis" className="mt-4">
                <ProjectSynopsis
                  className="w-full"
                />
              </TabsContent>
              
              <TabsContent value="callstructure" className="mt-4">
                <ProgramRelationshipTree
                  className="w-full"
                  isLoading={isAnalyzing}
                  projectAnalysis={projectAnalysis}
                />
              </TabsContent>

              <TabsContent value="relationships" className="mt-4">
                <ProjectRelationshipGraph 
                  projectAnalysis={projectAnalysis} 
                  isLoading={isAnalyzing}
                  className="w-full"
                />
              </TabsContent>

              <TabsContent value="summary" className="mt-4">
                {projectAnalysis ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Project Analysis Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium">Project Structure</h3>
                          <div className="bg-gray-50 p-3 rounded-md">
                            <div className="flex justify-between mb-1">
                              <span className="text-xs text-gray-500">Total LOC:</span>
                              <span className="text-xs font-medium">{projectAnalysis.codeStructure.loc}</span>
                            </div>
                            <div className="flex justify-between mb-1">
                              <span className="text-xs text-gray-500">Procedures:</span>
                              <span className="text-xs font-medium">{projectAnalysis.codeStructure.procedures}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-500">Data Items:</span>
                              <span className="text-xs font-medium">{projectAnalysis.codeStructure.dataItems}</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium">Relationships</h3>
                          <div className="bg-gray-50 p-3 rounded-md">
                            <div className="flex justify-between mb-1">
                              <span className="text-xs text-gray-500">Total Files:</span>
                              <span className="text-xs font-medium">{files?.length || 0}</span>
                            </div>
                            <div className="flex justify-between mb-1">
                              <span className="text-xs text-gray-500">Cross-File Dependencies:</span>
                              <span className="text-xs font-medium">{(projectAnalysis as any).projectRelationships?.length || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-500">Entity Count:</span>
                              <span className="text-xs font-medium">{projectAnalysis.entities.length}</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2 col-span-2">
                          <h3 className="text-sm font-medium">Issues</h3>
                          <div className="bg-gray-50 p-3 rounded-md max-h-32 overflow-y-auto">
                            {projectAnalysis.issues.length > 0 ? (
                              <ul className="space-y-2">
                                {projectAnalysis.issues.slice(0, 5).map((issue, index) => (
                                  <li key={index} className="text-xs">
                                    <span className={`inline-block px-1.5 py-0.5 text-xs rounded mr-1 ${
                                      issue.severity === 'error' ? 'bg-red-100 text-red-800' : 
                                      issue.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' : 
                                      'bg-blue-100 text-blue-800'
                                    }`}>
                                      {issue.severity}
                                    </span>
                                    {issue.description}
                                  </li>
                                ))}
                                {projectAnalysis.issues.length > 5 && (
                                  <li className="text-xs text-gray-500">
                                    ...and {projectAnalysis.issues.length - 5} more issues
                                  </li>
                                )}
                              </ul>
                            ) : (
                              <p className="text-xs text-gray-500">No issues detected.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-md border border-gray-200">
                    <BarChart className="h-10 w-10 text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-700">No Analysis Results</h3>
                    <p className="text-sm text-gray-500 text-center mt-1 max-w-md">
                      Run a project analysis first to see a summary of your COBOL project structure, relationships, and potential issues.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="justify-end">
            <Button 
              onClick={handleRunAnalysis} 
              disabled={isAnalyzing || !files || files.length < 2}
              className="flex items-center"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <BarChart className="h-4 w-4 mr-2" />
                  Run Project Analysis
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}