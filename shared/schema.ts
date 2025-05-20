import { pgTable, text, serial, integer, json, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema unchanged
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// COBOL file storage
export const cobolFiles = pgTable("cobol_files", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  content: text("content").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  fileSize: integer("file_size").notNull(),
  isValid: boolean("is_valid"),
});

export const insertCobolFileSchema = createInsertSchema(cobolFiles).pick({
  filename: true,
  content: true,
  fileSize: true,
  isValid: true,
});

export type InsertCobolFile = z.infer<typeof insertCobolFileSchema>;
export type CobolFile = typeof cobolFiles.$inferSelect;

// Analysis results
export const analysisResults = pgTable("analysis_results", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  modelUsed: text("model_used").notNull(),
  modelTemperature: text("model_temperature").notNull(),
  contextWindow: integer("context_window").notNull(),
  detailLevel: text("detail_level").notNull(),
  processingTime: integer("processing_time").notNull(),
  tokensUsed: integer("tokens_used").notNull(),
  codeStructure: json("code_structure").notNull(),
  codeQuality: json("code_quality").notNull(),
  entities: json("entities").notNull(),
  issues: json("issues").notNull(),
  relationships: json("relationships").notNull(),
});

export const insertAnalysisResultSchema = createInsertSchema(analysisResults).pick({
  fileId: true,
  modelUsed: true,
  modelTemperature: true,
  contextWindow: true,
  detailLevel: true,
  processingTime: true,
  tokensUsed: true,
  codeStructure: true,
  codeQuality: true,
  entities: true,
  issues: true,
  relationships: true,
});

export type InsertAnalysisResult = z.infer<typeof insertAnalysisResultSchema>;
export type AnalysisResult = typeof analysisResults.$inferSelect;

// Types for analysis data
export type CodeStructure = {
  loc: number;
  procedures: number;
  dataItems: number;
  fileSections: number;
  cobolDialect: string;
};

export type CodeQuality = {
  maintainability: {
    score: number;
    rating: "Good" | "Fair" | "Poor";
  };
  documentation: {
    score: number;
    rating: "Good" | "Fair" | "Poor";
  };
  complexity: {
    score: number;
    rating: "Low" | "Medium" | "High";
  };
};

export type EntityType = 
  | "Program" 
  | "Subprogram"
  | "Function"
  | "Database" 
  | "API" 
  | "File" 
  | "Screen" 
  | "Kafka" 
  | "Queue" 
  | "Procedure" 
  | "DataElement"
  | "Table";

export type PropertyKeyValue = {
  key: string;
  value: string;
};

export type EntityMetric = {
  name: string;
  value: string | number;
};

export type Entity = {
  id: string;
  name: string;
  type: EntityType;
  description?: string;
  operations?: string[];
  details?: Record<string, any>;
  dialect?: string;
  properties?: PropertyKeyValue[];
  metrics?: EntityMetric[];
  sourceFile?: string;
};

export type DataElement = {
  name: string;
  type: string;
  description: string;
  isInput: boolean;
  isOutput: boolean;
};

export type InterfaceType = 
  | "API" 
  | "Database" 
  | "Screen" 
  | "File" 
  | "Kafka" 
  | "Queue" 
  | "Program";

export type ProgramInterface = {
  type: InterfaceType;
  name: string;
  direction: "input" | "output" | "both";
  description: string;
};

export type Issue = {
  type: string;
  severity: "warning" | "error" | "info";
  description: string;
  location: string;
};

export type RefactoringSuggestion = {
  id: string;
  title: string;
  description: string;
  currentCode: string;
  suggestedCode: string;
  location: string;
  severity: "low" | "medium" | "high";
  justification: string;
  benefit: string;
};

export type RelationshipType = 
  | "Calls" 
  | "CalledBy" 
  | "Reads" 
  | "Writes" 
  | "Contains" 
  | "Uses" 
  | "DependsOn"
  | "Invokes";

export type Relationship = {
  id: string;
  source: string;
  target: string;
  sourceId?: string; // For backward compatibility
  targetId?: string; // For backward compatibility
  type: RelationshipType;
  description?: string;
  data?: Record<string, any>;
  // Additional fields for UI display
  sourceName?: string;
  targetName?: string;
  sourceType?: string;
  targetType?: string;
};

export const aiConfigSchema = z.object({
  modelTemperature: z.number().min(0).max(1).default(0.7),
  contextWindow: z.number().default(4096),
  detailLevel: z.enum(["Basic", "Standard", "Detailed", "Expert"]).default("Standard"),
  modelName: z.string().default("llama3-8b"),
});

export type AIConfig = z.infer<typeof aiConfigSchema>;

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
  
  // Refactoring suggestions
  refactoringSuggestions?: RefactoringSuggestion[];
  
  // Project-wide data (only available when analyzing multiple files together)
  isProjectWide?: boolean;
  projectRelationships?: Relationship[];
  projectSynopsis?: string;
  projectPrograms?: {
    name: string;
    id: string;
    program_id: string;
    description: string;
  }[];
};
