"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
const zod_1 = require("zod");
// Load environment variables
dotenv.config();
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8000/api";
const API_TEST_TOKEN = process.env.API_TEST_TOKEN;
/**
 * Advanced HTTP Client and Data Contract Validator for CotizaCCTV Backend
 */
class ApiTesterServer {
    server;
    axiosInstance;
    constructor() {
        this.server = new index_js_1.Server({
            name: "cotizacctv-api-tester",
            version: "1.0.0",
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.axiosInstance = axios_1.default.create({
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
    setupHandlers() {
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({
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
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
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
            }
            catch (error) {
                return this.formatError(error);
            }
        });
    }
    async handleExecuteRequest(args) {
        const { method, endpoint, body } = zod_1.z
            .object({
            method: zod_1.z.enum(["GET", "POST", "PUT", "DELETE"]),
            endpoint: zod_1.z.string(),
            body: zod_1.z.string().optional(),
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
                    text: JSON.stringify({
                        status_code: response.status,
                        data: response.data,
                    }, null, 2),
                },
            ],
        };
    }
    async handleValidateContract(args) {
        const { endpoint, required_keys } = zod_1.z
            .object({
            endpoint: zod_1.z.string(),
            required_keys: zod_1.z.array(zod_1.z.string()),
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
    formatError(error) {
        if (axios_1.default.isAxiosError(error)) {
            const axiosError = error;
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
    setupErrorHandling() {
        process.on("SIGINT", async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    async run() {
        const transport = new stdio_js_1.StdioServerTransport();
        await this.server.connect(transport);
        console.error("MCP Server 'cotizacctv-api-tester' running on stdio");
    }
}
const server = new ApiTesterServer();
server.run().catch(console.error);
