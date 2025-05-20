import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeCobolFile, getOrCreateAnalysis, analyzeProjectRelationships } from "./analysis";
import { z } from "zod";
import { aiConfigSchema, insertCobolFileSchema, AnalysisReport, Entity, Relationship } from "@shared/schema";
import multer from "multer";
import { explainCodeStructure, explainEntity, explainAnalysis } from "./ai-explanation";

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  const apiRouter = express.Router();
  
  // Get all COBOL files
  apiRouter.get("/files", async (req: Request, res: Response) => {
    try {
      const files = await storage.getCobolFiles();
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: `Error fetching files: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });
  
  // Get a specific COBOL file
  apiRouter.get("/files/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const file = await storage.getCobolFile(id);
      
      if (!file) {
        return res.status(404).json({ message: `File with ID ${id} not found` });
      }
      
      res.json(file);
    } catch (error) {
      res.status(500).json({ message: `Error fetching file: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });
  
  // Upload a COBOL file
  apiRouter.post("/files", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const content = req.file.buffer.toString('utf-8');
      
      // Check if file is valid COBOL (simple check for demonstration)
      const isValid = content.includes('PROCEDURE DIVISION') && content.includes('IDENTIFICATION DIVISION');
      
      const fileData = {
        filename: req.file.originalname,
        content,
        fileSize: req.file.size,
        isValid
      };
      
      // Validate file data
      const validatedData = insertCobolFileSchema.parse(fileData);
      
      // Store the file
      const file = await storage.createCobolFile(validatedData);
      res.status(201).json(file);
    } catch (error) {
      let message = "Error uploading file";
      if (error instanceof z.ZodError) {
        message = `Validation error: ${error.errors.map(e => e.message).join(", ")}`;
      } else if (error instanceof Error) {
        message = error.message;
      }
      res.status(400).json({ message });
    }
  });
  
  // Upload COBOL files from a directory
  apiRouter.post("/files/directory", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Check if this is a COBOL file - make case-insensitive
      const filename = req.file.originalname;
      const lowercaseFilename = filename.toLowerCase();
      const isCobolFile = 
        lowercaseFilename.endsWith('.cbl') || 
        lowercaseFilename.endsWith('.cob') || 
        lowercaseFilename.endsWith('.cobol') ||
        lowercaseFilename.endsWith('.cpy') ||
        lowercaseFilename.endsWith('.copy');
        
      if (!isCobolFile) {
        return res.status(400).json({ 
          message: "Not a COBOL file - Files must have the extension .cbl, .cob, .cobol, .cpy, or .copy" 
        });
      }
      
      // Log successful file detection
      console.log(`Processing COBOL file from directory: ${filename}`);
      
      const content = req.file.buffer.toString('utf-8');
      
      // Check if file is valid COBOL (simple check for demonstration)
      const isValid = content.includes('PROCEDURE DIVISION') && content.includes('IDENTIFICATION DIVISION');
      
      const fileData = {
        filename: filename,
        content,
        fileSize: req.file.size,
        isValid
      };
      
      // Validate file data
      const validatedData = insertCobolFileSchema.parse(fileData);
      
      // Store the file
      const file = await storage.createCobolFile(validatedData);
      res.status(201).json(file);
    } catch (error) {
      let message = "Error uploading directory file";
      if (error instanceof z.ZodError) {
        message = `Validation error: ${error.errors.map(e => e.message).join(", ")}`;
      } else if (error instanceof Error) {
        message = error.message;
      }
      res.status(400).json({ message });
    }
  });

  // Delete a COBOL file
  apiRouter.delete("/files/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCobolFile(id);
      
      if (!success) {
        return res.status(404).json({ message: `File with ID ${id} not found` });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: `Error deleting file: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });
  
  // Delete all COBOL files
  apiRouter.delete("/files", async (req: Request, res: Response) => {
    try {
      await storage.deleteAllCobolFiles();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: `Error deleting all files: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });
  
  // Get analysis results for a file
  apiRouter.get("/files/:id/analysis", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const file = await storage.getCobolFile(id);
      
      if (!file) {
        return res.status(404).json({ message: `File with ID ${id} not found` });
      }
      
      const results = await storage.getAnalysisResultsByFileId(id);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: `Error fetching analysis results: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });
  
  // Run analysis on a file
  apiRouter.post("/files/:id/analyze", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const file = await storage.getCobolFile(id);
      
      if (!file) {
        return res.status(404).json({ message: `File with ID ${id} not found` });
      }
      
      // Parse and validate the AI configuration
      let config = aiConfigSchema.parse({
        modelTemperature: req.body.modelTemperature || 0.7,
        contextWindow: req.body.contextWindow || 4096,
        detailLevel: req.body.detailLevel || "Standard",
        modelName: req.body.modelName || "llama3-8b"
      });
      
      // Run the analysis
      const analysis = await analyzeCobolFile(id, config);
      res.json(analysis);
    } catch (error) {
      let message = "Error analyzing file";
      if (error instanceof z.ZodError) {
        message = `Validation error: ${error.errors.map(e => e.message).join(", ")}`;
      } else if (error instanceof Error) {
        message = error.message;
      }
      res.status(400).json({ message });
    }
  });
  
  // Get or create analysis for a file
  apiRouter.post("/files/:id/analysis", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const file = await storage.getCobolFile(id);
      
      if (!file) {
        return res.status(404).json({ message: `File with ID ${id} not found` });
      }
      
      // Parse and validate the AI configuration
      let config = aiConfigSchema.parse({
        modelTemperature: req.body.modelTemperature || 0.7,
        contextWindow: req.body.contextWindow || 4096,
        detailLevel: req.body.detailLevel || "Standard",
        modelName: req.body.modelName || "llama3-8b"
      });
      
      // Get or create analysis
      const analysis = await getOrCreateAnalysis(id, config);
      res.json(analysis);
    } catch (error) {
      let message = "Error analyzing file";
      if (error instanceof z.ZodError) {
        message = `Validation error: ${error.errors.map(e => e.message).join(", ")}`;
      } else if (error instanceof Error) {
        message = error.message;
      }
      res.status(400).json({ message });
    }
  });
  
  // Export analysis as JSON
  apiRouter.get("/files/:id/export/json", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const analysis = await storage.getLatestAnalysisResultByFileId(id);
      
      if (!analysis) {
        return res.status(404).json({ message: `No analysis found for file with ID ${id}` });
      }
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=analysis-${id}.json`);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: `Error exporting analysis: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });
  
  // Export analysis as Markdown
  apiRouter.get("/files/:id/export/markdown", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const analysis = await storage.getLatestAnalysisResultByFileId(id);
      const file = await storage.getCobolFile(id);
      
      if (!analysis || !file) {
        return res.status(404).json({ message: `Analysis or file not found for ID ${id}` });
      }
      
      // Generate markdown content
      const markdown = generateMarkdownReport(file, analysis);
      
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename=analysis-${id}.md`);
      res.send(markdown);
    } catch (error) {
      res.status(500).json({ message: `Error exporting analysis: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });
  
  // Export analysis as PDF placeholder - in a real implementation this would generate a PDF
  apiRouter.get("/files/:id/export/pdf", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const analysis = await storage.getLatestAnalysisResultByFileId(id);
      
      if (!analysis) {
        return res.status(404).json({ message: `No analysis found for file with ID ${id}` });
      }
      
      // In a real implementation, we would generate a PDF here
      // For simplicity, we'll return a simple text response
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename=analysis-${id}.txt`);
      res.send(`COBOL SME Agent Analysis for file ID ${id}\n\nSee JSON or Markdown export for full details.`);
    } catch (error) {
      res.status(500).json({ message: `Error exporting analysis: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });
  
  // Analyze relationships across all files in the project (project-wide analysis)
  apiRouter.post("/project/analyze", async (req: Request, res: Response) => {
    try {
      // Parse and validate the AI configuration
      let config = aiConfigSchema.parse({
        modelTemperature: req.body.modelTemperature || 0.7,
        contextWindow: req.body.contextWindow || 4096,
        detailLevel: req.body.detailLevel || "Standard",
        modelName: req.body.modelName || "llama3-8b"
      });
      
      // Run the project-wide analysis
      const analysis = await analyzeProjectRelationships(config);
      res.json(analysis);
    } catch (error) {
      let message = "Error analyzing project";
      if (error instanceof z.ZodError) {
        message = `Validation error: ${error.errors.map(e => e.message).join(", ")}`;
      } else if (error instanceof Error) {
        message = error.message;
      }
      res.status(400).json({ message });
    }
  });
  
  // Get the latest project analysis
  apiRouter.get("/project/analysis", async (req: Request, res: Response) => {
    try {
      const analysis = await storage.getLatestProjectAnalysis();
      
      if (!analysis) {
        return res.status(404).json({ message: "No project analysis found. Please run a project analysis first." });
      }
      
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: `Error retrieving project analysis: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });
  
  // Export project analysis as JSON
  apiRouter.get("/project/export/json", async (req: Request, res: Response) => {
    try {
      const analysis = await storage.getLatestProjectAnalysis();
      
      if (!analysis) {
        return res.status(404).json({ message: "No project analysis found. Please run a project analysis first." });
      }
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=project-analysis.json');
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: `Error exporting project analysis: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });
  
  // Export project analysis as Markdown
  apiRouter.get("/project/export/markdown", async (req: Request, res: Response) => {
    try {
      const analysis = await storage.getLatestProjectAnalysis();
      
      if (!analysis) {
        return res.status(404).json({ message: "No project analysis found. Please run a project analysis first." });
      }
      
      // Generate markdown for the project
      let markdown = "# COBOL Project Analysis\n\n";
      
      // Add project synopsis if available (removing HTML tags)
      if (analysis.projectSynopsis) {
        const synopsisText = analysis.projectSynopsis
          .replace(/<h3[^>]*>/g, '## ')
          .replace(/<h4[^>]*>/g, '### ')
          .replace(/<h5[^>]*>/g, '#### ')
          .replace(/<\/h[3-5]>/g, '\n\n')
          .replace(/<[^>]*>/g, '');
        
        markdown += synopsisText + "\n\n";
      }
      
      // Add relationships information
      markdown += "## Program Relationships\n\n";
      
      if (analysis.projectRelationships && analysis.projectRelationships.length > 0) {
        const callRelationships = analysis.projectRelationships.filter(r => r.type === 'Calls');
        
        markdown += "### Program Calls\n\n";
        
        for (const rel of callRelationships) {
          markdown += `- ${rel.source} calls ${rel.target}: ${rel.description || ''}\n`;
        }
      } else {
        markdown += "No relationships found between programs.\n\n";
      }
      
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', 'attachment; filename=project-analysis.md');
      res.send(markdown);
    } catch (error) {
      res.status(500).json({ message: `Error exporting project analysis: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });
  
  // Endpoint to set OpenAI API key
  apiRouter.post("/set-openai-key", async (req: Request, res: Response) => {
    try {
      const { key } = req.body;
      
      if (!key) {
        return res.status(400).json({ message: "API key is required" });
      }
      
      // Set environment variable for OpenAI API key
      process.env.OPENAI_API_KEY = key;
      
      console.log("OpenAI API key set successfully");
      res.json({ message: "OpenAI API key set successfully" });
    } catch (error) {
      console.error("Error setting OpenAI API key:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  
  // Neo4j database configuration
  apiRouter.post("/neo4j/configure", async (req: Request, res: Response) => {
    try {
      const { uri, username, password } = req.body;
      
      if (!uri || !username || !password) {
        return res.status(400).json({ 
          message: "Neo4j configuration requires uri, username, and password" 
        });
      }
      
      // Import the Neo4j service here to avoid circular dependency
      const { neo4jService } = await import('./neo4j-service');
      
      // Attempt to configure the connection
      const success = await neo4jService.configureConnection({ uri, username, password });
      
      if (success) {
        res.json({ 
          message: "Neo4j connection configured successfully", 
          status: "connected" 
        });
      } else {
        res.status(400).json({ 
          message: "Failed to connect to Neo4j with provided credentials", 
          status: "error" 
        });
      }
    } catch (error) {
      console.error("Error configuring Neo4j:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Unknown error", 
        status: "error" 
      });
    }
  });
  
  // Get Neo4j connection status
  apiRouter.get("/neo4j/status", async (req: Request, res: Response) => {
    try {
      // Import the Neo4j service here to avoid circular dependency
      const { neo4jService } = await import('./neo4j-service');
      
      // Check if we're using in-memory storage
      const isUsingInMemory = neo4jService.isUsingInMemory();
      
      // Get connection configuration (but don't return password)
      const config = await storage.getNeo4jConfig();
      const configInfo = config ? { 
        uri: config.uri, 
        username: config.username 
      } : null;
      
      res.json({
        status: isUsingInMemory ? "in-memory" : "connected",
        config: configInfo
      });
    } catch (error) {
      console.error("Error checking Neo4j status:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Unknown error", 
        status: "error" 
      });
    }
  });
  
  // Switch Neo4j to in-memory mode
  apiRouter.post("/neo4j/use-in-memory", async (req: Request, res: Response) => {
    try {
      // Import the Neo4j service here to avoid circular dependency
      const { neo4jService } = await import('./neo4j-service');
      
      // Switch to in-memory mode
      await neo4jService.useInMemoryMode();
      
      res.json({ 
        message: "Switched to in-memory mode for Neo4j", 
        status: "in-memory" 
      });
    } catch (error) {
      console.error("Error switching to in-memory mode:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Unknown error", 
        status: "error" 
      });
    }
  });
  
  // Get graph data from Neo4j for visualization
  apiRouter.get("/neo4j/graph", async (req: Request, res: Response) => {
    try {
      // Import the Neo4j service
      const { neo4jService } = await import('./neo4j-service');
      
      // Get the complete graph
      const graphData = await neo4jService.getGraph();
      
      // Apply filtering if query parameters are provided
      const { entityTypes, relationshipTypes } = req.query;
      
      let filteredEntities = graphData.entities;
      let filteredRelationships = graphData.relationships;
      
      // Filter by entity types if specified
      if (entityTypes) {
        const types = (entityTypes as string).split(',');
        filteredEntities = graphData.entities.filter(entity => 
          types.includes(entity.type)
        );
        
        // Only keep relationships where both source and target entities are included
        const entityIds = new Set(filteredEntities.map(e => e.id));
        filteredRelationships = graphData.relationships.filter(rel =>
          entityIds.has(rel.source) && entityIds.has(rel.target)
        );
      }
      
      // Filter by relationship types if specified
      if (relationshipTypes) {
        const types = (relationshipTypes as string).split(',');
        filteredRelationships = filteredRelationships.filter(rel =>
          types.includes(rel.type)
        );
      }
      
      res.json({
        entities: filteredEntities,
        relationships: filteredRelationships
      });
    } catch (error) {
      console.error("Error retrieving Neo4j graph data:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // AI Explanation API endpoints
  // Explain code structure
  apiRouter.get("/explain/structure/:analysisId", async (req: Request, res: Response) => {
    try {
      const analysisId = parseInt(req.params.analysisId);
      if (isNaN(analysisId)) {
        return res.status(400).json({ error: "Invalid analysis ID" });
      }
      
      // Get the analysis result
      const analysis = await storage.getAnalysisResult(analysisId);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }
      
      // Parse the code structure from the analysis result
      const codeStructure = JSON.parse(analysis.codeStructure as string);
      
      // Get AI config from query params or use defaults
      const aiConfig = aiConfigSchema.parse({
        modelName: req.query.model || "llama3-8b",
        modelTemperature: parseFloat(req.query.temperature as string) || 0.7,
        contextWindow: parseInt(req.query.contextWindow as string) || 4096,
        detailLevel: req.query.detailLevel || "Standard"
      });
      
      // Generate explanation
      const explanation = await explainCodeStructure(codeStructure, aiConfig);
      
      // Return the explanation
      res.json({ explanation });
    } catch (error) {
      console.error("Error generating code structure explanation:", error);
      res.status(500).json({ 
        error: "Failed to generate explanation",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Explain entity
  apiRouter.get("/explain/entity/:entityId", async (req: Request, res: Response) => {
    try {
      const entityId = req.params.entityId;
      const analysisId = parseInt(req.query.analysisId as string);
      
      if (isNaN(analysisId)) {
        return res.status(400).json({ error: "Invalid analysis ID" });
      }
      
      // Get the analysis result
      const analysis = await storage.getAnalysisResult(analysisId);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }
      
      // Parse entities and relationships from the analysis result
      const entities = JSON.parse(analysis.entities as string) as Entity[];
      const relationships = JSON.parse(analysis.relationships as string);
      
      // Find the entity
      const entity = entities.find(e => e.id === entityId);
      if (!entity) {
        return res.status(404).json({ error: "Entity not found" });
      }
      
      // Get AI config from query params or use defaults
      const aiConfig = aiConfigSchema.parse({
        modelName: req.query.model || "llama3-8b",
        modelTemperature: parseFloat(req.query.temperature as string) || 0.7,
        contextWindow: parseInt(req.query.contextWindow as string) || 4096,
        detailLevel: req.query.detailLevel || "Standard"
      });
      
      // Generate explanation
      const explanation = await explainEntity(entity, relationships, aiConfig);
      
      // Return the explanation
      res.json({ explanation });
    } catch (error) {
      console.error("Error generating entity explanation:", error);
      res.status(500).json({ 
        error: "Failed to generate explanation",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Code assistant endpoint
  apiRouter.post("/explain/code-assistant", async (req: Request, res: Response) => {
    try {
      const { fileId, cobolCode, userQuery, aiConfig } = req.body;
      
      if (!fileId || !cobolCode || !userQuery) {
        return res.status(400).json({ error: "Missing required parameters" });
      }
      
      // Get AI config from request or use defaults
      const config = aiConfigSchema.parse({
        modelName: aiConfig?.modelName || "llama3-8b",
        modelTemperature: aiConfig?.modelTemperature || 0.7,
        contextWindow: aiConfig?.contextWindow || 4096,
        detailLevel: aiConfig?.detailLevel || "Standard"
      });
      
      // Use the OpenAI service for explanation
      // Import the service dynamically to avoid circular dependency
      const { explainCobolCode } = await import('./openai');
      
      // Format the prompt for the AI
      const prompt = `
COBOL CODE:
${cobolCode}

USER QUESTION: ${userQuery}

Please provide a detailed and helpful response to the user's question about this COBOL code.
Explain concepts clearly and accurately. If you're not sure about something, acknowledge it.
Focus on giving practical, educational responses that help the user understand COBOL better.
      `;
      
      // Get AI explanation
      const explanation = await explainCobolCode(prompt, config);
      
      // Return the explanation
      res.json({ explanation });
    } catch (error) {
      console.error("Error generating code assistant response:", error);
      res.status(500).json({ 
        error: "Failed to generate response",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Explain overall analysis
  apiRouter.get("/explain/analysis/:analysisId", async (req: Request, res: Response) => {
    try {
      const analysisId = parseInt(req.params.analysisId);
      if (isNaN(analysisId)) {
        return res.status(400).json({ error: "Invalid analysis ID" });
      }
      
      // Get the analysis result
      const analysis = await storage.getAnalysisResult(analysisId);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }
      
      // Reconstruct the analysis report
      const analysisReport: AnalysisReport = {
        codeStructure: JSON.parse(analysis.codeStructure as string),
        codeQuality: JSON.parse(analysis.codeQuality as string),
        entities: JSON.parse(analysis.entities as string),
        issues: JSON.parse(analysis.issues as string),
        relationships: JSON.parse(analysis.relationships as string),
        processingTime: analysis.processingTime,
        tokensUsed: analysis.tokensUsed
      };
      
      // Get AI config from query params or use defaults
      const aiConfig = aiConfigSchema.parse({
        modelName: req.query.model || "llama3-8b",
        modelTemperature: parseFloat(req.query.temperature as string) || 0.7,
        contextWindow: parseInt(req.query.contextWindow as string) || 4096,
        detailLevel: req.query.detailLevel || "Standard"
      });
      
      // Generate explanation
      const explanation = await explainAnalysis(analysisReport, aiConfig);
      
      // Return the explanation
      res.json({ explanation });
    } catch (error) {
      console.error("Error generating overall analysis explanation:", error);
      res.status(500).json({ 
        error: "Failed to generate explanation",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Register API routes
  app.use("/api", apiRouter);
  
  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to generate a markdown report
function generateMarkdownReport(file: any, analysis: any): string {
  const codeStructure = analysis.codeStructure;
  const codeQuality = analysis.codeQuality;
  const entities = analysis.entities;
  const issues = analysis.issues;
  
  return `# COBOL SME Agent Report: ${file.filename}

## Summary

- **Lines of Code:** ${codeStructure.loc}
- **Procedures:** ${codeStructure.procedures}
- **Data Items:** ${codeStructure.dataItems}
- **File Sections:** ${codeStructure.fileSections}
- **COBOL Dialect:** ${codeStructure.cobolDialect}

## Code Quality

- **Maintainability:** ${codeQuality.maintainability.rating} (${codeQuality.maintainability.score}/100)
- **Documentation:** ${codeQuality.documentation.rating} (${codeQuality.documentation.score}/100)
- **Complexity:** ${codeQuality.complexity.rating} (${codeQuality.complexity.score}/100)

## Entities

${entities.map((entity: any) => `
### ${entity.name}
- **Type:** ${entity.type}
- **Description:** ${entity.description}
- **Key Operations:**
${entity.operations.map((op: string) => `  - ${op}`).join('\n')}
`).join('\n')}

## Potential Issues

${issues.map((issue: any) => `
### ${issue.type} (${issue.severity})
- **Location:** ${issue.location}
- **Description:** ${issue.description}
`).join('\n')}

## Analysis Metadata

- **Analysis Date:** ${analysis.createdAt}
- **Model Used:** ${analysis.modelUsed}
- **Processing Time:** ${analysis.processingTime}ms
- **Tokens Used:** ${analysis.tokensUsed}

`;
}
