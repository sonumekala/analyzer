import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, Zap, Hash, Thermometer, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AnalysisHistoryProps {
  fileId?: number;
  analysisMode: 'individual' | 'project';
  onSelectAnalysis?: (analysisId: number) => void;
}

interface AnalysisHistoryItem {
  id: number;
  fileId: number;
  createdAt: string;
  modelUsed: string;
  modelTemperature: string;
  detailLevel: string;
  processingTime: number;
  tokensUsed: number;
}

export default function AnalysisHistory({ 
  fileId, 
  analysisMode,
  onSelectAnalysis 
}: AnalysisHistoryProps) {
  const [selectedHistoryItemId, setSelectedHistoryItemId] = useState<number | null>(null);
  
  // Fetch analysis history for the selected file
  const { 
    data: analysisHistory = [],
    isLoading,
    refetch
  } = useQuery<AnalysisHistoryItem[]>({
    queryKey: [`/api/files/${fileId}/analysis/history`],
    queryFn: async () => {
      if (!fileId) return [];
      const response = await fetch(`/api/files/${fileId}/analysis`);
      if (!response.ok) throw new Error('Failed to fetch analysis history');
      return response.json();
    },
    enabled: !!fileId && analysisMode === 'individual'
  });
  
  // TODO: Add project-wide analysis history when API is available
  const { 
    data: projectAnalysisHistory = [],
    isLoading: isProjectHistoryLoading
  } = useQuery<AnalysisHistoryItem[]>({
    queryKey: [`/api/project/analysis/history`],
    queryFn: async () => {
      // This endpoint is currently hypothetical
      // const response = await fetch('/api/project/analysis/history');
      // if (!response.ok) throw new Error('Failed to fetch project analysis history');
      // return response.json();
      return []; // Currently returning empty array
    },
    enabled: analysisMode === 'project'
  });
  
  // Use the appropriate history based on selected mode
  const history = analysisMode === 'individual' ? analysisHistory : projectAnalysisHistory;
  const isHistoryLoading = analysisMode === 'individual' ? isLoading : isProjectHistoryLoading;
  
  // Handle selecting a history item
  const handleSelectHistoryItem = (id: number) => {
    setSelectedHistoryItemId(id);
    if (onSelectAnalysis) {
      onSelectAnalysis(id);
    }
  };
  
  // If no file is selected for individual mode, show empty state
  if (analysisMode === 'individual' && !fileId) {
    return (
      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground text-sm">
            <AlertCircle className="h-5 w-5 mx-auto mb-2" />
            No file selected
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Show loading state
  if (isHistoryLoading) {
    return (
      <Card className="mt-4">
        <CardContent className="flex justify-center items-center p-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading history...</span>
        </CardContent>
      </Card>
    );
  }
  
  // Empty history state
  if (history.length === 0) {
    return (
      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground text-sm">
            <Clock className="h-5 w-5 mx-auto mb-2" />
            No analysis history found
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Get model name display function
  const getModelDisplay = (modelName: string) => {
    if (modelName === 'gpt-4o') return 'GPT-4o';
    if (modelName === 'llama3-8b') return 'Llama 3 (8B)';
    if (modelName === 'mistral-7b') return 'Mistral 7B';
    if (modelName === 'codellama-13b') return 'CodeLlama 13B';
    return modelName;
  };
  
  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Analysis History</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => refetch()}
        >
          <Clock className="h-3.5 w-3.5 mr-1" />
          Refresh
        </Button>
      </div>
      
      <ScrollArea className="h-[300px]">
        <Accordion type="single" collapsible className="space-y-2 w-full">
          {history.map((item, index) => {
            const isSelected = item.id === selectedHistoryItemId;
            const formattedDate = format(new Date(item.createdAt), 'MMM d, yyyy h:mm a');
            
            return (
              <AccordionItem 
                key={item.id} 
                value={`item-${item.id}`}
                className={cn(
                  "border rounded-md overflow-hidden",
                  isSelected ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <AccordionTrigger 
                  className={cn(
                    "px-3 py-2 hover:no-underline hover:bg-muted/50",
                    isSelected ? "text-primary font-medium" : ""
                  )}
                >
                  <div className="flex items-center justify-between w-full text-left">
                    <div className="flex items-center">
                      <Badge className="mr-2" variant={isSelected ? "default" : "outline"}>
                        {getModelDisplay(item.modelUsed)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formattedDate}</span>
                    </div>
                    <div className="opacity-70 text-xs">
                      {item.processingTime}ms
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 pt-0">
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-muted-foreground">
                        <Thermometer className="h-3.5 w-3.5 mr-1.5" />
                        <span>Temperature:</span>
                      </div>
                      <div>{item.modelTemperature}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-muted-foreground">
                        <Zap className="h-3.5 w-3.5 mr-1.5" />
                        <span>Tokens:</span>
                      </div>
                      <div>{item.tokensUsed.toLocaleString()}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-muted-foreground">
                        <Hash className="h-3.5 w-3.5 mr-1.5" />
                        <span>Detail Level:</span>
                      </div>
                      <div>{item.detailLevel}</div>
                    </div>
                    <Separator className="my-2" />
                    <Button
                      size="sm"
                      className="w-full text-xs"
                      variant={isSelected ? "secondary" : "outline"}
                      onClick={() => handleSelectHistoryItem(item.id)}
                    >
                      {isSelected ? "Selected" : "View Analysis"}
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </ScrollArea>
    </div>
  );
}