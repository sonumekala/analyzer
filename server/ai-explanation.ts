import { AIConfig, CodeStructure, Entity, Relationship, AnalysisReport } from "../shared/schema";
import { performLLMAnalysis } from "./llm";
import { log } from "./vite";

/**
 * Generate a natural language explanation of code structure
 */
export async function explainCodeStructure(
  codeStructure: CodeStructure,
  aiConfig: AIConfig
): Promise<string> {
  try {
    // Create a template for the explanation based on the code structure
    const dialectDescription = getDialectDescription(codeStructure.cobolDialect);

    // Generate the explanation text
    let explanation = `This COBOL program appears to be written in ${codeStructure.cobolDialect} dialect${dialectDescription ? `, ${dialectDescription}` : ""}.
    
The program consists of ${codeStructure.loc} lines of code organized into multiple sections. It contains ${codeStructure.procedures} procedures or paragraphs that handle different aspects of the business logic.

There are ${codeStructure.dataItems} data items defined, which represent the variables and data structures manipulated by the program. The program interacts with ${codeStructure.fileSections} file sections, suggesting data persistence operations.`;

    // For more detailed explanations with AI, we would use the AI model
    if (aiConfig.detailLevel === "Detailed") {
      // Use more advanced AI to generate a comprehensive explanation
      const prompt = `
You are a COBOL expert. Given the following metrics about a COBOL program, provide a comprehensive explanation of its structure and potential purpose:

- Lines of code: ${codeStructure.loc}
- Number of procedures: ${codeStructure.procedures}
- Number of data items: ${codeStructure.dataItems}
- Number of file sections: ${codeStructure.fileSections}
- COBOL dialect: ${codeStructure.cobolDialect}

Your explanation should:
1. Describe what these metrics tell us about the program's complexity and purpose
2. Explain typical uses of programs with this structure
3. Highlight potential maintenance or modernization considerations
4. Provide context about the dialect and its implications

Keep your explanation technical but clear, in 4-5 paragraphs.`;

      // In reality, here we would call the AI model
      if (aiConfig.modelName === "gpt-4o") {
        // Call OpenAI for the explanation
        // This would be implemented in openai.ts
        // explainWithOpenAI(prompt, aiConfig)
        explanation = await getAICodeStructureExplanation(codeStructure, aiConfig);
      } else {
        // Use internal LLM model
        explanation = await getAICodeStructureExplanation(codeStructure, aiConfig);
      }
    }

    return explanation;
  } catch (error) {
    log(`Error generating code structure explanation: ${error instanceof Error ? error.message : String(error)}`);
    return "Unable to generate code structure explanation.";
  }
}

/**
 * Generate a natural language explanation of an entity
 */
export async function explainEntity(
  entity: Entity,
  relationships: Relationship[],
  aiConfig: AIConfig
): Promise<string> {
  try {
    // Basic explanation based on entity type
    let explanation = `${entity.name} is a ${entity.type.toLowerCase()} ${getEntityTypeDescription(entity.type)}
    
${entity.description}

This ${entity.type.toLowerCase()} ${getOperationsDescription(entity.operations)}.`;

    // Find relationships involving this entity
    const relatedEntities = relationships
      .filter(rel => rel.source === entity.id || rel.target === entity.id)
      .map(rel => {
        const isSource = rel.source === entity.id;
        const relationshipDescription = getRelationshipDescription(rel.type, isSource);
        const otherEntityId = isSource ? rel.target : rel.source;
        return { relationshipDescription, entityId: otherEntityId };
      });

    if (relatedEntities.length > 0) {
      explanation += `\n\nRelationships:\n`;
      relatedEntities.forEach(rel => {
        explanation += `- ${rel.relationshipDescription} (${rel.entityId})\n`;
      });
    }

    // For more detailed explanations with AI, we would use the AI model
    if (aiConfig.detailLevel === "Detailed") {
      // Use more advanced AI to generate a comprehensive explanation
      const prompt = `
You are a COBOL expert. Given the following information about a COBOL program entity, provide a comprehensive explanation:

Entity Name: ${entity.name}
Entity Type: ${entity.type}
Description: ${entity.description}
Operations: ${entity.operations.join(", ")}

Related entities:
${relatedEntities.map(rel => `- ${rel.relationshipDescription} (${rel.entityId})`).join("\n")}

Your explanation should:
1. Explain the entity's purpose and role within the COBOL application
2. Describe how this entity type is typically used in COBOL systems
3. Analyze the relationships and dependencies
4. Provide insights on potential maintenance, performance, or modernization considerations

Keep your explanation technical but clear, in 3-4 paragraphs.`;

      // In reality, here we would call the AI model
      if (aiConfig.modelName === "gpt-4o") {
        // Call OpenAI for the explanation
        // This would be implemented in openai.ts
        // explainWithOpenAI(prompt, aiConfig)
        explanation = await getAIEntityExplanation(entity, relationships, aiConfig);
      } else {
        // Use internal LLM model
        explanation = await getAIEntityExplanation(entity, relationships, aiConfig);
      }
    }

    return explanation;
  } catch (error) {
    log(`Error generating entity explanation: ${error instanceof Error ? error.message : String(error)}`);
    return "Unable to generate entity explanation.";
  }
}

