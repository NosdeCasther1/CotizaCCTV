#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError, } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";
dotenv.config();
/**
 * BridgeMCPServer - Connects Laravel API and Next.js Frontend.
 * Features: API Testing, TS Interface Generation, and Automated File Writing.
 * Designed by Antigravity (Full-Stack Software Architect).
 */
class BridgeMCPServer {
    server;
    constructor() {
        this.server = new Server({
            name: "cotizacctv-api-bridge-mcp",
            version: "1.0.0",
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupHandlers();
        this.server.onerror = (error) => console.error("[MCP Error]", error);
        process.on("SIGINT", async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: "test_api_endpoint",
                    description: "Perform an HTTP request to test API endpoints.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            method: { enum: ["GET", "POST", "PUT", "PATCH", "DELETE"], description: "HTTP Method" },
                            url: { type: "string", description: "URL of the endpoint" },
                            headers: { type: "object", description: "Optional HTTP headers" },
                            body: { type: "object", description: "Optional JSON body" },
                        },
                        required: ["method", "url"],
                    },
                },
                {
                    name: "generate_ts_interfaces",
                    description: "Converts a sample JSON payload into a TypeScript interface definition.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            json_payload: { type: "object", description: "Sample JSON object" },
                            interface_name: { type: "string", description: "Name of the resulting interface (e.g., 'User')" },
                        },
                        required: ["json_payload", "interface_name"],
                    },
                },
                {
                    name: "write_interface_file",
                    description: "Writes a TypeScript interface definition to a specific file path in the frontend.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            frontend_path: { type: "string", description: "Absolute path to the target .ts file" },
                            interface_name: { type: "string", description: "Optional interface name (meta info)" },
                            content: { type: "string", description: "The interface code content" },
                        },
                        required: ["frontend_path", "content"],
                    },
                },
            ],
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                switch (name) {
                    case "test_api_endpoint":
                        return await this.handleTestEndpoint(args);
                    case "generate_ts_interfaces":
                        return await this.handleGenerateInterface(args);
                    case "write_interface_file":
                        return await this.handleWriteFile(args);
                    default:
                        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
                }
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: error instanceof McpError ? error.message : `Internal Error: ${error.message}`,
                        },
                    ],
                    isError: true,
                };
            }
        });
    }
    async handleTestEndpoint(args) {
        try {
            const response = await axios({
                method: args.method,
                url: args.url,
                headers: args.headers,
                data: args.body,
                validateStatus: () => true, // Catch all status codes
            });
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            status: response.status,
                            statusText: response.statusText,
                            data: response.data,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            throw new Error(`API Connection Failed: ${error.message}`);
        }
    }
    handleGenerateInterface(args) {
        const { json_payload, interface_name } = args;
        const generateType = (val, indent = "  ") => {
            if (val === null)
                return "any";
            if (Array.isArray(val)) {
                if (val.length === 0)
                    return "any[]";
                return `${generateType(val[0], indent)}[]`;
            }
            if (typeof val === "object") {
                let str = "{\n";
                for (const key in val) {
                    str += `${indent}  ${key}: ${generateType(val[key], indent + "  ")};\n`;
                }
                str += `${indent}}`;
                return str;
            }
            return typeof val;
        };
        let result = `export interface ${interface_name} ${generateType(json_payload)}`;
        return {
            content: [{ type: "text", text: result }],
        };
    }
    async handleWriteFile(args) {
        const { frontend_path, content } = args;
        const resolvedPath = path.resolve(frontend_path);
        try {
            // Ensure directory exists
            const dir = path.dirname(resolvedPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(resolvedPath, content, "utf8");
            return {
                content: [{ type: "text", text: `Successfully wrote interface to ${resolvedPath}` }],
            };
        }
        catch (error) {
            throw new Error(`File Write Failed: ${error.message}`);
        }
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("API Bridge MCPServer running on stdio");
    }
}
const server = new BridgeMCPServer();
server.run().catch((error) => {
    console.error("Fatal error running Bridge MCP server:", error);
    process.exit(1);
});
