import { useState, useEffect } from "react";
import { AnalysisReport, Entity, Relationship } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, BrainCircuit, FileCode, Boxes } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface AIExplanationProps {
  analysis?: AnalysisReport;
  selectedEntity?: Entity;
  isLoading?: boolean;
  isProjectWide?: boolean;
}

export default function AIExplanation({
  analysis,
  selectedEntity,
  isLoading = false,
}: AIExplanationProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("structure");
  const [explanations, setExplanations] = useState<{
    structure: string;
    entity: string;
    overall: string;
  }>({
    structure: "",
    entity: "",
    overall: "",
  });
  const [isExplaining, setIsExplaining] = useState<{
    structure: boolean;
    entity: boolean;
    overall: boolean;
  }>({
    structure: false,
    entity: false,
    overall: false,
  });

  // Load explanations when analysis or selected entity changes
  useEffect(() => {
    if (analysis) {
      if (!explanations.structure) {
        getCodeStructureExplanation();
      }
      if (!explanations.overall) {
        getOverallAnalysisExplanation();
      }
    }
  }, [analysis]);

  // Load entity explanation when selected entity changes
  useEffect(() => {
    if (selectedEntity && analysis) {
      getEntityExplanation();
    }
  }, [selectedEntity]);

  // Get code structure explanation from API
  const getCodeStructureExplanation = async () => {
    if (!analysis || isExplaining.structure) return;

    try {
      setIsExplaining({ ...isExplaining, structure: true });
      
      // Simulate API call with basic explanation
      const explanation = generatePlaceholderStructureExplanation(analysis);
      
      // For actual implementation:
      // const response = await fetch(`/api/explain/structure/${analysis.id}`);
      // if (!response.ok) throw new Error("Failed to get explanation");
      // const data = await response.json();
      // const explanation = data.explanation;
      
      setTimeout(() => {
        setExplanations({ ...explanations, structure: explanation });
        setIsExplaining({ ...isExplaining, structure: false });
      }, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate code structure explanation",
        variant: "destructive",
      });
      setIsExplaining({ ...isExplaining, structure: false });
    }
  };

  // Get entity explanation from API
  const getEntityExplanation = async () => {
    if (!selectedEntity || !analysis || isExplaining.entity) return;

    try {
      setIsExplaining({ ...isExplaining, entity: true });
      
      // Simulate API call with basic explanation
      const explanation = generatePlaceholderEntityExplanation(selectedEntity, analysis);
      
      // For actual implementation:
      // const response = await fetch(`/api/explain/entity/${selectedEntity.id}?analysisId=${analysis.id}`);
      // if (!response.ok) throw new Error("Failed to get explanation");
      // const data = await response.json();
      // const explanation = data.explanation;
      
      setTimeout(() => {
        setExplanations({ ...explanations, entity: explanation });
        setIsExplaining({ ...isExplaining, entity: false });
      }, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate entity explanation",
        variant: "destructive",
      });
      setIsExplaining({ ...isExplaining, entity: false });
    }
  };

  // Get overall analysis explanation from API
  const getOverallAnalysisExplanation = async () => {
    if (!analysis || isExplaining.overall) return;

    try {
      setIsExplaining({ ...isExplaining, overall: true });
      
      // Simulate API call with basic explanation
      const explanation = generatePlaceholderOverallExplanation(analysis);
      
      // For actual implementation:
      // const response = await fetch(`/api/explain/analysis/${analysis.id}`);
      // if (!response.ok) throw new Error("Failed to get explanation");
      // const data = await response.json();
      // const explanation = data.explanation;
      
      setTimeout(() => {
        setExplanations({ ...explanations, overall: explanation });
        setIsExplaining({ ...isExplaining, overall: false });
      }, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate overall analysis explanation",
        variant: "destructive",
      });
      setIsExplaining({ ...isExplaining, overall: false });
    }
  };

  // Reset explanations when needed
  const resetExplanations = () => {
    setExplanations({
      structure: "",
      entity: "",
      overall: "",
    });
    if (analysis) {
      getCodeStructureExplanation();
      getOverallAnalysisExplanation();
    }
    if (selectedEntity && analysis) {
      getEntityExplanation();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <BrainCircuit className="h-5 w-5 mr-2 text-primary/70" />
            AI Explanations
          </CardTitle>
          <CardDescription>Loading analysis data...</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <BrainCircuit className="h-5 w-5 mr-2 text-primary/70" />
            AI Explanations
          </CardTitle>
          <CardDescription>
            No analysis data available. Run an analysis to see AI-powered explanations.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <BrainCircuit className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>AI explanations will appear here after analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center">
            <BrainCircuit className="h-5 w-5 mr-2 text-primary/70" />
            AI Explanations
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetExplanations}
            disabled={
              isExplaining.structure || isExplaining.entity || isExplaining.overall
            }
            className="h-8 px-2"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
        <CardDescription>
          AI-powered insights into code structure and entities
        </CardDescription>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-6">
          <TabsList className="w-full">
            <TabsTrigger value="structure" className="flex-1">
              <FileCode className="h-4 w-4 mr-2" />
              Code Structure
            </TabsTrigger>
            <TabsTrigger
              value="entity"
              className="flex-1"
              disabled={!selectedEntity}
            >
              <Boxes className="h-4 w-4 mr-2" />
              Selected Entity
            </TabsTrigger>
            <TabsTrigger value="overall" className="flex-1">
              <BrainCircuit className="h-4 w-4 mr-2" />
              Overall Analysis
            </TabsTrigger>
          </TabsList>
        </div>

        <CardContent className="pt-4">
          <TabsContent value="structure" className="mt-0">
            <ExplanationContent
              title="Code Structure Explanation"
              explanation={explanations.structure}
              isLoading={isExplaining.structure}
              onRefresh={getCodeStructureExplanation}
              emptyMessage="No code structure explanation available"
            />
          </TabsContent>

          <TabsContent value="entity" className="mt-0">
            {selectedEntity ? (
              <ExplanationContent
                title={`Entity: ${selectedEntity.name}`}
                subtitle={`Type: ${selectedEntity.type}`}
                explanation={explanations.entity}
                isLoading={isExplaining.entity}
                onRefresh={getEntityExplanation}
                emptyMessage="Select an entity to see its explanation"
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Boxes className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Select an entity to view its explanation</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="overall" className="mt-0">
            <ExplanationContent
              title="Overall Analysis"
              explanation={explanations.overall}
              isLoading={isExplaining.overall}
              onRefresh={getOverallAnalysisExplanation}
              emptyMessage="No overall analysis explanation available"
            />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}

// Helper component for displaying explanations
function ExplanationContent({
  title,
  subtitle,
  explanation,
  isLoading,
  onRefresh,
  emptyMessage,
}: {
  title: string;
  subtitle?: string;
  explanation: string;
  isLoading: boolean;
  onRefresh: () => void;
  emptyMessage: string;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <Separator />
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary/50" />
            <p className="text-sm text-muted-foreground">Generating explanation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!explanation) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <Separator />
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <BrainCircuit className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-sm text-muted-foreground mb-4">{emptyMessage}</p>
            <Button size="sm" onClick={onRefresh}>
              Generate Explanation
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <Separator />
      <ScrollArea className="h-64 pr-4">
        <div className="space-y-4 text-sm">
          {explanation.split("\n\n").map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// Placeholder explanation generators - these would be replaced by actual API calls
function generatePlaceholderStructureExplanation(analysis: AnalysisReport): string {
  const isProjectWide = analysis.isProjectWide;
  
  // Project-wide structure explanation
  if (isProjectWide) {
    const fileCount = analysis.projectRelationships ? 
      [...new Set(analysis.projectRelationships.map(r => [r.source, r.target]).flat())]
        .filter(id => id.startsWith('file-')).length : 0;
    
    return `## Project Structure Overview

This COBOL project appears to be written primarily in ${
    analysis.codeStructure.cobolDialect
  } dialect, which is ${getDialectDescription(
    analysis.codeStructure.cobolDialect
  )}.

### Project Composition

The project consists of approximately ${fileCount} COBOL source files with a total of ${
    analysis.codeStructure.loc
  } lines of code. The codebase is organized into ${
    analysis.codeStructure.procedures
  } procedures or paragraphs that implement the business logic across multiple programs.

### Data Architecture

The analysis identified ${
    analysis.codeStructure.dataItems
  } data items defined across the project, representing the variables and data structures manipulated by the programs. The codebase interacts with ${
    analysis.codeStructure.fileSections
  } file sections, suggesting a significant focus on data persistence operations.

### System Architecture

This appears to be a ${fileCount > 5 ? "medium to large" : "small to medium"} COBOL application with a ${
    analysis.codeStructure.procedures > 50 ? "complex" : "standard"
  } procedural structure. The project likely represents a critical business system that has evolved over time, with multiple programs working together to implement complete business processes.

The application architecture follows a ${
    analysis.codeStructure.procedures / fileCount > 15 
      ? "monolithic design with large, feature-rich programs" 
      : "relatively modular approach with specialized programs"
  } typical of enterprise COBOL systems of its era.`;
  }
  
  // Individual file structure explanation
  return `This COBOL program appears to be written in ${
    analysis.codeStructure.cobolDialect
  } dialect, which is ${getDialectDescription(
    analysis.codeStructure.cobolDialect
  )}.
    
The program consists of ${
    analysis.codeStructure.loc
  } lines of code organized into multiple sections. It contains ${
    analysis.codeStructure.procedures
  } procedures or paragraphs that handle different aspects of the business logic.

There are ${
    analysis.codeStructure.dataItems
  } data items defined, which represent the variables and data structures manipulated by the program. The program interacts with ${
    analysis.codeStructure.fileSections
  } file sections, suggesting data persistence operations.

Programs with this structure typically serve as core business process automation tools in enterprise environments, often handling critical functions like financial transactions, inventory management, or customer record processing.`;
}

function generatePlaceholderEntityExplanation(
  entity: Entity,
  analysis: AnalysisReport
): string {
  const isProjectWide = analysis.isProjectWide;
  
  // Check if we're looking at relationships from a project-wide or individual file perspective
  const relationships = isProjectWide && analysis.projectRelationships
    ? analysis.projectRelationships.filter(
        (rel) => rel.source === entity.id || rel.target === entity.id
      )
    : analysis.relationships.filter(
        (rel) => rel.source === entity.id || rel.target === entity.id
      );
  
  const relationshipCount = relationships.length;
  
  // Check if it's a file entity in project-wide analysis (these start with "file-")
  if (isProjectWide && entity.id.startsWith('file-')) {
    // File analysis for project-wide view
    const outgoingCalls = relationships.filter(r => r.source === entity.id && r.type === "Calls").length;
    const incomingCalls = relationships.filter(r => r.target === entity.id && (r.type === "Calls" || r.type === "CalledBy")).length;
    const dataRelations = relationships.filter(r => r.type === "Reads" || r.type === "Writes" || r.type === "Uses").length;
    
    return `## ${entity.name} (COBOL Source File)

### File Overview

This file contains ${entity.properties?.procedures || "multiple"} procedures and represents ${
      incomingCalls > 2 ? "a frequently called module" : 
      outgoingCalls > 3 ? "a controller or orchestration program" : 
      dataRelations > 3 ? "a data access module" : "a business logic component"
    } within the larger system.

${entity.description || ""}

### System Integration

This source file ${getOperationsDescription(entity.operations)}.

${
  relationshipCount > 0
    ? `It participates in ${relationshipCount} relationships with other system components, indicating it ${
        relationshipCount > 5
          ? "is a critical and heavily integrated part"
          : relationshipCount > 3
          ? "plays a significant role"
          : "has moderate integration"
      } within the application architecture.`
    : "It appears to operate relatively independently with few connections to other system components."
}

${
  outgoingCalls > 0 
    ? `The file calls ${outgoingCalls} other program${outgoingCalls !== 1 ? 's' : ''}, suggesting it delegates some functionality to other system components.` 
    : "This file doesn't call other programs, suggesting it's either self-contained or a utility module."
}

${
  incomingCalls > 0
    ? `It is called by ${incomingCalls} other file${incomingCalls !== 1 ? 's' : ''}, indicating it provides services to multiple parts of the system.`
    : "It doesn't appear to be called by other programs, suggesting it might be an entry point or a rarely used component."
}

### Modernization Complexity

From a maintenance and modernization perspective, this file would be ${
    relationshipCount > 6
      ? "challenging"
      : relationshipCount > 3
      ? "moderately complex"
      : "relatively straightforward"
  } to modify due to its ${
    relationshipCount > 4 ? "extensive" : "limited"
  } integration with other system components.`;
  }
  
  // Regular entity explanation (either for individual file analysis or non-file entities in project-wide analysis)
  return `${entity.name} is a ${entity.type.toLowerCase()} ${getEntityTypeDescription(
    entity.type
  )}
    
${entity.description || ""}

This ${entity.type.toLowerCase()} ${getOperationsDescription(entity.operations)}.

${
  relationshipCount > 0
    ? `It has ${relationshipCount} relationships with other components in the system, indicating it ${
        relationshipCount > 3
          ? "plays a central role"
          : "has moderate integration"
      } within the application architecture.`
    : "It appears to operate relatively independently with few direct connections to other system components."
}

${getEntitySpecificDetails(entity, relationships)}

From a maintenance perspective, this entity would be ${
    relationshipCount > 4
      ? "challenging"
      : relationshipCount > 2
      ? "moderately complex"
      : "relatively straightforward"
  } to modify due to its ${
    relationshipCount > 3 ? "extensive" : "limited"
  } connections to other system components.`;
}

function generatePlaceholderOverallExplanation(analysis: AnalysisReport): string {
  const complexity = analysis.codeQuality.complexity.rating;
  const maintainability = analysis.codeQuality.maintainability.rating;
  const documentation = analysis.codeQuality.documentation.rating;
  const criticalIssues = analysis.issues.filter(
    (issue) => issue.severity === "error"
  ).length;
  const warnings = analysis.issues.filter(
    (issue) => issue.severity === "warning"
  ).length;
  const isProjectWide = analysis.isProjectWide;

  // Project-wide analysis
  if (isProjectWide) {
    // Count file entities from actual entities list instead of relationships
    const fileEntities = analysis.entities.filter(e => e.type === 'File' || e.type === 'Program');
    const fileCount = fileEntities.length;
    
    // Get actual entity counts by type
    const entityTypeMap = analysis.entities.reduce((acc, entity) => {
      if (!acc[entity.type]) {
        acc[entity.type] = 0;
      }
      acc[entity.type]++;
      return acc;
    }, {} as Record<string, number>);
    
    // Get actual relationship counts by type
    const relationshipTypeMap = analysis.relationships.reduce((acc, relationship) => {
      if (!acc[relationship.type]) {
        acc[relationship.type] = 0;
      }
      acc[relationship.type]++;
      return acc;
    }, {} as Record<string, number>);

    // Get call relationships (direct program to program calls)
    const callRelationships = analysis.relationships.filter(r => 
      r.type === 'Calls' || r.type === 'CalledBy'
    ).length;
    
    // Count data and database entities
    const dataEntities = analysis.entities.filter(e => 
      e.type === 'Data' || e.type === 'DataItem' || e.type === 'Variable'
    ).length;
    
    const databaseEntities = analysis.entities.filter(e => 
      e.type === 'Database' || e.type === 'Table' || e.type === 'File'
    ).length;
    
    // Get all entity types as list for summary
    const entityTypes = Object.keys(entityTypeMap).map(type => 
      `${type} (${entityTypeMap[type]})`
    ).join(', ');
    
    // Get the most common entity type
    let mostCommonType = '';
    let mostCommonCount = 0;
    
    for (const [type, count] of Object.entries(entityTypeMap)) {
      if (count > mostCommonCount) {
        mostCommonCount = count;
        mostCommonType = type;
      }
    }
    
    return `## Project-Wide Analysis

This COBOL project analysis has identified ${analysis.entities.length} total entities across ${fileCount} COBOL programs with an estimated ${analysis.codeStructure.loc} lines of code.

### Entity Types:

The analysis has classified all entities found in the codebase:
* ${entityTypes}

### Relationship Summary:

* ${callRelationships} direct program call relationships between COBOL modules
* ${analysis.relationships.length} total program and data relationships identified
* ${analysis.entities.filter(e => e.type === 'Program').length} distinct program entities found

### Program Structure:

${mostCommonType === 'Program' 
  ? `This is primarily a program-centric codebase with clear module boundaries.` 
  : mostCommonType === 'Data' || mostCommonType === 'DataItem' 
    ? `This appears to be a data-intensive application with significant data processing logic.`
    : mostCommonType === 'Database' || mostCommonType === 'Table'
      ? `This is a database-oriented application with significant data storage components.`
      : `This codebase shows a mixture of different entity types without a single dominant pattern.`
}

${dataEntities > 0 
  ? `The system contains ${dataEntities} data entities, suggesting ${dataEntities > 10 ? 'complex' : 'moderate'} data processing requirements.` 
  : ''}

${databaseEntities > 0 
  ? `The application interacts with ${databaseEntities} database or file entities for data persistence.` 
  : ''}

### Key Entities:

${analysis.entities.length > 0
  ? `Notable entities include ${analysis.entities
      .slice(0, 5)
      .map((e) => `${e.name} (${e.type})`)
      .join(", ")}${
      analysis.entities.length > 5
        ? `, and ${analysis.entities.length - 5} others`
        : ""
    }.`
  : "No entities were identified in the analysis."}
`;
  }
  
  // Individual file analysis
  return `This COBOL program has ${complexity.toLowerCase()} complexity, ${maintainability.toLowerCase()} maintainability, and ${documentation.toLowerCase()} documentation quality according to the analysis.

It consists of ${analysis.codeStructure.loc} lines of code with ${
    analysis.codeStructure.procedures
  } procedures and ${analysis.entities.length} entities identified. The analysis ${
    analysis.issues.length > 0
      ? `identified ${analysis.issues.length} issues: 
${criticalIssues} critical issues, ${warnings} warnings, and ${
          analysis.issues.length - criticalIssues - warnings
        } information items that may require attention.`
      : "did not identify any significant issues with the code."
  }

${
  analysis.entities.length > 0
    ? `The key entities identified include ${analysis.entities
        .slice(0, 3)
        .map((e) => `${e.name} (${e.type})`)
        .join(", ")}${
        analysis.entities.length > 3
          ? `, and ${analysis.entities.length - 3} others`
          : ""
      }.`
    : ""
}

The code quality metrics indicate ${
    complexity === "High" || maintainability === "Poor"
      ? "significant challenges"
      : "reasonable quality"
  } for a legacy COBOL application. ${
    complexity === "High"
      ? "The high complexity suggests the program contains deeply nested logic and potentially intricate business rules embedded within the code."
      : ""
  } ${
    maintainability === "Poor"
      ? "The poor maintainability rating suggests difficulties in making changes without introducing regressions."
      : ""
  }

For modernization purposes, this application would benefit from ${
    criticalIssues > 3
      ? "initial stabilization before any modernization activities"
      : complexity === "High" && maintainability === "Poor"
      ? "incremental refactoring to reduce complexity"
      : analysis.entities.length > 10
      ? "a component-based modernization approach"
      : "a strategic assessment of modernization options"
  }.`;
}

// Helper functions 
function getDialectDescription(dialect: string): string {
  const dialectDescriptions: Record<string, string> = {
    "COBOL-85": "the 1985 ANSI standard widely used in legacy systems",
    "IBM Enterprise COBOL": "IBM's enhanced COBOL implementation for z/OS mainframes",
    "Micro Focus COBOL": "designed for distributed systems with extensions for modern platforms",
    "ACUCOBOL-GT": "offering portability across UNIX, Linux, and Windows environments",
    "GNU COBOL": "an open-source implementation that follows COBOL standards",
    "COBOL-74": "the older 1974 standard that predates many modern features",
    "COBOL-2002": "including object-oriented programming features",
    "COBOL-2014": "the latest standard with additional modern programming capabilities"
  };

  return dialectDescriptions[dialect] || "a variant of the COBOL language";
}

function getEntityTypeDescription(type: string): string {
  const typeDescriptions: Record<string, string> = {
    "Program": "that contains the main business logic and coordinates processing",
    "Database": "that stores and retrieves structured data",
    "API": "that provides an interface for external systems to interact with",
    "File": "that is used for data storage and retrieval",
    "Screen": "that provides a user interface for data entry and display",
    "Kafka": "that manages streaming data or messaging",
    "Queue": "that handles transaction or message processing",
    "Procedure": "that encapsulates a specific set of operations",
    "DataElement": "that represents a data structure or variable"
  };

  return typeDescriptions[type] || "component";
}

function getOperationsDescription(operations: string[]): string {
  if (operations.length === 0) {
    return "does not perform any specific operations";
  }
  
  return `performs the following operations: ${operations.join(", ")}`;
}

function getEntitySpecificDetails(entity: Entity, relationships: Relationship[]): string {
  switch (entity.type) {
    case "Program":
      const callsOthers = relationships.filter(r => r.source === entity.id && r.type === "Calls").length;
      const calledBy = relationships.filter(r => r.target === entity.id && (r.type === "Calls" || r.type === "CalledBy")).length;
      
      if (callsOthers > 3 && calledBy > 2) {
        return "This program functions as a controller or orchestrator, coordinating multiple other programs and being invoked from multiple entry points.";
      } else if (callsOthers > 3) {
        return "This program primarily functions as a driver or coordinator, invoking multiple other program components to fulfill its business function.";
      } else if (calledBy > 2) {
        return "This program appears to be a utility or shared service module, as it's called by multiple other components in the system.";
      } else {
        return "This program has a focused purpose with limited external interactions, suggesting it handles a specific isolated business function.";
      }
    
    case "Database":
      return "As a database entity, it represents a structured data repository that the application interacts with for persistent storage and retrieval of business information.";
    
    case "File":
      return "This file resource is used for data persistence in a traditional COBOL file-handling approach, which was the standard method before database management systems became prevalent.";
    
    case "Screen":
      return "This screen interface component represents a user interaction point, likely implemented using COBOL's screen section or integrated with a terminal management system like CICS.";
    
    default:
      return "";
  }
}