/**
 * Generate an explanation of the entire analysis
 */
export async function explainAnalysis(
  analysis: AnalysisReport,
  aiConfig: AIConfig
): Promise<string> {
  try {
    // Basic explanation based on high-level metrics
    let explanation = `This COBOL program has a ${analysis.codeQuality.complexity.rating.toLowerCase()} complexity level, ${analysis.codeQuality.maintainability.rating.toLowerCase()} maintainability, and ${analysis.codeQuality.documentation.rating.toLowerCase()} documentation.

It consists of ${analysis.codeStructure.loc} lines of code with ${analysis.codeStructure.procedures} procedures and ${analysis.entities.length} entities identified.`;

    if (analysis.issues.length > 0) {
      const criticalIssues = analysis.issues.filter(issue => issue.severity === "error").length;
      const warnings = analysis.issues.filter(issue => issue.severity === "warning").length;
      const infos = analysis.issues.filter(issue => issue.severity === "info").length;
      
      explanation += `\n\nThe analysis identified ${analysis.issues.length} issues: 
      ${criticalIssues} critical issues, ${warnings} warnings, and ${infos} information items that may require attention.`;
    }

    // List main entities and their purposes
    if (analysis.entities.length > 0) {
      explanation += "\n\nKey entities identified:";
      
      // Get top 5 entities
      const topEntities = analysis.entities.slice(0, 5);
      topEntities.forEach(entity => {
        explanation += `\n- ${entity.name} (${entity.type}): ${entity.description.substring(0, 100)}${entity.description.length > 100 ? '...' : ''}`;
      });
      
      if (analysis.entities.length > 5) {
        explanation += `\n- ... and ${analysis.entities.length - 5} more entities`;
      }
    }

    // For more detailed explanations with AI
    if (aiConfig.detailLevel === "Detailed") {
      // Use more advanced AI to generate a comprehensive explanation
      const prompt = `
You are a COBOL expert. Given the following analysis of a COBOL program, provide a comprehensive summary:

Code Quality:
- Complexity: ${analysis.codeQuality.complexity.rating} (score: ${analysis.codeQuality.complexity.score})
- Maintainability: ${analysis.codeQuality.maintainability.rating} (score: ${analysis.codeQuality.maintainability.score})
- Documentation: ${analysis.codeQuality.documentation.rating} (score: ${analysis.codeQuality.documentation.score})

Structure:
- Lines of code: ${analysis.codeStructure.loc}
- Procedures: ${analysis.codeStructure.procedures}
- Data items: ${analysis.codeStructure.dataItems}
- File sections: ${analysis.codeStructure.fileSections}
- COBOL dialect: ${analysis.codeStructure.cobolDialect}

Entities: ${analysis.entities.length} total
${analysis.entities.slice(0, 5).map(e => `- ${e.name} (${e.type}): ${e.description.substring(0, 100)}${e.description.length > 100 ? '...' : ''}`).join("\n")}

Issues: ${analysis.issues.length} total
- Critical issues: ${analysis.issues.filter(i => i.severity === "error").length}
- Warnings: ${analysis.issues.filter(i => i.severity === "warning").length}
- Info items: ${analysis.issues.filter(i => i.severity === "info").length}

Your explanation should:
1. Provide an executive summary of the program's quality and purpose
2. Highlight the most significant findings 
3. Identify potential risks and maintenance challenges
4. Suggest modernization or improvement approaches

Provide a technical but clear analysis in 5-6 paragraphs.`;

      // In reality, here we would call the AI model
      if (aiConfig.modelName === "gpt-4o") {
        // Call OpenAI for the explanation
        // This would be implemented in openai.ts
        // explainWithOpenAI(prompt, aiConfig)
        explanation = await getAIAnalysisExplanation(analysis, aiConfig);
      } else {
        // Use internal LLM model
        explanation = await getAIAnalysisExplanation(analysis, aiConfig);
      }
    }

    return explanation;
  } catch (error) {
    log(`Error generating analysis explanation: ${error instanceof Error ? error.message : String(error)}`);
    return "Unable to generate analysis explanation.";
  }
}

