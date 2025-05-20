import OpenAI from "openai";
import { AIConfig } from "@shared/schema";

// Initialize OpenAI client only when we need it
let openai: OpenAI | null = null;

function getOpenAIClient() {
  // Only initialize if not already initialized or if API key has changed
  if (!openai && process.env.OPENAI_API_KEY) {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  
  if (!openai) {
    throw new Error("OpenAI API key is not set. Please provide your OpenAI API key to use this feature.");
  }
  
  return openai;
}

/**
 * Analyze COBOL code using OpenAI's GPT-4o model
 * @param cobolCode The COBOL code to analyze
 * @param config AI configuration parameters
 * @returns Analysis results in structured format
 */
export async function analyzeCobolWithOpenAI(cobolCode: string, config: AIConfig) {
  console.log(`Analyzing COBOL code with OpenAI GPT-4o (temperature: ${config.modelTemperature})`);
  
  // Define our analysis prompt
  const prompt = `
You are an expert COBOL analyzer with deep mainframe and legacy systems knowledge. Analyze the following COBOL code and extract its structure, quality metrics, entities, relationships, and potential issues.

I need a detailed analysis with the following components:
1. Code Structure (lines of code, number of procedures, data items, file sections, COBOL dialect)
2. Code Quality Assessment (maintainability score 0-100, documentation score 0-100, complexity score 0-100)
3. Entities in the code (Programs, Databases, APIs, Files, Screens, etc.)
4. Relationships between entities (Calls, Reads, Writes, Contains, Uses, DependsOn)
5. Potential issues or refactoring opportunities
6. Data elements (input and output)
7. Database details (if applicable)
8. Program interfaces and calling chain information

${config.detailLevel === 'Detailed' ? 'Please provide extremely detailed analysis with all possible information you can extract.' : 
  config.detailLevel === 'Basic' ? 'Please provide a basic overview with key information only.' : 
  'Please provide standard level of detail in your analysis.'}

Respond in JSON format with the exact structure shown in the example.

Here's the COBOL code to analyze:

\`\`\`cobol
${cobolCode}
\`\`\`

Return ONLY valid JSON in this exact structure:
{
  "codeStructure": {
    "loc": number,
    "procedures": number,
    "dataItems": number,
    "fileSections": number,
    "cobolDialect": string
  },
  "codeQuality": {
    "maintainability": {
      "score": number,
      "rating": "Good" | "Fair" | "Poor"
    },
    "documentation": {
      "score": number,
      "rating": "Good" | "Fair" | "Poor"
    },
    "complexity": {
      "score": number,
      "rating": "Low" | "Medium" | "High"
    }
  },
  "entities": [
    {
      "id": string,
      "name": string,
      "type": "Program" | "Database" | "API" | "File" | "Screen" | "Procedure" | "DataElement",
      "description": string,
      "operations": string[],
      "details": object (optional)
    }
  ],
  "relationships": [
    {
      "id": string,
      "source": string,
      "target": string,
      "type": "Calls" | "CalledBy" | "Reads" | "Writes" | "Contains" | "Uses" | "DependsOn",
      "description": string
    }
  ],
  "issues": [
    {
      "type": string,
      "severity": "warning" | "error" | "info",
      "description": string,
      "location": string
    }
  ],
  "inputDataElements": [
    {
      "name": string,
      "type": string,
      "description": string,
      "isInput": boolean,
      "isOutput": boolean
    }
  ],
  "outputDataElements": [
    {
      "name": string,
      "type": string,
      "description": string,
      "isInput": boolean,
      "isOutput": boolean
    }
  ],
  "databases": [
    {
      "name": string,
      "type": string,
      "operations": ["read" | "update" | "delete" | "insert"],
      "tables": string[]
    }
  ],
  "callingChain": {
    "sourceInterfaces": [
      {
        "type": "API" | "Database" | "Screen" | "File" | "Kafka" | "Queue" | "Program",
        "name": string,
        "direction": "input" | "output" | "both",
        "description": string
      }
    ],
    "destinationInterfaces": [
      {
        "type": "API" | "Database" | "Screen" | "File" | "Kafka" | "Queue" | "Program",
        "name": string,
        "direction": "input" | "output" | "both",
        "description": string
      }
    ],
    "flow": [
      {
        "id": string,
        "name": string,
        "type": "Program" | "Database" | "API" | "File" | "Screen" | "Procedure" | "DataElement",
        "description": string,
        "operations": string[]
      }
    ]
  }
}
`;

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o", // Always use the latest GPT-4o model
      messages: [
        { role: "system", content: "You are a COBOL analysis expert that provides detailed insights about legacy code." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: config.modelTemperature,
      max_tokens: Math.min(config.contextWindow, 4096), // Use user's context window or max 4096
    });

    // Extract the content and parse as JSON
    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error("No response content returned from OpenAI");
    }
    
    // Add token usage metrics
    const result = JSON.parse(content);
    const totalTokens = response.usage?.total_tokens || 0;
    const promptTokens = response.usage?.prompt_tokens || 0;
    const completionTokens = response.usage?.completion_tokens || 0;
    
    // Calculate processing time (this is an estimate)
    const processingTime = Math.floor(totalTokens / 1000) + 2; // ~2 seconds + 1 second per 1000 tokens
    
    // Estimate cost (roughly based on GPT-4o pricing)
    const cost = (promptTokens / 1000 * 0.01) + (completionTokens / 1000 * 0.03);
    
    return {
      ...result,
      processingTime,
      tokensUsed: totalTokens,
      estimatedCost: cost,
      modelUsed: "gpt-4o",
    };
  } catch (error: any) {
    console.error("Error in OpenAI analysis:", error);
    throw new Error(`OpenAI analysis failed: ${error.message}`);
  }
}

