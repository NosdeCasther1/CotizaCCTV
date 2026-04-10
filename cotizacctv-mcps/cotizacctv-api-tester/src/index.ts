import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosError } from "axios";
import * as dotenv from "dotenv";
import { z } from "zod";

// Load environment variables
dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8000/api";
const API_TEST_TOKEN = process.env.API_TEST_TOKEN;

/**
 * Advanced HTTP Client and Data Contract Validator for CotizaCCTV Backend
 */
class ApiTesterServer {
  private server: Server;
  private axiosInstance;

  constructor() {
    this.server = new Server(
      {
        name: "cotizacctv-api-tester",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(API_TEST_TOKEN ? { Authorization: `Bearer ${API_TEST_TOKEN}` } : {}),
      },
    });

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "execute_request",
          description: "Ejecuta una petición HTTP contra el backend de Laravel.",
          inputSchema: {
            type: "object",
            properties: {
              method: {
                type: "string",
                enum: ["GET", "POST", "PUT", "DELETE"],
                description: "Método HTTP a utilizar",
              },
              endpoint: {
                type: "string",
                description: "Endpoint relativo (ej. /products)",
              },
              body: {
                type: "string",
                description: "Cuerpo de la petición en formato JSON string (opcional)",
              },
            },
            required: ["method", "endpoint"],
          },
        },
        {
          name: "validate_contract",
          description: "Valida que un endpoint retorne los campos esperados en su contrato de datos.",
          inputSchema: {
            type: "object",
            properties: {
              endpoint: {
                type: "string",
                description: "Endpoint a validar (ej. /products)",
              },
              required_keys: {
                type: "array",
                items: { type: "string" },
                description: "Lista de llaves requeridas en el primer nivel del objeto de respuesta",
              },
            },
            required: ["endpoint", "required_keys"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "execute_request":
            return await this.handleExecuteRequest(args);
          case "validate_contract":
            return await this.handleValidateContract(args);
          default:
            throw new Error(`Herramienta no encontrada: ${name}`);
        }
      } catch (error) {
        return this.formatError(error);
      }
    });
  }

  private async handleExecuteRequest(args: any) {
    const { method, endpoint, body } = z
      .object({
        method: z.enum(["GET", "POST", "PUT", "DELETE"]),
        endpoint: z.string(),
        body: z.string().optional(),
      })
      .parse(args);

    const config = {
      method,
      url: endpoint,
      data: body ? JSON.parse(body) : undefined,
    };

    const response = await this.axiosInstance(config);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status_code: response.status,
              data: response.data,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleValidateContract(args: any) {
    const { endpoint, required_keys } = z
      .object({
        endpoint: z.string(),
        required_keys: z.array(z.string()),
      })
      .parse(args);

    const response = await this.axiosInstance.get(endpoint);
    const data = response.data;

    // Si es un array, validamos el primer elemento (si existe)
    // Si es un objeto, validamos directamente
    const target = Array.isArray(data) ? data[0] : data;

    if (!target && Array.isArray(data)) {
      return {
        content: [{ type: "text", text: "Error: El endpoint retornó un array vacío, no se puede validar el contrato." }],
        isError: true,
      };
    }

    const missingKeys = required_keys.filter((key) => !(key in target));

    if (missingKeys.length > 0) {
      return {
        content: [
          {
            type: "text",
            text: `Error de Contrato: Faltan las siguientes llaves en la respuesta: ${missingKeys.join(", ")}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Validación exitosa. Todas las llaves requeridas (${required_keys.join(", ")}) están presentes.`,
        },
      ],
    };
  }

  private formatError(error: any) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return {
        content: [
          {
            type: "text",
            text: `Error de Axios (${axiosError.code}): ${axiosError.message}\n` +
                  `Status: ${axiosError.response?.status}\n` +
                  `Body: ${JSON.stringify(axiosError.response?.data, null, 2)}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Error inesperado: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }

  private setupErrorHandling() {
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("MCP Server 'cotizacctv-api-tester' running on stdio");
  }
}

const server = new ApiTesterServer();
server.run().catch(console.error);