// Helper functions to generate descriptions

function getDialectDescription(dialect: string): string {
  const dialectInfo: Record<string, string> = {
    "COBOL-85": "which is the 1985 ANSI standard widely used in legacy systems",
    "IBM Enterprise COBOL": "which is IBM's enhanced COBOL implementation for z/OS mainframes",
    "Micro Focus COBOL": "which is designed for distributed systems and includes extensions for modern platforms",
    "ACUCOBOL-GT": "which offers portability across UNIX, Linux, and Windows environments",
    "GNU COBOL": "which is an open-source implementation that follows COBOL standards",
    "COBOL-74": "which is the older 1974 standard that predates many modern COBOL features",
    "COBOL-2002": "which includes object-oriented programming features",
    "COBOL-2014": "which is the latest standard with additional modern programming capabilities"
  };

  return dialectInfo[dialect] || "";
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

  return typeDescriptions[type] || "";
}

function getOperationsDescription(operations: string[]): string {
  if (operations.length === 0) {
    return "does not perform any specific operations";
  }
  
  return `performs the following operations: ${operations.join(", ")}`;
}

function getRelationshipDescription(type: string, isSource: boolean): string {
  const relationshipDescriptions: Record<string, [string, string]> = {
    "Calls": ["calls", "is called by"],
    "CalledBy": ["is called by", "calls"],
    "Reads": ["reads from", "is read by"],
    "Writes": ["writes to", "is written by"],
    "Contains": ["contains", "is contained in"],
    "Uses": ["uses", "is used by"],
    "DependsOn": ["depends on", "is depended on by"]
  };

  const [sourceDesc, targetDesc] = relationshipDescriptions[type] || ["relates to", "relates to"];
  return isSource ? sourceDesc : targetDesc;
}

// Mock AI implementation functions that would be replaced with actual AI calls

async function getAICodeStructureExplanation(codeStructure: CodeStructure, aiConfig: AIConfig): Promise<string> {
  // This would be implemented with actual AI model calls
  return `This COBOL program written in ${codeStructure.cobolDialect} exhibits a ${codeStructure.loc > 500 ? 'substantial' : 'moderate'} codebase with ${codeStructure.loc} lines of code. The program's architecture divides functionality across ${codeStructure.procedures} procedures, indicating a modular design approach typical of well-structured COBOL applications. This modularity suggests the program was designed with maintainability in mind, allowing different business functions to be separated and maintained independently.

The presence of ${codeStructure.dataItems} data items reveals a comprehensive data processing system, likely handling complex business records and calculations. These data items represent the core business entities and their attributes that the program manipulates. With ${codeStructure.fileSections} file sections, the program demonstrates significant data persistence operations, suggesting it performs batch processing, data extraction, or reporting functions that interact with multiple data sources and destinations.

Programs with this structure typically serve as core business process automation tools in enterprise environments, often handling critical functions like financial transactions, inventory management, or customer record processing. The combination of procedure count and file interactions indicates this is likely a batch processing application that reads input data, performs business calculations, and produces formatted reports or updates to other systems.

Given the ${codeStructure.cobolDialect} dialect, this program ${getDialectModernizationAdvice(codeStructure.cobolDialect)}. For maintenance and modernization purposes, special attention should be paid to the data definitions and file handling logic, as these often contain business rules embedded within the structure itself. The number of procedures suggests a reasonable level of complexity that would benefit from thorough documentation of module responsibilities and interactions during any modernization efforts.`;
}

