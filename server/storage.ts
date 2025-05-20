import { 
  users, type User, type InsertUser,
  cobolFiles, type CobolFile, type InsertCobolFile,
  analysisResults, type AnalysisResult, type InsertAnalysisResult,
  type CodeStructure, type CodeQuality, type Entity, type Issue, type Relationship, type AIConfig
} from "@shared/schema";

// Storage interface for all entities
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // COBOL file methods
  getCobolFile(id: number): Promise<CobolFile | undefined>;
  getCobolFiles(): Promise<CobolFile[]>;
  createCobolFile(file: InsertCobolFile): Promise<CobolFile>;
  deleteCobolFile(id: number): Promise<boolean>;
  deleteAllCobolFiles(): Promise<boolean>;
  
  // Analysis methods
  getAnalysisResult(id: number): Promise<AnalysisResult | undefined>;
  getAnalysisResultsByFileId(fileId: number): Promise<AnalysisResult[]>;
  createAnalysisResult(result: InsertAnalysisResult): Promise<AnalysisResult>;
  deleteAnalysisResult(id: number): Promise<boolean>;
  getLatestAnalysisResultByFileId(fileId: number): Promise<AnalysisResult | undefined>;
  
  // Neo4j configuration
  setNeo4jConfig(config: { uri: string, username: string, password: string }): Promise<boolean>;
  getNeo4jConfig(): Promise<{ uri: string, username: string, password: string } | undefined>;
  
  // Project-wide analysis methods
  saveProjectAnalysis(analysis: any): Promise<void>;
  getLatestProjectAnalysis(): Promise<any | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private cobolFiles: Map<number, CobolFile>;
  private analysisResults: Map<number, AnalysisResult>;
  private currentUserId: number;
  private currentFileId: number;
  private currentAnalysisId: number;
  private neo4jConfig?: { uri: string, username: string, password: string };
  private latestProjectAnalysis?: any;

  constructor() {
    this.users = new Map();
    this.cobolFiles = new Map();
    this.analysisResults = new Map();
    this.currentUserId = 1;
    this.currentFileId = 1;
    this.currentAnalysisId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // COBOL file methods
  async getCobolFile(id: number): Promise<CobolFile | undefined> {
    return this.cobolFiles.get(id);
  }

  async getCobolFiles(): Promise<CobolFile[]> {
    return Array.from(this.cobolFiles.values());
  }

  async createCobolFile(insertFile: InsertCobolFile): Promise<CobolFile> {
    const id = this.currentFileId++;
    const file: CobolFile = { 
      ...insertFile, 
      id, 
      uploadedAt: new Date(),
      isValid: 'isValid' in insertFile ? insertFile.isValid : null
    };
    this.cobolFiles.set(id, file);
    return file;
  }

  async deleteCobolFile(id: number): Promise<boolean> {
    const deleted = this.cobolFiles.delete(id);
    
    // Also delete associated analysis results
    for (const [analysisId, analysis] of this.analysisResults.entries()) {
      if (analysis.fileId === id) {
        this.analysisResults.delete(analysisId);
      }
    }
    
    return deleted;
  }
  
  async deleteAllCobolFiles(): Promise<boolean> {
    // Clear the files
    this.cobolFiles.clear();
    
    // Also clear all analysis results
    this.analysisResults.clear();
    
    // Clear the Neo4j graph
    try {
      // Import neo4jService here to avoid circular dependencies
      const { neo4jService } = require('./neo4j-service');
      await neo4jService.clearGraph();
    } catch (error) {
      console.error("Failed to clear Neo4j graph:", error);
      // Continue even if Neo4j clear fails
    }
    
    return true;
  }

  // Analysis methods
  async getAnalysisResult(id: number): Promise<AnalysisResult | undefined> {
    return this.analysisResults.get(id);
  }

  async getAnalysisResultsByFileId(fileId: number): Promise<AnalysisResult[]> {
    return Array.from(this.analysisResults.values())
      .filter(result => result.fileId === fileId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createAnalysisResult(insertResult: InsertAnalysisResult): Promise<AnalysisResult> {
    const id = this.currentAnalysisId++;
    const result: AnalysisResult = {
      ...insertResult,
      id,
      createdAt: new Date(),
    };
    this.analysisResults.set(id, result);
    return result;
  }

  async deleteAnalysisResult(id: number): Promise<boolean> {
    return this.analysisResults.delete(id);
  }

  async getLatestAnalysisResultByFileId(fileId: number): Promise<AnalysisResult | undefined> {
    const results = await this.getAnalysisResultsByFileId(fileId);
    return results.length > 0 ? results[0] : undefined;
  }
  
  // Neo4j configuration methods
  async setNeo4jConfig(config: { uri: string, username: string, password: string }): Promise<boolean> {
    this.neo4jConfig = config;
    return true;
  }
  
  async getNeo4jConfig(): Promise<{ uri: string, username: string, password: string } | undefined> {
    return this.neo4jConfig;
  }
  
  // Project-wide analysis methods
  async saveProjectAnalysis(analysis: any): Promise<void> {
    this.latestProjectAnalysis = {
      ...analysis,
      timestamp: new Date()
    };
  }
  
  async getLatestProjectAnalysis(): Promise<any | undefined> {
    return this.latestProjectAnalysis;
  }
}

export const storage = new MemStorage();
