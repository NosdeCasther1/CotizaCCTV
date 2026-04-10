#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { simpleGit } from "simple-git";
import type { SimpleGit, StatusResult } from "simple-git";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

/**
 * GitMCPServer - A robust MCP Server to control Git operations within the CotizaCCTV ecosystem.
 * Implements status retrieval, semantic commits, and push operations.
 * Designed by Antigravity (Senior DevOps & TypeScript Developer).
 */
class GitMCPServer {
  private server: Server;
  private readonly SEMANTIC_REGEX = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?:\s.+/;

  constructor() {
    this.server = new Server(
      {
        name: "cotizacctv-git-mcp",
        version: "1.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    
    // Error handling for the server
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Validates and returns a SimpleGit client for a specific repository path.
   */
  private async getGitClient(repoPath: string): Promise<SimpleGit> {
    const resolvedPath = path.resolve(repoPath);
    
    if (!fs.existsSync(resolvedPath)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Directory does not exist: ${resolvedPath}`
      );
    }

    const git: SimpleGit = simpleGit(resolvedPath);
    const isRepo = await git.checkIsRepo();

    if (!isRepo) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Directory is not a valid Git repository: ${resolvedPath}`
      );
    }

    return git;
  }

  private setupHandlers() {
    // 1. List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "get_git_status",
          description: "Get the current status of the Git repository (staged, modified, untracked).",
          inputSchema: {
            type: "object",
            properties: {
              repo_path: { type: "string", description: "Absolute path to the Git repository." },
            },
            required: ["repo_path"],
          },
        },
        {
          name: "generate_semantic_commit",
          description: "Stages files and creates a commit using Conventional Commits format.",
          inputSchema: {
            type: "object",
            properties: {
              repo_path: { type: "string", description: "Absolute path to the Git repository." },
              message: { type: "string", description: "Semantic commit message (e.g., 'feat: add user auth')." },
              files: { 
                type: "array", 
                items: { type: "string" },
                description: "Files to stage. Use ['.'] for all." 
              },
            },
            required: ["repo_path", "message", "files"],
          },
        },
        {
          name: "push_changes",
          description: "Pushes local commits to a remote repository.",
          inputSchema: {
            type: "object",
            properties: {
              repo_path: { type: "string", description: "Absolute path to the Git repository." },
              remote: { type: "string", description: "Remote name (default: 'origin')." },
            },
            required: ["repo_path"],
          },
        },
        {
          name: "discard_changes",
          description: "Discards unstaged changes in specific files or the entire repository.",
          inputSchema: {
            type: "object",
            properties: {
              repo_path: { type: "string", description: "Absolute path to the Git repository." },
              files: { 
                type: "array", 
                items: { type: "string" },
                description: "Files to discard changes for. Use ['.'] for all unstaged changes." 
              },
            },
            required: ["repo_path", "files"],
          },
        },
      ],
    }));

    // 2. Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "get_git_status":
            return await this.handleGetStatus(args as { repo_path: string });
          case "generate_semantic_commit":
            return await this.handleSemanticCommit(args as { repo_path: string; message: string; files: string[] });
          case "push_changes":
            return await this.handlePushChanges(args as { repo_path: string; remote?: string });
          case "discard_changes":
            return await this.handleDiscardChanges(args as { repo_path: string; files: string[] });
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

  private async handleGetStatus(args: { repo_path: string }) {
    const git = await this.getGitClient(args.repo_path);
    const status: StatusResult = await git.status();
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            branch: status.current,
            behind: status.behind,
            ahead: status.ahead,
            staged: status.staged,
            modified: status.modified,
            untracked: status.not_added,
            is_clean: status.isClean(),
          }, null, 2),
        },
      ],
    };
  }

  private async handleSemanticCommit(args: { repo_path: string; message: string; files: string[] }) {
    // Validate semantic message format
    if (!this.SEMANTIC_REGEX.test(args.message)) {
      return {
        content: [
          {
            type: "text",
            text: "Validation Error: Message must follow Conventional Commits (e.g., 'feat: description', 'fix: description').",
          },
        ],
        isError: true,
      };
    }

    const git = await this.getGitClient(args.repo_path);
    
    // Add files
    await git.add(args.files);
    
    // Commit
    const commitResult = await git.commit(args.message);
    
    return {
      content: [
        {
          type: "text",
          text: `Successfully committed ${commitResult.commit}.\nSummary: ${commitResult.summary.changes} changes, ${commitResult.summary.insertions} insertions(+), ${commitResult.summary.deletions} deletions(-).`,
        },
      ],
    };
  }

  private async handlePushChanges(args: { repo_path: string; remote?: string }) {
    const git = await this.getGitClient(args.repo_path);
    const remote = args.remote || "origin";
    const status = await git.status();
    const currentBranch = status.current;

    if (!currentBranch) {
      throw new Error("Unable to determine current branch.");
    }

    const pushResult = await git.push(remote, currentBranch);
    
    return {
      content: [
        {
          type: "text",
          text: `Push successful to ${remote}/${currentBranch}.`,
        },
      ],
    };
  }

  private async handleDiscardChanges(args: { repo_path: string; files: string[] }) {
    const git = await this.getGitClient(args.repo_path);
    
    // Discard unstaged changes
    await git.checkout(args.files);
    
    return {
      content: [
        {
          type: "text",
          text: `Successfully discarded unstaged changes in: ${args.files.join(", ")}`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Git MCPServer running on stdio");
  }
}

// Instantiate and run the server
const server = new GitMCPServer();
server.run().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
