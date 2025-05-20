import { storage } from "./storage";
import { performLLMAnalysis } from "./llm";
import { analyzeCobolWithOpenAI, analyzeCobolRelationships } from "./openai";
import { neo4jService } from './neo4j-service';
import {
  type CodeStructure,
  type CodeQuality,
  type Entity,
  type Issue,
  type Relationship,
  type AIConfig,
  type ProgramInterface,
  type DataElement
} from "@shared/schema";

export type AnalysisReport = {
  codeStructure: CodeStructure;
  codeQuality: CodeQuality;
  entities: Entity[];
  issues: Issue[];
  relationships: Relationship[];
  processingTime: number;
  tokensUsed: number;
  
  // Program specific data
  callingChain?: {
    sourceInterfaces: ProgramInterface[];
    destinationInterfaces: ProgramInterface[];
    flow: Entity[];
  };
  inputDataElements?: DataElement[];
  outputDataElements?: DataElement[];
  databases?: {
    name: string;
    type: string;
    operations: ("read" | "update" | "delete" | "insert")[];
    tables: string[];
  }[];
  
  // Project-wide data (only available when analyzing multiple files together)
  isProjectWide?: boolean;
  projectRelationships?: Relationship[];
  projectSynopsis?: string;
  projectPrograms?: {
    id: string;
    name: string;
    program_id: string;
    description: string;
  }[];
};

/**
 * Performs a complete analysis of a COBOL file
 */
export async function analyzeCobolFile(fileId: number, config: AIConfig): Promise<AnalysisReport> {
  const startTime = Date.now();
  
  // Get the file content
  const file = await storage.getCobolFile(fileId);
  if (!file) {
    throw new Error(`File with ID ${fileId} not found`);
  }

  // Choose analysis method based on model
  let analysisResult;
  if (config.modelName === "gpt-4o") {
    // Use OpenAI integration if GPT-4o is selected
    analysisResult = await analyzeCobolWithOpenAI(file.content, config);
  } else {
    // Fall back to existing LLM analysis for other models
    analysisResult = await performLLMAnalysis(file.content, config);
  }
  
  // Calculate processing time if not already provided by the analysis
  const processingTime = analysisResult.processingTime || (Date.now() - startTime);
  
  // Create the complete analysis report
  const report: AnalysisReport = {
    ...analysisResult,
    processingTime,
    tokensUsed: analysisResult.tokensUsed
  };
  
  // Store the analysis result
  await storage.createAnalysisResult({
    fileId,
    modelUsed: config.modelName,
    modelTemperature: config.modelTemperature.toString(),
    contextWindow: config.contextWindow,
    detailLevel: config.detailLevel,
    processingTime,
    tokensUsed: analysisResult.tokensUsed,
    codeStructure: report.codeStructure,
    codeQuality: report.codeQuality,
    entities: report.entities,
    issues: report.issues,
    relationships: report.relationships
  });
  
  // Store in Neo4j graph database
  try {
    // First add all entities
    for (const entity of report.entities) {
      await neo4jService.createEntity(entity);
    }
    
    // Then add all relationships between entities
    for (const relationship of report.relationships) {
      await neo4jService.createRelationship(relationship);
    }
    
    console.log(`[Neo4j] Stored ${report.entities.length} entities and ${report.relationships.length} relationships for file ${fileId}`);
  } catch (error) {
    console.error("[Neo4j] Failed to store analysis in graph database:", error);
    // Continue with analysis even if Neo4j storage fails
  }
  
  return report;
}

/**
 * Gets the most recent analysis for a file, or creates a new one if none exists
 */
export async function getOrCreateAnalysis(fileId: number, config: AIConfig): Promise<AnalysisReport> {
  const existingAnalysis = await storage.getLatestAnalysisResultByFileId(fileId);
  
  if (existingAnalysis) {
    const report: AnalysisReport = {
      codeStructure: existingAnalysis.codeStructure as CodeStructure,
      codeQuality: existingAnalysis.codeQuality as CodeQuality,
      entities: existingAnalysis.entities as Entity[],
      issues: existingAnalysis.issues as Issue[],
      relationships: existingAnalysis.relationships as Relationship[],
      processingTime: existingAnalysis.processingTime,
      tokensUsed: existingAnalysis.tokensUsed
    };
    return report;
  }
  
  return analyzeCobolFile(fileId, config);
}

