import { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogClose
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  RefactoringSuggestion 
} from "@shared/schema";
import { AlertCircle, Info, CheckCircle2, ArrowRightCircle } from "lucide-react";

type RefactoringSuggestionsProps = {
  suggestions?: RefactoringSuggestion[];
  isLoading?: boolean;
};

export default function RefactoringSuggestions({ 
  suggestions = [], 
  isLoading = false 
}: RefactoringSuggestionsProps) {
  const [selectedSuggestion, setSelectedSuggestion] = useState<RefactoringSuggestion | null>(null);
  const [dialogTab, setDialogTab] = useState("current");
  const dialogTriggerRef = useRef<HTMLSpanElement>(null);
  
  useEffect(() => {
    if (selectedSuggestion && dialogTriggerRef.current) {
      dialogTriggerRef.current.click();
    }
  }, [selectedSuggestion]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Refactoring Suggestions</CardTitle>
          <CardDescription>Analyzing code for potential improvements...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-10">
          <div className="text-center text-neutral-600">
            <p>Analyzing code structure and patterns</p>
            <p className="mt-2 text-sm text-neutral-500">This might take a moment</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Refactoring Suggestions</CardTitle>
          <CardDescription>Automated recommendations to improve your COBOL code</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-neutral-50">
            <Info className="h-4 w-4" />
            <AlertTitle>No refactoring suggestions</AlertTitle>
            <AlertDescription>
              No refactoring suggestions were found for this program. This could indicate the code is already following best practices.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100';
      case 'low':
        return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
      default:
        return 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertCircle className="h-4 w-4 mr-2" />;
      case 'medium':
        return <Info className="h-4 w-4 mr-2" />;
      case 'low':
        return <CheckCircle2 className="h-4 w-4 mr-2" />;
      default:
        return <Info className="h-4 w-4 mr-2" />;
    }
  };

  const handleOpenDetail = (suggestion: RefactoringSuggestion) => {
    setSelectedSuggestion(suggestion);
    setDialogTab("current");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Refactoring Suggestions</CardTitle>
        <CardDescription>
          {suggestions.length} {suggestions.length === 1 ? 'recommendation' : 'recommendations'} to improve your COBOL code
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id} className="overflow-hidden border border-neutral-200">
              <div className="flex justify-between items-start p-4">
                <div>
                  <div className="flex items-center mb-2">
                    {getSeverityIcon(suggestion.severity)}
                    <h3 className="font-medium">{suggestion.title}</h3>
                  </div>
                  <p className="text-sm text-neutral-600 mb-2">{suggestion.description}</p>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className={getSeverityColor(suggestion.severity)}>
                      {suggestion.severity.charAt(0).toUpperCase() + suggestion.severity.slice(1)} Priority
                    </Badge>
                    <Badge variant="outline">
                      {suggestion.location}
                    </Badge>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleOpenDetail(suggestion)}
                  className="text-primary hover:text-primary-600"
                >
                  View Details
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Detail Dialog */}
        {selectedSuggestion && (
          <Dialog>
            <DialogTrigger asChild>
              <span ref={dialogTriggerRef} id="suggestion-dialog-trigger" className="hidden">Open</span>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedSuggestion.title}</DialogTitle>
              </DialogHeader>
              
              <div className="mt-4">
                <p className="text-neutral-700 mb-4">{selectedSuggestion.description}</p>
                
                <div className="flex items-center space-x-2 mb-4">
                  <Badge variant="outline" className={getSeverityColor(selectedSuggestion.severity)}>
                    {selectedSuggestion.severity.charAt(0).toUpperCase() + selectedSuggestion.severity.slice(1)} Priority
                  </Badge>
                  <Badge variant="outline">
                    {selectedSuggestion.location}
                  </Badge>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Why it matters</h4>
                    <p className="text-sm text-neutral-600">{selectedSuggestion.justification}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Benefits</h4>
                    <p className="text-sm text-neutral-600">{selectedSuggestion.benefit}</p>
                  </div>
                  
                  <Tabs value={dialogTab} onValueChange={setDialogTab}>
                    <TabsList className="mb-2">
                      <TabsTrigger value="current">Current Code</TabsTrigger>
                      <TabsTrigger value="suggested">Suggested Code</TabsTrigger>
                      <TabsTrigger value="comparison">Comparison</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="current">
                      <ScrollArea className="h-[200px] p-4 rounded-md bg-neutral-50 font-mono text-sm whitespace-pre overflow-auto">
                        {selectedSuggestion.currentCode}
                      </ScrollArea>
                    </TabsContent>
                    
                    <TabsContent value="suggested">
                      <ScrollArea className="h-[200px] p-4 rounded-md bg-neutral-50 font-mono text-sm whitespace-pre overflow-auto">
                        {selectedSuggestion.suggestedCode}
                      </ScrollArea>
                    </TabsContent>
                    
                    <TabsContent value="comparison">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium mb-1">Current Code</p>
                          <ScrollArea className="h-[200px] p-4 rounded-md bg-neutral-50 font-mono text-sm whitespace-pre overflow-auto">
                            {selectedSuggestion.currentCode}
                          </ScrollArea>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-1">Suggested Code</p>
                          <ScrollArea className="h-[200px] p-4 rounded-md bg-neutral-50 font-mono text-sm whitespace-pre overflow-auto">
                            {selectedSuggestion.suggestedCode}
                          </ScrollArea>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <DialogClose asChild>
                  <Button variant="outline" className="mr-2">
                    Close
                  </Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}