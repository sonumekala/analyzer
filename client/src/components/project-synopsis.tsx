import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Loader2 } from 'lucide-react';
import { 
  getLatestProjectAnalysis, 
  exportProjectAnalysisAsJSON, 
  exportProjectAnalysisAsMarkdown 
} from '@/lib/cobol-service';
import { AnalysisReport } from '@shared/schema';

interface ProjectSynopsisProps {
  className?: string;
}

export function ProjectSynopsis({ className }: ProjectSynopsisProps) {
  const [exporting, setExporting] = useState<string | null>(null);
  
  // Get the latest project analysis
  const { data: projectAnalysis, isLoading, error } = useQuery({
    queryKey: ['/api/project/analysis'],
    queryFn: getLatestProjectAnalysis,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
    refetchOnWindowFocus: false,
  });
  
  // Export functions
  const handleExportJSON = async () => {
    try {
      setExporting('json');
      await exportProjectAnalysisAsJSON();
    } catch (error) {
      console.error('Error exporting as JSON:', error);
    } finally {
      setExporting(null);
    }
  };

  const handleExportMarkdown = async () => {
    try {
      setExporting('markdown');
      await exportProjectAnalysisAsMarkdown();
    } catch (error) {
      console.error('Error exporting as Markdown:', error);
    } finally {
      setExporting(null);
    }
  };
  
  // Helper to display program information
  const renderProgramList = (analysis: AnalysisReport) => {
    if (!analysis.projectPrograms || analysis.projectPrograms.length === 0) {
      return <p className="text-muted-foreground">No programs found in the project.</p>;
    }
    
    return (
      <Accordion type="single" collapsible className="w-full">
        {analysis.projectPrograms.map((program) => (
          <AccordionItem key={program.id} value={program.id}>
            <AccordionTrigger className="hover:bg-secondary px-4 rounded-sm">
              <div className="flex items-center">
                <FileText className="mr-2 h-4 w-4" />
                <span>{program.name}</span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {program.id.includes('file-') ? 'Program' : 'Entity'}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-2">
              <div className="whitespace-pre-wrap text-sm">
                {program.description}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Project Synopsis</CardTitle>
          <CardDescription>Loading project information...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  // Render error state
  if (error || !projectAnalysis) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Project Synopsis</CardTitle>
          <CardDescription>Project overview and program information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No project analysis available. Please run a project-wide analysis first.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Project Synopsis</CardTitle>
          <CardDescription>Project overview and program information</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJSON}
            disabled={!!exporting}
          >
            {exporting === 'json' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Download className="mr-2 h-4 w-4" />
            JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportMarkdown}
            disabled={!!exporting}
          >
            {exporting === 'markdown' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Download className="mr-2 h-4 w-4" />
            Markdown
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Synopsis HTML */}
        {projectAnalysis.projectSynopsis && (
          <div 
            className="mb-6 overflow-auto prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: projectAnalysis.projectSynopsis }}
          />
        )}
        
        {/* Programs list */}
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Programs</h3>
          {renderProgramList(projectAnalysis)}
        </div>
      </CardContent>
    </Card>
  );
}