/**
 * Analyzes relationships between multiple COBOL files in a project
 */
export async function analyzeProjectRelationships(config: AIConfig): Promise<AnalysisReport> {
  const startTime = Date.now();
  
  // Get all files
  const files = await storage.getCobolFiles();
  
  if (files.length === 0) {
    throw new Error("No COBOL files found in the project");
  }
  
  // Choose the analysis method based on the model
  if (config.modelName === "gpt-4o") {
    // Use OpenAI for project-wide analysis with GPT-4o
    try {
      const analysisResult = await analyzeCobolRelationships(files, config);
      return {
        ...analysisResult,
        isProjectWide: true
      };
    } catch (error) {
      console.error("OpenAI project analysis failed:", error);
      console.log("Falling back to traditional analysis method");
      // Fall back to traditional analysis if OpenAI fails
    }
  }
  
  // Traditional analysis method (fallback)
  // First, make sure all files have individual analyses
  const analysisPromises = files.map(file => getOrCreateAnalysis(file.id, config));
  const fileAnalyses = await Promise.all(analysisPromises);
  
  // Combine all entities and establish project-wide relationships
  const allEntities: Entity[] = [];
  const allRelationships: Relationship[] = [];
  const projectRelationships: Relationship[] = [];
  let totalProcessingTime = 0;
  let totalTokensUsed = 0;
  
  // Collect all entities and relationships
  fileAnalyses.forEach(analysis => {
    allEntities.push(...analysis.entities);
    allRelationships.push(...analysis.relationships);
    totalProcessingTime += analysis.processingTime;
    totalTokensUsed += analysis.tokensUsed;
  });
  
  // Find cross-file relationships by directly analyzing the COBOL code
  files.forEach((file, fileIndex) => {
    const sourceAnalysis = fileAnalyses[fileIndex];
    const sourceEntities = sourceAnalysis.entities;
    
    // Get the program name from this file
    const programIdMatch = file.content.match(/PROGRAM-ID\s*\.\s*([A-Z0-9-]+)/i);
    const programName = programIdMatch ? programIdMatch[1].trim() : file.filename.replace('.CBL', '');
    
    // Look for CALL statements in this file's content that might reference other files
    const callRegex = /CALL\s+['"]*([A-Z0-9-]+)['"]*\s*/gi;
    let callMatch;
    const calledPrograms = new Set<string>();
    
    while ((callMatch = callRegex.exec(file.content)) !== null) {
      if (callMatch[1]) {
        const calledProgramName = callMatch[1].trim();
        calledPrograms.add(calledProgramName);
      }
    }
    
    // For each called program, check if it exists in another file
    calledPrograms.forEach(calledProgramName => {
      files.forEach((otherFile, otherIndex) => {
        if (fileIndex === otherIndex) return; // Skip self
        
        // Check if the other file contains this program
        const otherProgramIdMatch = otherFile.content.match(/PROGRAM-ID\s*\.\s*([A-Z0-9-]+)/i);
        const otherProgramName = otherProgramIdMatch ? otherProgramIdMatch[1].trim() : otherFile.filename.replace('.CBL', '');
        
        // If the called program matches the other file's program name, create a relationship
        if (calledProgramName === otherProgramName) {
          // Create "Calls" relationship from this file to the other file
          projectRelationships.push({
            id: `project-calls-${file.id}-${otherFile.id}`,
            source: `file-${file.id}`,
            target: `file-${otherFile.id}`,
            type: 'Calls', 
            description: `${file.filename} calls program ${calledProgramName} in ${otherFile.filename}`
          });
          
          // Create "CalledBy" relationship from the other file to this file
          projectRelationships.push({
            id: `project-calledby-${otherFile.id}-${file.id}`,
            source: `file-${otherFile.id}`,
            target: `file-${file.id}`,
            type: 'CalledBy', 
            description: `${otherFile.filename} is called by ${file.filename}`
          });
        }
      });
    });
    
    // Also check for file references in SELECT statements for database files
    const selectRegex = /SELECT\s+([A-Z0-9-]+)\s+ASSIGN\s+TO\s+['"]*([A-Z0-9-]+)['"]*\s*/gi;
    let selectMatch;
    
    while ((selectMatch = selectRegex.exec(file.content)) !== null) {
      if (selectMatch[1] && selectMatch[2]) {
        const selectedFileName = selectMatch[2].trim();
        
        // Create relationship to a file entity
        files.forEach((otherFile, otherIndex) => {
          if (fileIndex === otherIndex) return; // Skip self
          
          // If the file name is mentioned in another file, create a relationship
          if (otherFile.content.includes(selectedFileName)) {
            projectRelationships.push({
              id: `project-uses-${file.id}-${otherFile.id}`,
              source: `file-${file.id}`,
              target: `file-${otherFile.id}`,
              type: 'Uses', 
              description: `${file.filename} uses file ${selectedFileName} referenced in ${otherFile.filename}`
            });
          }
        });
      }
    }
  });
  
  // Calculate processing time for project analysis
  const projectProcessingTime = Date.now() - startTime;
  
  // Generate project programs list
  const projectPrograms = files.map((file, index) => {
    // Extract the PROGRAM-ID from each file if possible
    const programIdMatch = file.content.match(/PROGRAM-ID\s*\.\s*([A-Z0-9-]+)\s*\./i);
    const programName = programIdMatch ? programIdMatch[1].trim() : file.filename.replace('.CBL', '');
    
    // Count incoming and outgoing calls
    const incomingCalls = projectRelationships.filter(r => r.target === `file-${file.id}` && r.type === 'Calls').length;
    const outgoingCalls = projectRelationships.filter(r => r.source === `file-${file.id}` && r.type === 'Calls').length;
    
    // Generate a basic description
    const description = `COBOL Program: ${file.filename}
Calls to other programs: ${outgoingCalls}
Called by other programs: ${incomingCalls}`;
    
    return {
      id: `file-${file.id}`,
      name: programName,
      program_id: file.filename,
      description: description
    };
  });
  
  // Generate calling chain structure for project-wide analysis
  // This will be used for the Program Call Structure visualization
  const callingChain: {
    sourceInterfaces: { type: string, name: string, direction: string, description: string }[];
    destinationInterfaces: { type: string, name: string, direction: string, description: string }[];
    flow: Entity[];
  } = {
    sourceInterfaces: [],
    destinationInterfaces: [],
    flow: []
  };
  
  // Add all programs to the flow for program call structure
  files.forEach((file, index) => {
    // Find this file's entities that already exist
    const matchingEntity = allEntities.find(e => e.id === `file-${file.id}`);
    
    // If we found a matching entity, use that; otherwise create a basic one
    if (matchingEntity) {
      callingChain.flow.push(matchingEntity);
    } else {
      // Extract PROGRAM-ID from file content
      const programIdMatch = file.content.match(/PROGRAM-ID\s*\.\s*([A-Z0-9-]+)\s*\./i);
      const programName = programIdMatch ? programIdMatch[1].trim() : file.filename.replace('.CBL', '');
      
      // Create a basic entity for the file
      callingChain.flow.push({
        id: `file-${file.id}`,
        name: programName,
        type: 'Program',
        description: `COBOL Program: ${file.filename}`,
        operations: []
      });
    }
  });
  
  // Generate project synopsis
  const totalPrograms = files.length;
  const totalProcedures = allEntities.filter(e => e.type === 'Procedure').length;
  const totalDataItems = allEntities.filter(e => e.type === 'DataElement').length;
  const totalCalls = projectRelationships.filter(r => r.type === 'Calls').length;
  const fileOperations = projectRelationships.filter(r => r.type === 'Reads' || r.type === 'Writes').length;
  
  // Determine complexity for each program
  const programComplexity = files.map((file, index) => {
    const complexity = fileAnalyses[index]?.codeQuality.complexity.rating || "Low";
    return { 
      name: file.filename.replace('.CBL', ''), 
      complexity 
    };
  });
  
  // Format the project synopsis as HTML
  const projectSynopsis = `<h3 class='mt-4'>COBOL Project Synopsis</h3>
<h4 class='mt-3'>Overview
This COBOL project consists of ${totalPrograms} program(s) that work together to form an application. Based on the structure and components, this appears to be an enterprise application.</h4>
<h4 class='mt-3'>Key Programs
The following COBOL programs were analyzed:
${programComplexity.map(p => `- ${p.name} (Complexity: ${p.complexity})`).join('\n')}</h4>
<h4 class='mt-3'>Project Structure
- Total Programs: ${totalPrograms}
- Total Paragraphs: ${totalProcedures}
- Total Data Items: ${totalDataItems}
- Total External Calls: ${totalCalls}
- File I/O Operations: ${fileOperations}</h4>
<h4 class='mt-3'>Program Relationships
The analysis shows relationships between various components including program calls, copybook inclusions, and data definitions.</h4>
<h4 class='mt-3'>Relationship Analysis</h4>
<h5 class='mt-3'>Program Call Relationships</h5>
${projectRelationships
  .filter(r => r.type === 'Calls')
  .map(r => {
    const source = r.source.replace('file-', '');
    const target = r.target.replace('file-', '');
    const sourceFile = files.find(f => `file-${f.id}` === r.source);
    const targetFile = files.find(f => `file-${f.id}` === r.target);
    return `- ${sourceFile?.filename.replace('.CBL', '')} → ${targetFile?.filename.replace('.CBL', '')}`;
  })
  .join('\n')}
<h4 class='mt-3'>Analysis Date
This analysis was generated on ${new Date().toISOString().slice(0, 10)}.</h4>`;

  // Create combined report with project-level metrics
  const report: AnalysisReport = {
    // Use the first file's analysis as base
    codeStructure: {
      loc: files.reduce((total, file) => total + file.content.split('\n').length, 0),
      procedures: allEntities.filter(e => e.type === 'Procedure').length,
      dataItems: allEntities.filter(e => e.type === 'DataElement').length,
      fileSections: 0, // Need to calculate from actual analysis
      cobolDialect: fileAnalyses[0]?.codeStructure.cobolDialect || "Unknown"
    },
    codeQuality: fileAnalyses[0]?.codeQuality || {
      maintainability: { score: 0, rating: "Fair" },
      documentation: { score: 0, rating: "Fair" },
      complexity: { score: 0, rating: "Medium" }
    },
    entities: allEntities,
    issues: fileAnalyses.flatMap(a => a.issues),
    relationships: allRelationships,
    processingTime: totalProcessingTime + projectProcessingTime,
    tokensUsed: totalTokensUsed,
    
    // Add the calling chain for program call structure visualization
    callingChain: callingChain,
    
    // Project-specific data
    isProjectWide: true,
    projectRelationships: projectRelationships,
    projectSynopsis: projectSynopsis,
    projectPrograms: projectPrograms
  };
  
  // Save the project analysis to storage
  try {
    await storage.saveProjectAnalysis(report);
    console.log("Project analysis saved to storage successfully");
  } catch (error) {
    console.error("Error saving project analysis to storage:", error);
  }
  
  // Store project relationships in Neo4j graph database
  try {
    // First make sure file entities are created
    for (const file of files) {
      // Extract the PROGRAM-ID from each file if possible
      const programIdMatch = file.content.match(/PROGRAM-ID\s*\.\s*([A-Z0-9-]+)\s*\./i);
      
      const fileEntity: Entity = {
        id: `file-${file.id}`,
        // Use the PROGRAM-ID if available, otherwise fall back to filename
        name: programIdMatch ? programIdMatch[1].trim() : file.filename.replace('.CBL', ''),
        type: "Program", // Changed from "File" to "Program" for clarity
        description: `COBOL program: ${file.filename}`,
        operations: []
      };
      await neo4jService.createEntity(fileEntity);
    }
    
    // Then add all project-level relationships
    for (const relationship of projectRelationships) {
      await neo4jService.createRelationship(relationship);
    }
    
    console.log(`[Neo4j] Stored ${files.length} file entities and ${projectRelationships.length} project relationships`);
  } catch (error) {
    console.error("[Neo4j] Failed to store project analysis in graph database:", error);
    // Continue with analysis even if Neo4j storage fails
  }
  
  return report;
}
