import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { aiConfigSchema, type AIConfig, type AnalysisReport, type Entity } from "@shared/schema";
import { getAnalysisHistory, getOrCreateAnalysis, analyzeProjectRelationships, deleteAllCobolFiles } from "@/lib/cobol-service";
import Header from "@/components/header";
import FileUpload from "@/components/file-upload";
import DirectoryUpload from "@/components/directory-upload";
import FileList from "@/components/file-list";
import CodeViewer from "@/components/code-viewer";
import AnalysisSummary from "@/components/analysis-summary";
import EntityDetails from "@/components/entity-details";
import PotentialIssues from "@/components/potential-issues";
import RelationshipChart from "@/components/relationship-chart";
import RelationshipGraph from "@/components/relationship-graph";
import ProgramSummaryTree from "@/components/program-summary-tree";
import AnalysisSidebar from "@/components/analysis-sidebar";
import AnalysisHistory from "@/components/analysis-history";
import AIExplanation from "@/components/ai-explanation";
import ProjectAnalysis from "@/components/project-analysis";
import { CombinedAnalysisView } from "@/components/combined-analysis-view";
import { ProjectAttachments } from "@/components/project-attachments";
import Neo4jDashboard from "@/components/neo4j-dashboard";
import ProjectNeo4jGraph from "@/components/project-neo4j-graph";
// Temporarily commenting out until ProgramCallStructure component is fixed
// import ProgramCallStructure from "@/components/program-call-structure";
import { Button } from "@/components/ui/button";
import { 
  Upload, 
  LightbulbIcon, 
  Network, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  ChevronUp, 
  Settings, 
  Folder, 
  File, 
  Layers, 
  Database, 
  FileText, 
  Monitor, 
  Table,
  Loader2,
  ArrowLeftRight,
  GitBranch,
  RefreshCw,
  Brain
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// AIConfigForm component
function AIConfigForm({ config, onChange }: { config: AIConfig, onChange: (config: Partial<AIConfig>) => void }) {
  const { toast } = useToast();
  
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">AI Model Settings</h3>
      
      {/* Model Selection */}
      <div className="space-y-2">
        <label htmlFor="model" className="text-xs font-medium text-muted-foreground">
          Model
        </label>
        <select
          id="model"
          className="w-full p-2 text-sm rounded-md border border-border bg-background"
          value={config.modelName}
          onChange={(e) => onChange({ modelName: e.target.value })}
        >
          <option value="llama3-8b">Llama 3 (8B parameters)</option>
          <option value="mistral-7b">Mistral 7B</option>
          <option value="codellama-13b">CodeLlama 13B</option>
          <option value="gpt-4o">GPT-4o (OpenAI)</option>
        </select>
        
        {config.modelName === "gpt-4o" && (
          <div className="mt-2 text-xs p-2 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
            <p className="mb-2">OpenAI API Key is required for GPT-4o.</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const apiKey = window.prompt("Enter your OpenAI API key:");
                if (apiKey) {
                  fetch('/api/set-openai-key', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: apiKey.trim() }),
                  })
                  .then(response => {
                    if (response.ok) {
                      toast({
                        title: "API Key Set",
                        description: "Your OpenAI API key has been set successfully.",
                      });
                    } else {
                      toast({
                        title: "Error",
                        description: "Failed to set OpenAI API key.",
                        variant: "destructive",
                      });
                    }
                  });
                }
              }}
            >
              Set API Key
            </Button>
          </div>
        )}
      </div>
      
      {/* Temperature */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <label htmlFor="temperature" className="text-xs font-medium text-muted-foreground">
            Temperature: {config.modelTemperature}
          </label>
          <span className="text-xs text-muted-foreground">
            {config.modelTemperature < 0.3 ? "More Deterministic" : 
             config.modelTemperature > 0.7 ? "More Creative" : "Balanced"}
          </span>
        </div>
        <input
          id="temperature"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={config.modelTemperature}
          onChange={(e) => onChange({ modelTemperature: parseFloat(e.target.value) })}
          className="w-full"
        />
      </div>
      
      {/* Detail Level */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          Detail Level
        </label>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={config.detailLevel === "Basic" ? "default" : "outline"}
            size="sm"
            onClick={() => onChange({ detailLevel: "Basic" })}
          >
            Basic
          </Button>
          <Button
            variant={config.detailLevel === "Standard" ? "default" : "outline"}
            size="sm"
            onClick={() => onChange({ detailLevel: "Standard" })}
          >
            Standard
          </Button>
          <Button
            variant={config.detailLevel === "Detailed" ? "default" : "outline"}
            size="sm"
            onClick={() => onChange({ detailLevel: "Detailed" })}
          >
            Detailed
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { toast } = useToast();
  const [selectedFileId, setSelectedFileId] = useState<number | undefined>(undefined);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProjectAnalyzing, setIsProjectAnalyzing] = useState(false);
  const [projectAnalysis, setProjectAnalysis] = useState<AnalysisReport | undefined>(undefined);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedAnalysisMode, setSelectedAnalysisMode] = useState<'individual' | 'project' | 'neo4j'>('individual');
  const [selectedEntity, setSelectedEntity] = useState<Entity | undefined>(undefined);
  // Track expanded nodes in the program call structure
  const [expandedNodes, setExpandedNodes] = useState<Set<string | number>>(new Set());
  const [aiConfig, setAIConfig] = useState<AIConfig>(aiConfigSchema.parse({
    modelTemperature: 0.7,
    contextWindow: 4096,
    detailLevel: "Standard",
    modelName: "llama3-8b"
  }));
  
  // Fetch analysis history for selected file
  const { 
    data: analysisHistory = [],
    refetch: refetchAnalysisHistory
  } = useQuery({
    queryKey: [`/api/files/${selectedFileId}/analysis`],
    queryFn: async () => {
      if (!selectedFileId) return [];
      return getAnalysisHistory(selectedFileId);
    },
    enabled: !!selectedFileId
  });
  
  // Get or create analysis for selected file
  const { 
    data: analysis,
    isLoading: isAnalysisLoading,
    refetch: refetchAnalysis
  } = useQuery<AnalysisReport | undefined>({
    queryKey: [`/api/files/${selectedFileId}/analysis`, aiConfig],
    queryFn: async () => {
      if (!selectedFileId) return undefined;
      return getOrCreateAnalysis(selectedFileId, aiConfig);
    },
    enabled: !!selectedFileId
  });
  
  // Handle running a new analysis
  const handleRunAnalysis = async () => {
    if (!selectedFileId) {
      toast({
        title: "No file selected",
        description: "Please select a file to analyze",
        variant: "destructive"
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
    
    try {
      setIsAnalyzing(true);
      await refetchAnalysis();
      await refetchAnalysisHistory();
      
      toast({
        title: "Analysis complete",
        description: "The file has been analyzed successfully"
      });
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Update AI config
  const handleConfigChange = (newConfig: Partial<AIConfig>) => {
    setAIConfig((prev) => ({ ...prev, ...newConfig }));
  };
  
  // Handle running project-wide analysis
  const runProjectAnalysis = async () => {
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
    
    try {
      setIsProjectAnalyzing(true);
      
      const result = await analyzeProjectRelationships(aiConfig);
      setProjectAnalysis(result);
      
      toast({
        title: "Project Analysis Complete",
        description: "The project-wide analysis has been completed successfully."
      });
    } catch (error) {
      toast({
        title: "Project Analysis Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProjectAnalyzing(false);
    }
  };
  
  // Refresh the file list (used after directory upload)
  const refetchFileList = () => {
    // Invalidate the files cache
    // This is a placeholder - actual implementation would use queryClient.invalidateQueries
    window.location.reload();
  };
  
  // History selection handler
  const onSelectAnalysisHistory = (analysisId: number) => {
    console.log("Selected analysis history:", analysisId);
    // TODO: Implement selecting historical analysis
    toast({
      title: "Selected Analysis",
      description: `Loading analysis ${analysisId}`
    });
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      
      {/* Top Level Tabs */}
      <div className="bg-primary/5 border-b border-border py-4 flex justify-center">
        <Tabs
          defaultValue={selectedAnalysisMode}
          value={selectedAnalysisMode}
          onValueChange={(value) => setSelectedAnalysisMode(value as 'individual' | 'project' | 'neo4j')}
        >
          <TabsList className="shadow-sm">
            <TabsTrigger value="individual" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Individual Program Analysis
            </TabsTrigger>
            <TabsTrigger value="project" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Project-Wide Analysis
            </TabsTrigger>
            <TabsTrigger value="neo4j" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Neo4j Database
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Collapsible Settings Sidebar */}
        <aside className={`${isSidebarCollapsed ? 'w-12' : 'w-64'} flex-shrink-0 border-r border-border bg-card flex flex-col transition-all duration-300 ease-in-out relative`}>
          {/* Collapse toggle button */}
          <button 
            className="absolute -right-3 top-4 bg-background border border-border rounded-full p-1 shadow-sm z-10"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            {isSidebarCollapsed ? 
              <ChevronRight className="h-4 w-4 text-muted-foreground" /> : 
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            }
          </button>

          {isSidebarCollapsed ? (
            // Collapsed sidebar content
            <div className="flex flex-col items-center py-4 space-y-4">
              <Settings className="h-6 w-6 text-primary" />
            </div>
          ) : (
            // Expanded sidebar content
            <ScrollArea className="flex-1">
              <div className="p-4">
                <div className="mb-4">
                  <AIConfigForm
                    config={aiConfig}
                    onChange={handleConfigChange}
                  />
                </div>
                
                <div className="mt-4 space-y-2">
                  {selectedAnalysisMode === 'individual' && selectedFileId && (
                    <Button 
                      className="w-full"
                      onClick={handleRunAnalysis}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <LightbulbIcon className="mr-2 h-4 w-4" />
                          Run Analysis
                        </>
                      )}
                    </Button>
                  )}
                  
                  {selectedAnalysisMode === 'project' && (
                    <Button 
                      className="w-full"
                      onClick={runProjectAnalysis}
                      disabled={isProjectAnalyzing}
                    >
                      {isProjectAnalyzing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing Project...
                        </>
                      ) : (
                        <>
                          <Network className="mr-2 h-4 w-4" />
                          Run Project Analysis
                        </>
                      )}
                    </Button>
                  )}
                </div>
                
                {/* History and Actions */}
                <div className="mt-6 border-t pt-4">
                  <h3 className="text-sm font-semibold mb-2">History &amp; Actions</h3>
                  
                  {/* Clear Results Button */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mb-3"
                    onClick={async () => {
                      // Clear all files and analysis results
                      try {
                        await deleteAllCobolFiles();
                        
                        // Reset UI state
                        if (selectedAnalysisMode === 'project') {
                          setProjectAnalysis(undefined);
                        }
                        if (selectedFileId) {
                          setSelectedFileId(undefined);
                          refetchAnalysis();
                        }
                        
                        toast({
                          title: "All Files Cleared",
                          description: "All files and analysis results have been removed",
                        });
                      } catch (error) {
                        toast({
                          title: "Error",
                          description: "Failed to clear files",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Clear All Files
                  </Button>
                  
                  {/* Analysis History */}
                  {selectedFileId && selectedAnalysisMode === 'individual' && (
                    <div className="mt-3">
                      <h4 className="text-xs font-medium mb-2 text-muted-foreground">Analysis History</h4>
                      <AnalysisHistory
                        fileId={selectedFileId}
                        analysisMode="individual"
                        onSelectAnalysis={onSelectAnalysisHistory}
                      />
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </aside>
        
        {/* Main content area */}
        <main className="flex-1 overflow-auto">
          {/* Content for the selected mode */}
          <div className="p-6">
            {selectedAnalysisMode === 'individual' && (
              <>
                {selectedFileId ? (
                  // File is selected - show analysis tabs
                  <Tabs defaultValue="relationships">
                    <TabsList className="mb-4">
                      <TabsTrigger value="relationships">
                        <Network className="h-4 w-4 mr-2" />
                        Relationships
                      </TabsTrigger>
                      <TabsTrigger value="analysis">
                        <LightbulbIcon className="h-4 w-4 mr-2" />
                        Analysis
                      </TabsTrigger>
                      <TabsTrigger value="code">
                        <File className="h-4 w-4 mr-2" />
                        Code
                      </TabsTrigger>
                    </TabsList>
                    
                    {/* Relationships Tab Content */}
                    <TabsContent value="relationships">
                      <Card className="border-0 shadow-sm">
                        <CardContent className="p-0">
                          <RelationshipGraph 
                            entities={analysis?.entities} 
                            relationships={analysis?.relationships} 
                            isLoading={isAnalysisLoading || isAnalyzing} 
                          />
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    {/* Analysis Tab Content */}
                    <TabsContent value="analysis">
                      <div className="space-y-6">
                        {/* AI Explanations - At the very top position */}
                        <AIExplanation 
                          analysis={analysis as AnalysisReport}
                          selectedEntity={selectedEntity}
                          isLoading={isAnalysisLoading || isAnalyzing}
                        />
                        
                        {/* Entities and Issues */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <EntityDetails 
                            analysis={analysis as AnalysisReport} 
                            isLoading={isAnalysisLoading || isAnalyzing} 
                          />
                          <PotentialIssues 
                            analysis={analysis as AnalysisReport} 
                            isLoading={isAnalysisLoading || isAnalyzing} 
                          />
                        </div>
                        
                        {/* Code Structure and Quality - Moved to bottom */}
                        <AnalysisSummary 
                          analysis={analysis as AnalysisReport} 
                          isLoading={isAnalysisLoading || isAnalyzing} 
                        />
                        
                        {/* Program Summary and Chart */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <ProgramSummaryTree 
                            analysis={analysis as AnalysisReport} 
                            isLoading={isAnalysisLoading || isAnalyzing} 
                          />
                          <RelationshipChart 
                            analysis={analysis as AnalysisReport} 
                            isLoading={isAnalysisLoading || isAnalyzing} 
                          />
                        </div>
                      </div>
                    </TabsContent>
                    
                    {/* Code Tab Content */}
                    <TabsContent value="code">
                      <Card>
                        <CardHeader>
                          <CardTitle>Source Code</CardTitle>
                          <CardDescription>
                            View the COBOL source code
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <CodeViewer fileId={selectedFileId} aiConfig={aiConfig} />
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                ) : (
                  // No file selected - show upload UI
                  <div className="flex flex-col items-center text-center max-w-2xl mx-auto p-8 bg-card border border-border rounded-xl">
                    <FileText className="h-16 w-16 text-primary/30 mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Individual Program Analysis</h1>
                    <p className="text-muted-foreground mb-6">
                      Upload a COBOL program to analyze its structure, entities, relationships, and potential issues.
                    </p>
                    <FileUpload 
                      variant="full"
                      onUploadSuccess={(fileId) => {
                        if (fileId) {
                          setSelectedFileId(fileId);
                          refetchAnalysisHistory();
                        }
                      }} 
                    />
                    
                    <div className="w-full mt-8">
                      <h3 className="text-sm font-semibold text-left mb-2">Existing Files</h3>
                      <div className="border border-border rounded-md">
                        <FileList 
                          selectedFileId={selectedFileId} 
                          onSelectFile={(id) => setSelectedFileId(id)}
                          showValidity={true}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            
            {selectedAnalysisMode === 'project' && (
              <>
                {projectAnalysis ? (
                  // Project analysis results
                  <Tabs defaultValue="relationships">
                    <TabsList className="mb-4">
                      <TabsTrigger value="relationships" className="gap-2">
                        <Network className="h-4 w-4" />
                        Relationships
                      </TabsTrigger>
                      <TabsTrigger value="analysis" className="gap-2">
                        <LightbulbIcon className="h-4 w-4" />
                        Analysis
                      </TabsTrigger>
                      <TabsTrigger value="files" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Files
                      </TabsTrigger>
                    </TabsList>
                    
                    {/* Relationships tab content */}
                    <TabsContent value="relationships">
                      <Card>
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <CardTitle className="text-xl">Project Relationships</CardTitle>
                              <CardDescription>
                                Neo4j-style visualization of program relationships
                              </CardDescription>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Select defaultValue="all">
                                <SelectTrigger className="w-36 h-8 text-xs">
                                  <SelectValue placeholder="All Relationships" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Relationships</SelectItem>
                                  <SelectItem value="calls">Calls</SelectItem>
                                  <SelectItem value="uses">Uses</SelectItem>
                                  <SelectItem value="reads">Reads</SelectItem>
                                  <SelectItem value="writes">Writes</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ProjectNeo4jGraph 
                            analysis={projectAnalysis}
                            isLoading={isProjectAnalyzing}
                          />
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    {/* Analysis tab content */}
                    <TabsContent value="analysis">
                      <div className="space-y-6">
                        {/* AI Explanations will be added here first in future updates */}
                        
                        {/* Program Call Structure Visualization */}
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-bold">Program Call Structure</CardTitle>
                            <CardDescription>
                              Hierarchical view of program calling relationships
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="h-[500px] border rounded-md p-4 overflow-auto">
                              {isProjectAnalyzing ? (
                                <div className="flex justify-center items-center h-full">
                                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                  <span className="ml-2 text-muted-foreground">Analyzing project relationships...</span>
                                </div>
                              ) : !projectAnalysis || !projectAnalysis.entities || projectAnalysis.entities.length === 0 ? (
                                <div className="flex flex-col justify-center items-center h-full">
                                  <GitBranch className="h-12 w-12 text-muted-foreground/30 mb-2" />
                                  <h3 className="text-lg font-medium">No Program Call Structure Available</h3>
                                  <p className="text-muted-foreground text-center max-w-md">
                                    Run a project-wide analysis to see program relationships and call structures.
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {/* Root Program Nodes - Only include programs with actual content */}
                                  {projectAnalysis.entities
                                    .filter(entity => entity.type === "Program" && entity.sourceFile)
                                    .map(entity => {
                                      // Get relationships where this entity is the source
                                      const outgoingRelationships = projectAnalysis?.relationships?.filter(
                                        rel => rel.source === entity.id && 
                                        // Make sure target exists and is a valid entity
                                        projectAnalysis.entities.some(e => e.id === rel.target && e.sourceFile)
                                      ) || [];
                                      
                                      // Get relationships where this entity is the target
                                      const incomingRelationships = projectAnalysis?.relationships?.filter(
                                        rel => rel.target === entity.id && 
                                        // Make sure source exists and is a valid entity
                                        projectAnalysis.entities.some(e => e.id === rel.source && e.sourceFile)
                                      ) || [];
                                      
                                      // Also check project-wide relationships
                                      const outgoingProjectRelationships = projectAnalysis?.projectRelationships?.filter(
                                        rel => rel.source === entity.id && 
                                        // Make sure target exists and is a valid entity
                                        projectAnalysis.entities.some(e => e.id === rel.target && e.sourceFile)
                                      ) || [];
                                      
                                      const incomingProjectRelationships = projectAnalysis?.projectRelationships?.filter(
                                        rel => rel.target === entity.id && 
                                        // Make sure source exists and is a valid entity
                                        projectAnalysis.entities.some(e => e.id === rel.source && e.sourceFile)
                                      ) || [];
                                      
                                      // Combine all relationships
                                      const allOutgoing = [...outgoingRelationships, ...outgoingProjectRelationships];
                                      const allIncoming = [...incomingRelationships, ...incomingProjectRelationships];
                                      
                                      // Only show top-level programs (those that are not called by other programs)
                                      if (allIncoming.length === 0) {
                                        return (
                                          <div key={entity.id} className="call-tree-node">
                                            <div className="flex items-center py-1 px-2 rounded-md hover:bg-muted font-medium">
                                              <span 
                                                className="mr-1 text-muted-foreground cursor-pointer"
                                                onClick={() => {
                                                  const newExpandedNodes = new Set(expandedNodes);
                                                  if (expandedNodes.has(entity.id)) {
                                                    newExpandedNodes.delete(entity.id);
                                                  } else {
                                                    newExpandedNodes.add(entity.id);
                                                  }
                                                  setExpandedNodes(newExpandedNodes);
                                                }}
                                              >
                                                {allOutgoing.length > 0 ? (
                                                  expandedNodes.has(entity.id) ? (
                                                    <ChevronDown className="h-4 w-4" />
                                                  ) : (
                                                    <ChevronRight className="h-4 w-4" />
                                                  )
                                                ) : (
                                                  <span className="w-4"></span>
                                                )}
                                              </span>
                                              <span className="flex-1 flex items-center gap-2">
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                                  Program
                                                </Badge>
                                                <span>{entity.name}</span>
                                                {entity.dialect && (
                                                  <Badge variant="outline" className="ml-1 text-xs">
                                                    {entity.dialect}
                                                  </Badge>
                                                )}
                                              </span>
                                              <span className="text-xs text-muted-foreground">
                                                {allOutgoing.length > 0 && (
                                                  <Badge variant="outline" className="ml-2 text-xs">
                                                    Calls: {allOutgoing.length}
                                                  </Badge>
                                                )}
                                              </span>
                                            </div>
                                            
                                            {allOutgoing.length > 0 && expandedNodes.has(entity.id) && (
                                              <div className="ml-5 border-l pl-2 border-border">
                                                {/* Render child entities */}
                                                {allOutgoing.map(relationship => {
                                                  const targetEntity = projectAnalysis.entities.find(
                                                    e => e.id === relationship.target && e.sourceFile
                                                  );
                                                  
                                                  if (!targetEntity) return null;
                                                  
                                                  // Get relationships for this child entity - filter out non-existent targets
                                                  const childOutgoing = [
                                                    ...(projectAnalysis.relationships || []),
                                                    ...(projectAnalysis.projectRelationships || [])
                                                  ].filter(rel => 
                                                    rel.source === targetEntity.id &&
                                                    // Make sure target exists in the entities
                                                    projectAnalysis.entities.some(e => e.id === rel.target && e.sourceFile)
                                                  );
                                                  
                                                  const childIncoming = [
                                                    ...(projectAnalysis.relationships || []),
                                                    ...(projectAnalysis.projectRelationships || [])
                                                  ].filter(rel => 
                                                    rel.target === targetEntity.id &&
                                                    // Make sure source exists in the entities
                                                    projectAnalysis.entities.some(e => e.id === rel.source && e.sourceFile)
                                                  );
                                                  
                                                  const hasChildren = childOutgoing.length > 0;
                                                  
                                                  return (
                                                    <div key={relationship.id} className="call-tree-node" style={{ paddingLeft: "16px" }}>
                                                      <div className="flex items-center py-1 px-2 rounded-md hover:bg-muted font-medium">
                                                        <span 
                                                          className="mr-1 text-muted-foreground cursor-pointer"
                                                          onClick={() => {
                                                            const newExpandedNodes = new Set(expandedNodes);
                                                            if (expandedNodes.has(targetEntity.id)) {
                                                              newExpandedNodes.delete(targetEntity.id);
                                                            } else {
                                                              newExpandedNodes.add(targetEntity.id);
                                                            }
                                                            setExpandedNodes(newExpandedNodes);
                                                          }}
                                                        >
                                                          {hasChildren ? (
                                                            expandedNodes.has(targetEntity.id) ? (
                                                              <ChevronDown className="h-4 w-4" />
                                                            ) : (
                                                              <ChevronRight className="h-4 w-4" />
                                                            )
                                                          ) : (
                                                            <span className="w-4"></span>
                                                          )}
                                                        </span>
                                                        <span className="flex-1 flex items-center gap-2">
                                                          <Badge 
                                                            variant="outline" 
                                                            className={
                                                              targetEntity.type === "Program" 
                                                                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                                                                : targetEntity.type === "Database"
                                                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                                                                  : targetEntity.type === "File" 
                                                                    ? "bg-orange-50 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
                                                                    : "bg-gray-50 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300"
                                                            }
                                                          >
                                                            {targetEntity.type}
                                                          </Badge>
                                                          <span>{targetEntity.name}</span>
                                                          {targetEntity.dialect && (
                                                            <Badge variant="outline" className="ml-1 text-xs">
                                                              {targetEntity.dialect}
                                                            </Badge>
                                                          )}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                          {childOutgoing.length > 0 && (
                                                            <Badge variant="outline" className="ml-2 text-xs">
                                                              Calls: {childOutgoing.length}
                                                            </Badge>
                                                          )}
                                                          {childIncoming.length > 0 && (
                                                            <Badge variant="outline" className="ml-2 text-xs">
                                                              Called by: {childIncoming.length}
                                                            </Badge>
                                                          )}
                                                        </span>
                                                      </div>
                                                      
                                                      {/* Render grandchild entities if needed */}
                                                      {hasChildren && expandedNodes.has(targetEntity.id) && (
                                                        <div className="ml-5 border-l pl-2 border-border">
                                                          {childOutgoing.map(childRel => {
                                                            const grandchildEntity = projectAnalysis.entities.find(
                                                              e => e.id === childRel.target
                                                            );
                                                            
                                                            if (!grandchildEntity) return null;
                                                            
                                                            // Get counts for grandchild
                                                            const grandchildIncoming = [
                                                              ...(projectAnalysis.relationships || []),
                                                              ...(projectAnalysis.projectRelationships || [])
                                                            ].filter(rel => rel.target === grandchildEntity.id);
                                                            
                                                            return (
                                                              <div key={childRel.id} className="call-tree-node" style={{ paddingLeft: "16px" }}>
                                                                <div className="flex items-center py-1 px-2 rounded-md hover:bg-muted">
                                                                  <span className="w-4"></span>
                                                                  <span className="flex-1 flex items-center gap-2">
                                                                    <Badge 
                                                                      variant="outline" 
                                                                      className={
                                                                        grandchildEntity.type === "Program" 
                                                                          ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                                                                          : grandchildEntity.type === "Database"
                                                                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                                                                            : grandchildEntity.type === "File" 
                                                                              ? "bg-orange-50 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
                                                                              : "bg-gray-50 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300"
                                                                      }
                                                                    >
                                                                      {grandchildEntity.type}
                                                                    </Badge>
                                                                    <span>{grandchildEntity.name}</span>
                                                                    {grandchildEntity.dialect && (
                                                                      <Badge variant="outline" className="ml-1 text-xs">
                                                                        {grandchildEntity.dialect}
                                                                      </Badge>
                                                                    )}
                                                                  </span>
                                                                  <span className="text-xs text-muted-foreground">
                                                                    {grandchildIncoming.length > 0 && (
                                                                      <Badge variant="outline" className="ml-2 text-xs">
                                                                        Called by: {grandchildIncoming.length}
                                                                      </Badge>
                                                                    )}
                                                                  </span>
                                                                </div>
                                                              </div>
                                                            );
                                                          })}
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      }
                                      return null;
                                    })}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* Project Entities */}
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-bold">Project Entities</CardTitle>
                            <CardDescription>
                              All entities found across project files
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-0">
                            <EntityDetails 
                              analysis={projectAnalysis}
                              isLoading={isProjectAnalyzing} 
                            />
                          </CardContent>
                        </Card>
                        
                        {/* AI Explanations */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg font-bold">
                              <LightbulbIcon className="h-5 w-5 inline-block mr-2 text-yellow-500" />
                              AI Project Analysis
                            </CardTitle>
                            <CardDescription>
                              Comprehensive analysis of the entire COBOL system
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <AIExplanation 
                              analysis={projectAnalysis}
                              isLoading={isProjectAnalyzing}
                              isProjectWide={true}
                            />
                          </CardContent>
                        </Card>

                        {/* Code Structure and Quality - Moved to the bottom */}
                        <AnalysisSummary 
                          analysis={projectAnalysis} 
                          isLoading={isProjectAnalyzing} 
                        />
                      </div>
                    </TabsContent>
                    
                    {/* Files tab content */}
                    <TabsContent value="files">
                      <div className="grid gap-6">
                        {/* Project Attachments Component */}
                        <ProjectAttachments 
                          analysis={projectAnalysis} 
                          isLoading={isProjectAnalyzing}
                        />
                        
                        {/* Original File List Card */}
                        <Card>
                          <CardHeader>
                            <CardTitle>Project Files</CardTitle>
                            <CardDescription>
                              Browse COBOL files in this project
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="border border-border rounded-md">
                              <FileList 
                                selectedFileId={selectedFileId} 
                                onSelectFile={(id) => {
                                  setSelectedFileId(id);
                                  setSelectedAnalysisMode('individual');
                                }}
                                showValidity={true}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : (
                  // Project upload UI
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h1 className="text-2xl font-bold">Project-Wide Analysis</h1>
                        <p className="text-muted-foreground">
                          Upload COBOL files and analyze relationships between all programs
                        </p>
                      </div>
                      
                      <Button 
                        onClick={runProjectAnalysis}
                        disabled={isProjectAnalyzing}
                        size="lg"
                        className="flex items-center"
                      >
                        {isProjectAnalyzing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analyzing Project...
                          </>
                        ) : (
                          <>
                            <Network className="mr-2 h-4 w-4" />
                            Run Project Analysis
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <div className="flex flex-col items-center text-center">
                            <Folder className="h-12 w-12 text-primary/20 mb-2" />
                            <CardTitle>Upload COBOL Directory</CardTitle>
                            <CardDescription>
                              Upload a directory containing related COBOL files
                            </CardDescription>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <DirectoryUpload 
                            onUploadSuccess={() => {
                              refetchFileList();
                              toast({
                                title: "Directory Uploaded",
                                description: "Your COBOL files have been uploaded successfully."
                              });
                            }} 
                          />
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <div className="flex flex-col items-center text-center">
                            <FileText className="h-12 w-12 text-primary/20 mb-2" />
                            <CardTitle>Project Files</CardTitle>
                            <CardDescription>
                              Files available for project-wide analysis
                            </CardDescription>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <FileList 
                            showValidity={true} 
                            onSelectFile={(id) => {
                              setSelectedFileId(id);
                              setSelectedAnalysisMode('individual');
                            }} 
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </>
            )}
            
            {selectedAnalysisMode === 'neo4j' && (
              <Neo4jDashboard 
                className="w-full" 
                analysisMode="combined"
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}