async function getAIEntityExplanation(entity: Entity, relationships: Relationship[], aiConfig: AIConfig): Promise<string> {
  // This would be implemented with actual AI model calls
  const relatedCount = relationships.filter(rel => rel.source === entity.id || rel.target === entity.id).length;
  
  return `${entity.name} is a ${entity.type} component that plays a ${relatedCount > 3 ? 'central' : 'supporting'} role in the COBOL application's architecture. ${entity.description} This entity ${getOperationsDescription(entity.operations)}, which is typical for its type within legacy enterprise systems.

In the context of this application, ${entity.name} appears to ${relatedCount > 0 ? 'interact with multiple other components' : 'operate relatively independently'}, suggesting it handles ${entity.type === 'Program' ? 'a discrete business function' : entity.type === 'Database' ? 'persistent data storage' : entity.type === 'File' ? 'file-based I/O operations' : entity.type === 'Screen' ? 'user interface logic' : 'specialized processing logic'}. The ${entity.operations.length} different operations performed indicate a ${entity.operations.length > 3 ? 'multi-purpose' : 'focused'} component with ${entity.operations.length > 3 ? 'broad' : 'specific'} responsibilities within the system.

${getEntitySpecificAnalysis(entity, relationships)}

From a maintenance perspective, ${entity.name} ${relatedCount > 3 ? 'has multiple dependencies that increase complexity during modifications' : 'is relatively contained, making it easier to modify in isolation'}. During modernization efforts, this entity would be ${getEntityModernizationComplexity(entity, relationships)} to refactor due to its ${relatedCount > 3 ? 'extensive' : 'limited'} connections to other system components and its role in ${entity.operations.join(" and ")} operations.`;
}

async function getAIAnalysisExplanation(analysis: AnalysisReport, aiConfig: AIConfig): Promise<string> {
  // This would be implemented with actual AI model calls
  const hasHighComplexity = analysis.codeQuality.complexity.rating === "High";
  const hasPoorMaintainability = analysis.codeQuality.maintainability.rating === "Poor";
  const hasCriticalIssues = analysis.issues.filter(i => i.severity === "error").length > 0;
  
  return `This COBOL program represents a ${analysis.codeStructure.loc > 1000 ? 'substantial' : 'moderate'} legacy application with ${analysis.codeQuality.complexity.rating.toLowerCase()} complexity, ${analysis.codeQuality.maintainability.rating.toLowerCase()} maintainability, and ${analysis.codeQuality.documentation.rating.toLowerCase()} documentation quality. Written in ${analysis.codeStructure.cobolDialect}, it contains ${analysis.codeStructure.loc} lines across ${analysis.codeStructure.procedures} procedures, utilizing ${analysis.codeStructure.dataItems} data items and interacting with ${analysis.codeStructure.fileSections} file sections. The analysis reveals a system that appears to be ${getOverallSystemHealth(analysis)} with ${analysis.issues.length} identified issues requiring attention.

The program's architecture consists of ${analysis.entities.length} distinct entities, with the most significant being ${getTopEntitiesSummary(analysis.entities)}. These components form the core business functionality, handling critical operations that ${getPrimarySystemFunction(analysis)}. The relationships between these entities demonstrate ${analysis.relationships.length > analysis.entities.length * 1.5 ? 'high coupling' : 'reasonable separation of concerns'}, which has direct implications for maintenance complexity and future modernization efforts.

${hasCriticalIssues ? `The analysis identified ${analysis.issues.filter(i => i.severity === "error").length} critical issues that require immediate attention, primarily related to ${getCriticalIssuesSummary(analysis.issues)}. These issues present significant risks to system stability, data integrity, and could potentially impact business operations if left unaddressed.` : `While no critical issues were identified, there are ${analysis.issues.filter(i => i.severity === "warning").length} warnings and ${analysis.issues.filter(i => i.severity === "info").length} informational items that should be reviewed as part of ongoing maintenance. These predominantly relate to ${getWarningsSummary(analysis.issues)}, which may impact long-term sustainability.`}

The code quality metrics indicate ${hasHighComplexity || hasPoorMaintainability ? 'significant challenges' : 'reasonable quality'} for a legacy COBOL application. ${hasHighComplexity ? `With high complexity (score: ${analysis.codeQuality.complexity.score}), the program likely contains deeply nested logic, complex conditional statements, and potentially intricate business rules embedded within the code.` : ''} ${hasPoorMaintainability ? `The poor maintainability rating (score: ${analysis.codeQuality.maintainability.score}) suggests difficulties in making changes without introducing regressions, likely due to code structure, limited modularization, or interdependencies.` : ''} ${analysis.codeQuality.documentation.rating === "Poor" ? `The poor documentation quality highlights a significant challenge for knowledge transfer and developer onboarding.` : ''}

For modernization purposes, this application would benefit from ${getModernizationApproach(analysis)}. The ${analysis.codeStructure.procedures} procedures should be evaluated for service-oriented refactoring potential, with careful attention to the ${analysis.entities.filter(e => e.type === "Database" || e.type === "File").length} data storage components that may contain embedded business rules. Given the ${analysis.relationships.length} identified relationships, a phased modernization approach would be prudent to minimize disruption to dependent systems and business processes.`;
}

