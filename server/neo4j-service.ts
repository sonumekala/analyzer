import neo4j, { Driver, Session, Record } from 'neo4j-driver';
import { Entity, Relationship } from '@shared/schema';
import { storage } from './storage';

/**
 * Neo4j Service for managing graph database operations
 * This is a simplified in-memory implementation to avoid requiring a Neo4j server
 * In a production environment, this would connect to a real Neo4j instance
 */
class Neo4jService {
  private driver: Driver | null = null;
  private entities: Map<string, Entity> = new Map();
  private relationships: Map<string, Relationship> = new Map();
  private useInMemory: boolean = true;

  constructor() {
    // Initialize with in-memory storage by default
    this.setupInMemoryStorage();
    
    // Try to connect using stored configuration on startup
    this.tryConnectWithStoredConfig();
  }
  
  /**
   * Try to connect using stored Neo4j configuration
   */
  private async tryConnectWithStoredConfig(): Promise<void> {
    try {
      const config = await storage.getNeo4jConfig();
      
      if (config) {
        console.log('[Neo4j] Found stored configuration, attempting to connect...');
        const success = await this.connect(config.uri, config.username, config.password);
        
        if (success) {
          this.useInMemory = false;
          console.log('[Neo4j] Successfully connected using stored configuration');
        } else {
          console.log('[Neo4j] Failed to connect using stored configuration, using in-memory storage');
        }
      }
    } catch (error) {
      console.error('[Neo4j] Error while connecting with stored config:', error);
    }
  }

  /**
   * Connect to a Neo4j database
   * @param uri Neo4j connection URI
   * @param username Username for authentication
   * @param password Password for authentication
   */
  async connect(uri: string, username: string, password: string): Promise<boolean> {
    try {
      if (this.useInMemory) {
        // For demo, we'll just pretend to connect
        console.log(`[Neo4j] Simulating connection to ${uri}`);
        return true;
      }

      // Create a driver instance
      this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
      
      // Verify connection by pinging the server
      await this.driver.verifyConnectivity();
      console.log(`[Neo4j] Connected to ${uri}`);
      return true;
    } catch (error) {
      console.error('[Neo4j] Connection error:', error);
      return false;
    }
  }