/**
 * Analyze relationships between COBOL files using OpenAI
 * @param files Array of COBOL files with their content
 * @param config AI configuration parameters
 * @returns Analysis of relationships between files
 */
export async function analyzeCobolRelationships(files: { id: number, filename: string, content: string }[], config: AIConfig) {
  console.log(`Analyzing relationships between ${files.length} COBOL files with OpenAI GPT-4o`);
  
  // For large numbers of files, we need to be strategic about how we analyze them
  if (files.length > 5) {
    console.log("Large file set detected, performing summarized analysis");
    // For many files, create summaries first
    const fileSummaries = files.map(file => {
      return `File ID ${file.id} - ${file.filename}: 
      First 30 lines: ${file.content.split('\n').slice(0, 30).join('\n')}
      ...
      ${file.content.split('\n').length > 60 ? 'Last 30 lines: ' + file.content.split('\n').slice(-30).join('\n') : ''}`;
    }).join('\n\n---FILE SEPARATOR---\n\n');
    
    const prompt = `
You are an expert COBOL analyzer with deep mainframe and legacy systems knowledge. Analyze these COBOL file summaries and identify relationships between files.

Focus specifically on:
1. Program calls between files
2. Shared copybooks or includes
3. Database tables accessed by multiple programs
4. Data passed between programs
5. Program hierarchies and dependencies

${config.detailLevel === 'Detailed' ? 'Please provide extremely detailed analysis with all possible relationships.' : 
  config.detailLevel === 'Basic' ? 'Please provide only the most important relationships.' : 
  'Please provide standard level of detail in your analysis.'}

Here are summaries of the COBOL files:

${fileSummaries}

Return ONLY valid JSON with your analysis in this exact structure:
{
  "projectRelationships": [
    {
      "id": string,
      "source": string (should reference file ID like "file-1"),
      "target": string (should reference another file ID like "file-2"),
      "type": "Calls" | "CalledBy" | "Reads" | "Writes" | "Contains" | "Uses" | "DependsOn",
      "description": string (explain the relationship)
    }
  ],
  "codeStructure": {
    "loc": number,
    "procedures": number,
    "dataItems": number,
    "fileSections": number,
    "cobolDialect": string
  },
  "entities": [
    {
      "id": string,
      "name": string,
      "type": "Program" | "Database" | "API" | "File" | "Screen" | "Procedure" | "DataElement",
      "description": string,
      "operations": string[]
    }
  ],
  "relationships": [
    {
      "id": string,
      "source": string,
      "target": string,
      "type": "Calls" | "CalledBy" | "Reads" | "Writes" | "Contains" | "Uses" | "DependsOn",
      "description": string
    }
  ],
  "issues": [
    {
      "type": string,
      "severity": "warning" | "error" | "info",
      "description": string,
      "location": string
    }
  ]
}
`;

    try {
      const client = getOpenAIClient();
      const response = await client.chat.completions.create({
        model: "gpt-4o", // Always use the latest GPT-4o model
        messages: [
          { role: "system", content: "You are a COBOL analysis expert that identifies relationships between programs." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: config.modelTemperature,
        max_tokens: Math.min(config.contextWindow, 4096),
      });
  
      const content = response.choices[0].message.content;
      
      if (!content) {
        throw new Error("No response content returned from OpenAI");
      }
      
      // Parse the response and add metadata
      const result = JSON.parse(content);
      const totalTokens = response.usage?.total_tokens || 0;
      const processingTime = Math.floor(totalTokens / 1000) + 2;
      
      return {
        ...result,
        processingTime,
        tokensUsed: totalTokens,
        isProjectWide: true,
        modelUsed: "gpt-4o",
      };
    } catch (error: any) {
      console.error("Error in OpenAI relationship analysis:", error);
      throw new Error(`OpenAI relationship analysis failed: ${error.message}`);
    }
  } else {
    // For a small number of files, we can analyze them in more detail
    const fileContents = files.map(file => {
      return `File ID ${file.id} - ${file.filename}:\n\n\`\`\`cobol\n${file.content}\n\`\`\``;
    }).join('\n\n---FILE SEPARATOR---\n\n');
    
    const prompt = `
You are an expert COBOL analyzer with deep mainframe and legacy systems knowledge. Analyze these COBOL files and identify relationships between them.

Focus specifically on:
1. Program calls between files
2. Shared copybooks or includes
3. Database tables accessed by multiple programs
4. Data passed between programs
5. Program hierarchies and dependencies

${config.detailLevel === 'Detailed' ? 'Please provide extremely detailed analysis with all possible relationships.' : 
  config.detailLevel === 'Basic' ? 'Please provide only the most important relationships.' : 
  'Please provide standard level of detail in your analysis.'}

Here are the COBOL files:

${fileContents}

Return ONLY valid JSON with your analysis in this exact structure:
{
  "projectRelationships": [
    {
      "id": string,
      "source": string (should reference file ID like "file-1"),
      "target": string (should reference another file ID like "file-2"),
      "type": "Calls" | "CalledBy" | "Reads" | "Writes" | "Contains" | "Uses" | "DependsOn",
      "description": string (explain the relationship)
    }
  ],
  "codeStructure": {
    "loc": number,
    "procedures": number,
    "dataItems": number,
    "fileSections": number,
    "cobolDialect": string
  },
  "entities": [
    {
      "id": string,
      "name": string,
      "type": "Program" | "Database" | "API" | "File" | "Screen" | "Procedure" | "DataElement",
      "description": string,
      "operations": string[]
    }
  ],
  "relationships": [
    {
      "id": string,
      "source": string,
      "target": string,
      "type": "Calls" | "CalledBy" | "Reads" | "Writes" | "Contains" | "Uses" | "DependsOn",
      "description": string
    }
  ],
  "issues": [
    {
      "type": string,
      "severity": "warning" | "error" | "info",
      "description": string,
      "location": string
    }
  ]
}
`;

    try {
      const client = getOpenAIClient();
      const response = await client.chat.completions.create({
        model: "gpt-4o", // Always use the latest GPT-4o model
        messages: [
          { role: "system", content: "You are a COBOL analysis expert that identifies relationships between programs." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: config.modelTemperature,
        max_tokens: Math.min(config.contextWindow, 4096),
      });
  
      const content = response.choices[0].message.content;
      
      if (!content) {
        throw new Error("No response content returned from OpenAI");
      }
      
      // Parse the response and add metadata
      const result = JSON.parse(content);
      const totalTokens = response.usage?.total_tokens || 0;
      const processingTime = Math.floor(totalTokens / 1000) + 2;
      
      return {
        ...result,
        processingTime,
        tokensUsed: totalTokens,
        isProjectWide: true,
        modelUsed: "gpt-4o",
      };
    } catch (error: any) {
      console.error("Error in OpenAI relationship analysis:", error);
      throw new Error(`OpenAI relationship analysis failed: ${error.message}`);
    }
  }
}

/**
 * Generate natural language explanations for COBOL code
 * @param cobolCode The COBOL code to explain
 * @param config AI configuration parameters
 * @returns Natural language explanation of the code
 */
export async function explainCobolCode(cobolCode: string, config: AIConfig) {
  const prompt = `
Explain this COBOL code in clear, natural language. Describe:
1. The main purpose of the program
2. Key business logic
3. Data flow
4. Any notable patterns or design decisions

${config.detailLevel === 'Detailed' ? 'Provide a very detailed explanation with technical insights.' : 
  config.detailLevel === 'Basic' ? 'Provide a simple, high-level explanation for non-technical readers.' : 
  'Provide a balanced explanation with some technical details.'}

Here is the COBOL code:

\`\`\`cobol
${cobolCode}
\`\`\`
`;

  try {
    // Check if we can use OpenAI API
    if (process.env.OPENAI_API_KEY) {
      try {
        const client = getOpenAIClient();
        const response = await client.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "You are a COBOL expert who explains legacy code clearly to both technical and non-technical audiences." },
            { role: "user", content: prompt }
          ],
          temperature: config.modelTemperature,
          max_tokens: Math.min(config.contextWindow, 4096),
        });
    
        return {
          explanation: response.choices[0].message.content,
          tokensUsed: response.usage?.total_tokens || 0
        };
      } catch (error: any) {
        console.error("Error using OpenAI for explanation:", error);
        // Fall through to use local model
      }
    }
    
    // Use local model implementation as fallback
    console.log(`Using local model ${config.modelName || 'default'} for code explanation...`);
    const explanation = generateLocalExplanation(cobolCode);
    
    return {
      explanation,
      tokensUsed: 0, // No tokens used for local model
      isLocalModel: true
    };
  } catch (error: any) {
    console.error("Error explaining COBOL code:", error);
    throw new Error(`Failed to explain COBOL code: ${error.message}`);
  }
}