// Additional helper functions for AI explanations

function getDialectModernizationAdvice(dialect: string): string {
  const dialectAdvice: Record<string, string> = {
    "COBOL-85": "may require updates to leverage more modern COBOL features, but is generally well-supported by migration tools",
    "IBM Enterprise COBOL": "benefits from IBM's continued support and modernization paths within the z/OS ecosystem",
    "Micro Focus COBOL": "has good options for migration to distributed environments with Micro Focus tools",
    "ACUCOBOL-GT": "offers reasonable pathways for moving to modern platforms while preserving business logic",
    "GNU COBOL": "provides a path to open systems while maintaining COBOL compatibility",
    "COBOL-74": "presents significant modernization challenges due to its age and obsolete features",
    "COBOL-2002": "includes object-oriented features that can ease integration with modern systems",
    "COBOL-2014": "offers the most modern COBOL features for integration with contemporary architectures"
  };

  return dialectAdvice[dialect] || "would benefit from assessment against current COBOL standards for modernization";
}

function getEntitySpecificAnalysis(entity: Entity, relationships: Relationship[]): string {
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
      const readOps = entity.operations.filter(op => op.toLowerCase().includes("read") || op.toLowerCase().includes("select")).length;
      const writeOps = entity.operations.filter(op => op.toLowerCase().includes("write") || op.toLowerCase().includes("update") || op.toLowerCase().includes("insert") || op.toLowerCase().includes("delete")).length;
      
      if (readOps > 0 && writeOps > 0) {
        return "This database entity supports both read and write operations, indicating it serves as a primary data store for the application.";
      } else if (readOps > 0) {
        return "This database entity is primarily used for read operations, suggesting it may serve as a reference data source or lookup table.";
      } else if (writeOps > 0) {
        return "This database entity is primarily used for write operations, indicating it may be an audit log, transaction history, or output collection point.";
      } else {
        return "This database entity's operations are not clearly defined, which may indicate incomplete analysis or unusual usage patterns.";
      }
    
    case "File":
      return "This file resource is used for data persistence in a traditional COBOL file-handling approach, which was the standard method before database management systems became prevalent in business applications.";
    
    case "Screen":
      return "This screen interface component represents a user interaction point, likely implemented using COBOL's screen section or integrated with a terminal management system like CICS.";
    
    default:
      return `This ${entity.type.toLowerCase()} component provides specialized functionality within the COBOL ecosystem, contributing to the overall system architecture through its specific capabilities.`;
  }
}