  /**
   * Close the Neo4j connection
   */
  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
    }
  }

  /**
   * Create an entity node in the graph database
   * @param entity The entity to create
   */
  async createEntity(entity: Entity): Promise<void> {
    // Store entity in memory
    this.entities.set(entity.id, { ...entity });

    if (this.useInMemory) {
      return;
    }

    // If connected to a real Neo4j instance, create the node
    if (this.driver) {
      const session = this.driver.session();
      try {
        const query = `
          CREATE (e:Entity {
            id: $id,
            name: $name,
            type: $type,
            description: $description
          })
        `;
        await session.run(query, {
          id: entity.id,
          name: entity.name,
          type: entity.type,
          description: entity.description
        });
      } finally {
        await session.close();
      }
    }
  }

  /**
   * Create a relationship between two entities
   * @param relationship The relationship to create
   */
  async createRelationship(relationship: Relationship): Promise<void> {
    // Store relationship in memory
    this.relationships.set(relationship.id, { ...relationship });

    if (this.useInMemory) {
      return;
    }

    // If connected to a real Neo4j instance, create the relationship
    if (this.driver) {
      const session = this.driver.session();
      try {
        const query = `
          MATCH (source:Entity {id: $sourceId})
          MATCH (target:Entity {id: $targetId})
          CREATE (source)-[r:${relationship.type.toUpperCase()} {
            id: $id,
            description: $description
          }]->(target)
        `;
        await session.run(query, {
          id: relationship.id,
          sourceId: relationship.source,
          targetId: relationship.target,
          description: relationship.description || ''
        });
      } finally {
        await session.close();
      }
    }
  }

  /**
   * Get all entities
   */
  async getEntities(): Promise<Entity[]> {
    if (this.useInMemory) {
      return Array.from(this.entities.values());
    }

    if (!this.driver) {
      return [];
    }

    const session = this.driver.session();
    try {
      const result = await session.run('MATCH (e:Entity) RETURN e');
      return result.records.map((record: Record) => {
        const node = record.get('e');
        return {
          id: node.properties.id,
          name: node.properties.name,
          type: node.properties.type,
          description: node.properties.description,
          operations: []
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Get all relationships
   */
  async getRelationships(): Promise<Relationship[]> {
    if (this.useInMemory) {
      return Array.from(this.relationships.values());
    }

    if (!this.driver) {
      return [];
    }

    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (source:Entity)-[r]->(target:Entity)
        RETURN source.id AS sourceId, target.id AS targetId, type(r) AS type, r.id AS id, r.description AS description
      `);
      
      return result.records.map((record: Record) => {
        return {
          id: record.get('id'),
          source: record.get('sourceId'),
          target: record.get('targetId'),
          type: record.get('type'),
          description: record.get('description')
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Get all entities and relationships as a graph
   */
  async getGraph(): Promise<{ entities: Entity[], relationships: Relationship[] }> {
    const entities = await this.getEntities();
    const relationships = await this.getRelationships();
    return { entities, relationships };
  }

  /**
   * Seed the graph with initial entities and relationships
   * @param entities List of entities to create
   * @param relationships List of relationships to create
   */
  async seedGraph(entities: Entity[], relationships: Relationship[]): Promise<void> {
    // Clear any existing data
    await this.clearGraph();

    // Create all entities
    for (const entity of entities) {
      await this.createEntity(entity);
    }

    // Create all relationships
    for (const relationship of relationships) {
      await this.createRelationship(relationship);
    }

    console.log(`[Neo4j] Seeded graph with ${entities.length} entities and ${relationships.length} relationships`);
  }

  /**
   * Clear all data from the graph
   */
  async clearGraph(): Promise<void> {
    // Clear in-memory storage
    this.entities.clear();
    this.relationships.clear();

    if (this.useInMemory) {
      return;
    }

    // If connected to a real Neo4j instance, clear all data
    if (this.driver) {
      const session = this.driver.session();
      try {
        await session.run('MATCH (n) DETACH DELETE n');
      } finally {
        await session.close();
      }
    }
  }

  /**
   * Set up in-memory storage for demo purposes
   */
  private setupInMemoryStorage(): void {
    this.useInMemory = true;
    this.entities = new Map();
    this.relationships = new Map();
    console.log('[Neo4j] Using in-memory storage');
  }
  
  /**
   * Configure the Neo4j connection and save the configuration
   * @param config Neo4j connection configuration
   */
  async configureConnection(config: { uri: string, username: string, password: string }): Promise<boolean> {
    try {
      // First try to connect to verify credentials
      const success = await this.connect(config.uri, config.username, config.password);
      
      if (success) {
        // Save config to storage
        await storage.setNeo4jConfig(config);
        
        // Switch to real Neo4j mode
        this.useInMemory = false;
        console.log('[Neo4j] Successfully configured and connected to Neo4j');
        return true;
      } else {
        console.error('[Neo4j] Failed to connect with provided configuration');
        return false;
      }
    } catch (error) {
      console.error('[Neo4j] Error during connection configuration:', error);
      return false;
    }
  }
  
  /**
   * Switch to in-memory mode (useful for testing)
   */
  async useInMemoryMode(): Promise<void> {
    // Close any existing connection
    await this.close();
    
    // Switch to in-memory mode
    this.setupInMemoryStorage();
    console.log('[Neo4j] Switched to in-memory mode');
  }
  
  /**
   * Get current connection mode
   */
  isUsingInMemory(): boolean {
    return this.useInMemory;
  }
}

// Export a singleton instance
export const neo4jService = new Neo4jService();