/**
 * Generate an explanation of COBOL code using local pattern matching as a fallback
 * when OpenAI is not available or fails
 */
function generateLocalExplanation(cobolCode: string): string {
  // Extract program name if available
  const programIdMatch = cobolCode.match(/PROGRAM-ID\s*\.\s*([A-Z0-9-]+)/i);
  const programName = programIdMatch ? programIdMatch[1] : "this program";
  
  // Detect if this contains a user question
  const containsQuestion = cobolCode.includes("?") && cobolCode.split("\n").length < 5;
  
  if (containsQuestion) {
    // Handle user question about COBOL
    return `
I'll do my best to answer your question about COBOL based on my understanding of mainframe systems and COBOL programming concepts.

Your question appears to be about COBOL code or concepts. As a specialized COBOL analysis tool, I can tell you that COBOL (Common Business-Oriented Language) is primarily used for business, finance, and administrative systems for companies and governments. The language is designed to be readable and self-documenting.

While I can't provide the exact answer without more context about the specific code you're working with, I can suggest looking at the relevant sections of your COBOL program:

1. For data structures, check the DATA DIVISION and WORKING-STORAGE SECTION
2. For business logic, examine the PROCEDURE DIVISION
3. For file operations, review the FILE SECTION and related READ/WRITE statements
4. For program interactions, look for CALL statements and LINKAGE SECTION

If you need more specific help, consider uploading the complete COBOL program for analysis, and I can provide more detailed insights about its structure and functionality.
    `;
  }
  
  // Check for common divisions
  const hasProcedureDivision = cobolCode.includes("PROCEDURE DIVISION");
  const hasDataDivision = cobolCode.includes("DATA DIVISION");
  const hasWorkingStorage = cobolCode.includes("WORKING-STORAGE SECTION");
  const hasFileSection = cobolCode.includes("FILE SECTION");
  const hasLinkageSection = cobolCode.includes("LINKAGE SECTION");
  
  // Check for common operations
  const hasFileOps = cobolCode.match(/(READ|WRITE|OPEN|CLOSE)\s+[A-Z0-9-]+/gi);
  const hasCalls = cobolCode.match(/CALL\s+['"A-Z0-9-]+/gi);
  const hasSQL = cobolCode.includes("EXEC SQL");
  const hasConditions = cobolCode.match(/IF\s+.+\s+THEN/gi);
  const hasMoves = cobolCode.match(/MOVE\s+.+\s+TO\s+.+/gi);
  
  // Build explanation based on detected features
  let explanation = `
Based on my analysis, ${programName} appears to be a COBOL program that `;
  
  if (hasFileOps) {
    explanation += `performs file operations (${hasFileOps.length} detected). `;
  } else if (hasSQL) {
    explanation += `interacts with a database using embedded SQL. `;
  } else if (hasCalls && hasCalls.length > 0) {
    explanation += `calls other programs or subprograms (${hasCalls.length} calls detected). `;
  } else {
    explanation += `performs data processing tasks. `;
  }
  
  explanation += `\n\nThe program structure includes `;
  const divisions = [];
  if (hasDataDivision) divisions.push("DATA DIVISION");
  if (hasProcedureDivision) divisions.push("PROCEDURE DIVISION");
  explanation += divisions.join(" and ") + ". ";
  
  if (hasWorkingStorage) {
    explanation += `It defines variables and constants in the WORKING-STORAGE SECTION. `;
  }
  
  if (hasFileSection) {
    explanation += `It works with files defined in the FILE SECTION. `;
  }
  
  if (hasLinkageSection) {
    explanation += `It receives parameters from or returns values to other programs via the LINKAGE SECTION. `;
  }
  
  if (hasConditions && hasConditions.length > 0) {
    explanation += `\n\nThe program includes ${hasConditions.length} conditional logic statements, making decisions based on data values. `;
  }
  
  if (hasMoves && hasMoves.length > 0) {
    explanation += `It performs data movement operations with ${hasMoves.length} MOVE statements, transferring values between variables. `;
  }
  
  explanation += `\n\nTo get more detailed analysis, you might want to run a full analysis on this code using the analysis features or provide specific questions about parts of the code you're interested in.`;
  
  return explanation;
}