import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  FileDown,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { exportAnalysisAsJSON, exportAnalysisAsMarkdown, exportAnalysisAsPDF } from "@/lib/cobol-service";
import { type AIConfig } from "@shared/schema";

type AnalysisSidebarProps = {
  fileId?: number;
  analysisHistory?: any[];
  analysisMetadata?: {
    modelUsed: string;
    processingTime: number;
    tokensUsed: number;
    createdAt?: string;
  };
  aiConfig: AIConfig;
  onConfigChange: (config: Partial<AIConfig>) => void;
  onRunAnalysis: () => void;
  isAnalyzing?: boolean;
};

export default function AnalysisSidebar({
  fileId,
  analysisHistory = [],
  analysisMetadata,
  aiConfig,
  onConfigChange,
  onRunAnalysis,
  isAnalyzing = false
}: AnalysisSidebarProps) {
  const { toast } = useToast();
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  const handleExport = async (format: 'json' | 'markdown' | 'pdf') => {
    if (!fileId) return;
    
    try {
      setExportLoading(format);
      
      switch (format) {
        case 'json':
          await exportAnalysisAsJSON(fileId);
          break;
        case 'markdown':
          await exportAnalysisAsMarkdown(fileId);
          break;
        case 'pdf':
          await exportAnalysisAsPDF(fileId);
          break;
      }
      
      toast({
        title: "Export successful",
        description: `Analysis exported as ${format.toUpperCase()}`
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setExportLoading(null);
    }
  };

  const [openSections, setOpenSections] = useState({
    aiConfig: true,
    analysisHistory: true,
    aiProcessing: true,
    exportOptions: true
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="p-4 h-full flex flex-col">
      <h2 className="text-lg font-semibold text-neutral-800 mb-4">Analysis Details</h2>
      
      {/* AI Configuration Section */}
      <Collapsible
        open={openSections.aiConfig}
        onOpenChange={() => toggleSection('aiConfig')}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          <CollapsibleTrigger asChild>
            <button className="flex items-center text-xs font-bold text-neutral-700 uppercase hover:text-primary-600 transition-colors">
              {openSections.aiConfig ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
              AI Configuration
            </button>
          </CollapsibleTrigger>
        </div>
        
        <CollapsibleContent>
          {/* Temperature Slider */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm text-neutral-700">Model Temperature</label>
              <span className="text-sm font-medium">{aiConfig.modelTemperature.toFixed(1)}</span>
            </div>
            <Slider
              value={[aiConfig.modelTemperature * 100]}
              min={0}
              max={100}
              step={10}
              className="w-full"
              onValueChange={(value) => onConfigChange({ modelTemperature: value[0] / 100 })}
              disabled={isAnalyzing}
            />
          </div>
          
          {/* Context Window */}
          <div className="mb-4">
            <label className="block text-sm text-neutral-700 mb-1">Context Window</label>
            <Select 
              value={aiConfig.contextWindow.toString()} 
              onValueChange={(value) => onConfigChange({ contextWindow: parseInt(value) })}
              disabled={isAnalyzing}
            >
              <SelectTrigger>
                <SelectValue>
                  {aiConfig.contextWindow === 4096 ? "4096 tokens" : 
                   aiConfig.contextWindow === 8192 ? "8192 tokens" : 
                   aiConfig.contextWindow === 16384 ? "16384 tokens" : 
                   "Select context window"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="4096">4096 tokens</SelectItem>
                  <SelectItem value="8192">8192 tokens</SelectItem>
                  <SelectItem value="16384">16384 tokens</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          
          {/* Detail Level */}
          <div className="mb-4">
            <label className="block text-sm text-neutral-700 mb-1">Detail Level</label>
            <Select 
              value={aiConfig.detailLevel} 
              onValueChange={(value) => onConfigChange({ 
                detailLevel: value as "Basic" | "Standard" | "Detailed" | "Expert" 
              })}
              disabled={isAnalyzing}
            >
              <SelectTrigger>
                <SelectValue>
                  {aiConfig.detailLevel || "Select detail level"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="Basic">Basic</SelectItem>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Detailed">Detailed</SelectItem>
                  <SelectItem value="Expert">Expert</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          
          {/* Model Selection */}
          <div className="mb-4">
            <label className="block text-sm text-neutral-700 mb-1">AI Model</label>
            <Select 
              value={aiConfig.modelName} 
              onValueChange={(value) => onConfigChange({ modelName: value })}
              disabled={isAnalyzing}
            >
              <SelectTrigger>
                <SelectValue>
                  {aiConfig.modelName === "llama3-8b" ? "Llama 3 (8B parameters)" : 
                   aiConfig.modelName === "mistral-7b" ? "Mistral 7B" : 
                   aiConfig.modelName === "codellama-13b" ? "CodeLlama 13B" : 
                   "Select AI model"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="llama3-8b">Llama 3 (8B parameters)</SelectItem>
                  <SelectItem value="mistral-7b">Mistral 7B</SelectItem>
                  <SelectItem value="codellama-13b">CodeLlama 13B</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          
          {/* Run Analysis Button */}
          <Button 
            onClick={onRunAnalysis} 
            className="w-full" 
            disabled={isAnalyzing || !fileId}
          >
            {isAnalyzing ? "Analyzing..." : "Run Analysis"}
          </Button>
        </CollapsibleContent>
      </Collapsible>
      
      {/* Analysis History */}
      <Collapsible
        open={openSections.analysisHistory}
        onOpenChange={() => toggleSection('analysisHistory')}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          <CollapsibleTrigger asChild>
            <button className="flex items-center text-xs font-bold text-neutral-700 uppercase hover:text-primary-600 transition-colors">
              {openSections.analysisHistory ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
              Analysis History
            </button>
          </CollapsibleTrigger>
        </div>
        
        <CollapsibleContent>
          {analysisHistory.length > 0 ? (
            <div className="space-y-2">
              {analysisHistory.map((analysis, index) => (
                <Card key={index}>
                  <CardContent className="p-3 text-sm">
                    <div className="font-medium text-neutral-800">
                      {formatDate(new Date(analysis.createdAt))}
                    </div>
                    <div className="text-xs text-neutral-500 mb-2">
                      Analyzed with {analysis.modelUsed}
                    </div>
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary-600">
                      View
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="border border-neutral-200 rounded-md p-3 bg-neutral-50 text-center">
              <p className="text-sm text-neutral-500">No analysis history yet</p>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
      
      {/* AI Processing Stats */}
      {analysisMetadata && (
        <Collapsible
          open={openSections.aiProcessing}
          onOpenChange={() => toggleSection('aiProcessing')}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <CollapsibleTrigger asChild>
              <button className="flex items-center text-xs font-bold text-neutral-700 uppercase hover:text-primary-600 transition-colors">
                {openSections.aiProcessing ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
                AI Processing
              </button>
            </CollapsibleTrigger>
          </div>
          
          <CollapsibleContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Model</dt>
                <dd className="font-medium">{analysisMetadata.modelUsed}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Runtime</dt>
                <dd className="font-medium">Local CPU</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Processing Time</dt>
                <dd className="font-medium">{Math.floor(analysisMetadata.processingTime / 1000)}s</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Tokens Used</dt>
                <dd className="font-medium">{analysisMetadata.tokensUsed.toLocaleString()}</dd>
              </div>
            </dl>
          </CollapsibleContent>
        </Collapsible>
      )}
      
      {/* Export Options */}
      <Collapsible
        open={openSections.exportOptions}
        onOpenChange={() => toggleSection('exportOptions')}
      >
        <div className="flex items-center justify-between mb-3">
          <CollapsibleTrigger asChild>
            <button className="flex items-center text-xs font-bold text-neutral-700 uppercase hover:text-primary-600 transition-colors">
              {openSections.exportOptions ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
              Export Options
            </button>
          </CollapsibleTrigger>
        </div>
        
        <CollapsibleContent>
          <div className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => handleExport('pdf')}
              disabled={!fileId || !analysisMetadata || exportLoading !== null}
            >
              <FileDown className="h-4 w-4 mr-2 text-red-500" />
              {exportLoading === 'pdf' ? "Exporting..." : "Export as PDF"}
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => handleExport('markdown')}
              disabled={!fileId || !analysisMetadata || exportLoading !== null}
            >
              <FileDown className="h-4 w-4 mr-2 text-purple-500" />
              {exportLoading === 'markdown' ? "Exporting..." : "Export as Markdown"}
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => handleExport('json')}
              disabled={!fileId || !analysisMetadata || exportLoading !== null}
            >
              <FileDown className="h-4 w-4 mr-2 text-yellow-500" />
              {exportLoading === 'json' ? "Exporting..." : "Export as JSON"}
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
