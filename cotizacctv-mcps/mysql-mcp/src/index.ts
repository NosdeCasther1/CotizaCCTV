#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import process from "node:process";

// Load environment variables
dotenv.config();

/**
 * MySQLMCPServer - A secure MCP Server to interact with MySQL databases.
 * Provides schema discovery and safe read-only query execution.
 * Designed by Antigravity (DBA & Senior Backend Developer).
 */
class MySQLMCPServer {
  private server: Server;
  private pool: mysql.Pool;

  constructor() {
    this.server = new Server(
      {
        name: "cotizacctv-mysql-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize Connection Pool
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    this.setupHandlers();
    
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.pool.end();
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers() {
    // 1. List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "get_database_schema",
          description: "Retrieves the full database schema including tables and column definitions.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "execute_read_query",
          description: "Executes a read-only (SELECT) SQL query. Modifications are strictly forbidden.",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "The SQL SELECT query to execute." },
            },
            required: ["query"],
          },
        },
      ],
    }));

    // 2. Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "get_database_schema":
            return await this.handleGetSchema();
          case "execute_read_query":
            return await this.handleReadQuery(args as { query: string });
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: error instanceof McpError ? error.message : `Database Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleGetSchema() {
    try {
      // Get all tables
      const [tables]: any = await this.pool.query("SHOW TABLES");
      const dbName = process.env.DB_NAME || "";
      const tableKey = `Tables_in_${dbName}`;
      
      let schemaDescription = `Database Schema for '${dbName}':\n\n`;

      for (const tableRow of tables) {
        const tableName = tableRow[tableKey] || Object.values(tableRow)[0];
        schemaDescription += `Table: ${tableName}\n`;
        
        const [columns]: any = await this.pool.query(`DESCRIBE \`${tableName}\``);
        for (const col of columns) {
          schemaDescription += `  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? '['+col.Key+']' : ''}\n`;
        }
        schemaDescription += "\n";
      }

      return {
        content: [{ type: "text", text: schemaDescription }],
      };
    } catch (error: any) {
        throw new Error(`Failed to fetch schema: ${error.message}`);
    }
  }

  private async handleReadQuery(args: { query: string }) {
    const { query } = args;
    const normalizedQuery = query.trim().toUpperCase();

    // Strict Security Validation
    if (!normalizedQuery.startsWith("SELECT")) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Security Error: Only SELECT queries are allowed. Query must start with 'SELECT'."
      );
    }

    const forbiddenKeywords = [/INSERT/i, /UPDATE/i, /DELETE/i, /DROP/i, /ALTER/i, /TRUNCATE/i];
    for (const kw of forbiddenKeywords) {
      if (kw.test(query)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Security Error: Query contains forbidden keyword '${kw.source}'.`
        );
      }
    }

    try {
      const [rows]: any = await this.pool.query(query);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(rows, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Query Execution Error: ${error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("MySQL MCPServer running on stdio");
  }
}

// Instantiate and run the server
const server = new MySQLMCPServer();
server.run().catch((error) => {
  console.error("Fatal error running MySQL MCP server:", error);
  process.exit(1);
});
