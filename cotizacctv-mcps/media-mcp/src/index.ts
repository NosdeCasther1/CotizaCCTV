#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import sharp from "sharp";
import fs from "fs-extra";
import path from "node:path";
import process from "node:process";

/**
 * MediaMCPServer - High-performance asset optimizer for the CotizaCCTV catalog.
 * Features: WebP transcoding, resizing, and catalog organization.
 * Designed by Antigravity (Performance Frontend Engineer).
 */
class MediaMCPServer {
  private server: Server;
  private readonly SUPPORTED_FORMATS = [".jpg", ".jpeg", ".png", ".webp"];

  constructor() {
    this.server = new Server(
      {
        name: "cotizacctv-media-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "optimize_image_for_web",
          description: "Optimizes an image for web by resizing to max 800px width and converting to WebP.",
          inputSchema: {
            type: "object",
            properties: {
              input_path: { type: "string", description: "Path to the source image file" },
              output_path: { type: "string", description: "Path where the optimized WebP will be saved" },
            },
            required: ["input_path", "output_path"],
          },
        },
        {
          name: "organize_catalog_directory",
          description: "Ensures the catalog directory structure exists for a specific provider and category.",
          inputSchema: {
            type: "object",
            properties: {
              base_directory: { type: "string", description: "Base project directory (e.g., project root)" },
              provider_name: { type: "string", description: "Name of the supplier/provider" },
              category_name: { type: "string", description: "Product category name" },
            },
            required: ["base_directory", "provider_name", "category_name"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "optimize_image_for_web":
            return await this.handleOptimizeImage(args as any);
          case "organize_catalog_directory":
            return await this.handleOrganizeDirectory(args as any);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error: any) {
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

  private async handleOptimizeImage(args: { input_path: string; output_path: string }) {
    const { input_path, output_path } = args;
    const resolvedInput = path.resolve(input_path);
    const resolvedOutput = path.resolve(output_path);

    // Validate existence
    if (!fs.existsSync(resolvedInput)) {
      throw new McpError(ErrorCode.InvalidParams, `Input file not found: ${resolvedInput}`);
    }

    // Validate format
    const ext = path.extname(resolvedInput).toLowerCase();
    if (!this.SUPPORTED_FORMATS.includes(ext)) {
      throw new McpError(
        ErrorCode.InvalidParams, 
        `Unsupported image format: ${ext}. Supported: ${this.SUPPORTED_FORMATS.join(", ")}`
      );
    }

    try {
      // Ensure target directory exists
      const targetDir = path.dirname(resolvedOutput);
      await fs.ensureDir(targetDir);

      // Processing with Sharp
      const metadata = await sharp(resolvedInput).metadata();
      const info = await sharp(resolvedInput)
        .resize({ width: 800, withoutEnlargement: true }) // Proportional resize
        .webp({ quality: 80 })
        .toFile(resolvedOutput);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              message: "Optimization successful",
              source_format: metadata.format,
              output_format: info.format,
              original_size: `${(metadata.size || 0) / 1024} KB`,
              optimized_size: `${info.size / 1024} KB`,
              dimensions: `${info.width}x${info.height}`,
              saved_to: resolvedOutput,
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      throw new Error(`Sharp Image Processing Failed: ${error.message}`);
    }
  }

  private async handleOrganizeDirectory(args: { base_directory: string; provider_name: string; category_name: string }) {
    const { base_directory, provider_name, category_name } = args;
    
    // Structure: public/storage/products/{provider}/{category}
    const targetPath = path.join(
      base_directory, 
      "public", 
      "storage", 
      "products", 
      provider_name.toLowerCase().replace(/\s+/g, "_"), 
      category_name.toLowerCase().replace(/\s+/g, "_")
    );

    try {
      await fs.ensureDir(targetPath);
      return {
        content: [{ type: "text", text: `Directory structure verified/created: ${targetPath}` }],
      };
    } catch (error: any) {
      throw new Error(`Directory creation failed: ${error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Media MCPServer running on stdio");
  }
}

const server = new MediaMCPServer();
server.run().catch((error) => {
  console.error("Fatal error running Media MCP server:", error);
  process.exit(1);
});
