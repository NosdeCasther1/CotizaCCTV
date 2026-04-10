#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_DATABASE,
} = process.env;

// Type definition for tool arguments
interface DescribeTableArgs {
  table_name: string;
}

interface RunSelectQueryArgs {
  query: string;
}

/**
 * Validates if a query is strictly a read-only operation.
 */
function isReadOnlyQuery(query: string): boolean {
  const forbiddenPatterns = [
    /\bINSERT\b/i,
    /\bUPDATE\b/i,
    /\bDELETE\b/i,
    /\bDROP\b/i,
    /\bALTER\b/i,
    /\bTRUNCATE\b/i,
    /\bREPLACE\b/i,
    /\bCREATE\b/i,
    /\bGRANT\b/i,
    /\bREVOKE\b/i,
  ];

  return !forbiddenPatterns.some(pattern => pattern.test(query));
}

class MySqlMcpServer {
  private server: Server;
  private pool: mysql.Pool | null = null;

  constructor() {
    this.server = new Server(
      {
        name: "mysql-introspector",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupTools();
    
    // Error handling
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  private async getPool(): Promise<mysql.Pool> {
    if (this.pool) return this.pool;

    try {
      this.pool = mysql.createPool({
        host: DB_HOST || "localhost",
        port: parseInt(DB_PORT || "3306"),
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_DATABASE,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });

      // Test connection
      const connection = await this.pool.getConnection();
      connection.release();
      return this.pool;
    } catch (error) {
      console.error("Failed to connect to MySQL database:", error);
      throw new Error(`Database connection failed: ${(error as Error).message}`);
    }
  }

  private async cleanup() {
    if (this.pool) {
      await this.pool.end();
    }
  }

  private setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "list_tables",
          description: "Retorna una lista con los nombres de todas las tablas en la base de datos conectada.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "describe_table",
          description: "Retorna el esquema exacto de una tabla específica (columnas, tipos de datos, llaves, etc.).",
          inputSchema: {
            type: "object",
            properties: {
              table_name: {
                type: "string",
                description: "El nombre de la tabla a describir.",
              },
            },
            required: ["table_name"],
          },
        },
        {
          name: "run_select_query",
          description: "Permite ejecutar consultas SQL puras. Limitado estrictamente a operaciones de lectura (SELECT / SHOW / EXPLAIN).",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "La consulta SQL a ejecutar.",
              },
            },
            required: ["query"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const pool = await this.getPool();

        switch (name) {
          case "list_tables": {
            const [rows] = await pool.query("SHOW TABLES;");
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(rows, null, 2),
                },
              ],
            };
          }

          case "describe_table": {
            const { table_name } = args as unknown as DescribeTableArgs;
            if (!table_name) {
              throw new Error("table_name is required");
            }

            // Using information_schema for more detailed info
            const [rows] = await pool.query(
              "SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA FROM information_schema.columns WHERE table_schema = ? AND table_name = ? ORDER BY ORDINAL_POSITION",
              [DB_DATABASE, table_name]
            );

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(rows, null, 2),
                },
              ],
            };
          }

          case "run_select_query": {
            const { query } = args as unknown as RunSelectQueryArgs;
            if (!query) {
              throw new Error("query is required");
            }

            if (!isReadOnlyQuery(query)) {
              return {
                content: [
                  {
                    type: "text",
                    text: "Error: Solo se permiten consultas de lectura (SELECT, SHOW, EXPLAIN). Operaciones de escritura detectadas.",
                  },
                ],
                isError: true,
              };
            }

            const [rows] = await pool.query(query);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(rows, null, 2),
                },
              ],
            };
          }

          default:
            throw new Error(`Tool not found: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("MySQL Introspector MCP server running on stdio");
  }
}

const server = new MySqlMcpServer();
server.run().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