function getEntityModernizationComplexity(entity: Entity, relationships: Relationship[]): string {
  const relatedCount = relationships.filter(rel => rel.source === entity.id || rel.target === entity.id).length;
  
  if (relatedCount > 5) {
    return "challenging";
  } else if (relatedCount > 2) {
    return "moderately complex";
  } else {
    return "relatively straightforward";
  }
}

function getOverallSystemHealth(analysis: AnalysisReport): string {
  const criticalIssues = analysis.issues.filter(i => i.severity === "error").length;
  const highComplexity = analysis.codeQuality.complexity.rating === "High";
  const poorMaintainability = analysis.codeQuality.maintainability.rating === "Poor";
  
  if (criticalIssues > 3 && (highComplexity || poorMaintainability)) {
    return "at significant risk";
  } else if (criticalIssues > 0 || (highComplexity && poorMaintainability)) {
    return "facing notable challenges";
  } else if (highComplexity || poorMaintainability) {
    return "stable but with technical debt";
  } else {
    return "relatively healthy for its age";
  }
}

function getTopEntitiesSummary(entities: Entity[]): string {
  const topEntities = entities.slice(0, 3).map(e => e.name).join(", ");
  return entities.length > 3 ? `${topEntities}, and others` : topEntities;
}

function getPrimarySystemFunction(analysis: AnalysisReport): string {
  const hasFileOps = analysis.entities.some(e => e.type === "File");
  const hasDBOps = analysis.entities.some(e => e.type === "Database");
  const hasScreens = analysis.entities.some(e => e.type === "Screen");
  const hasAPI = analysis.entities.some(e => e.type === "API");
  
  if (hasScreens && (hasDBOps || hasFileOps)) {
    return "likely implements an interactive business application with user interfaces and data persistence";
  } else if (hasAPI && (hasDBOps || hasFileOps)) {
    return "appears to provide service interfaces to data with potential integration points for other systems";
  } else if (hasDBOps || hasFileOps) {
    return "focuses on batch data processing operations, probably for reporting or data transformation purposes";
  } else {
    return "implements specialized business logic, possibly calculation-intensive processing";
  }
}

function getCriticalIssuesSummary(issues: { type: string, severity: string, description: string }[]): string {
  const criticalIssues = issues.filter(i => i.severity === "error");
  
  if (criticalIssues.length === 0) {
    return "no critical areas";
  }
  
  // Group by type
  const issueTypes = new Set(criticalIssues.map(i => i.type));
  
  if (issueTypes.size <= 2) {
    return Array.from(issueTypes).join(" and ");
  } else {
    const typesArray = Array.from(issueTypes);
    return `${typesArray.slice(0, 2).join(", ")}, and other areas`;
  }
}

function getWarningsSummary(issues: { type: string, severity: string, description: string }[]): string {
  const warnings = issues.filter(i => i.severity === "warning");
  
  if (warnings.length === 0) {
    return "no warning areas";
  }
  
  // Group by type
  const issueTypes = new Set(warnings.map(i => i.type));
  
  if (issueTypes.size <= 2) {
    return Array.from(issueTypes).join(" and ");
  } else {
    const typesArray = Array.from(issueTypes);
    return `${typesArray.slice(0, 2).join(", ")}, and other areas`;
  }
}

function getModernizationApproach(analysis: AnalysisReport): string {
  const hasHighComplexity = analysis.codeQuality.complexity.rating === "High";
  const hasPoorMaintainability = analysis.codeQuality.maintainability.rating === "Poor";
  const hasCriticalIssues = analysis.issues.filter(i => i.severity === "error").length > 0;
  const highEntityCount = analysis.entities.length > 10;
  
  if (hasCriticalIssues && (hasHighComplexity || hasPoorMaintainability)) {
    return "initial stabilization before any modernization activities, focusing on resolving critical issues to ensure a stable baseline";
  } else if (hasHighComplexity && hasPoorMaintainability) {
    return "incremental refactoring to reduce complexity before attempting larger modernization initiatives";
  } else if (highEntityCount) {
    return "a component-based modernization approach, prioritizing loosely coupled modules for initial transformation";
  } else {
    return "a strategic assessment to determine whether encapsulation, refactoring, or replacement would be most appropriate";
  }
}