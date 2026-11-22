import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";

const server = new McpServer({ name: "gadget-kini-pad...", version: "1.0.0" });

let products = [];
try {
  const raw = readFileSync("./api/products.json", "utf-8");
  products = JSON.parse(raw);
} catch (e) {
  console.log("products.json tidak ketemu, pakai array kosong", e.message);
}

server.registerTool("search_products", {
  description: "Cari produk Gadget Kini Padang...",
  inputSchema: { query: z.string().describe("Kata kunci produk") }
}, async ({ query }) => {
  const q = query.toLowerCase();
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.tags || []).join(" ").toLowerCase().includes(q)
  );
  return { content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }] };
});

server.registerTool("get_product_detail", {
  description: "Ambil detail...",
  inputSchema: { id: z.string().describe("ID produk") }
}, async ({ id }) => {
  const p = products.find(x => x.id === id);
  if (!p) return { content: [{ type: "text", text: "Produk tidak ditemukan" }], isError: true };
  return { content: [{ type: "text", text: JSON.stringify(p, null, 2) }] };
});

const sessions = {};

const app = express();
app.use(express.json());

// === VERIFIKASI MUSE - JANGAN DIHAPUS ===
app.get("/.well-known/muse-challenge/6ba0d13d4c9ed98900537164fac0d5e0565ec09a46601234e3d25da0e6c80dfb", (req, res) => {
  res.type("text/plain").send("muse-challenge=6ba0d13d4c9ed98900537164fac0d5e0565ec09a46601234e3d25da0e6c80dfb");
});
// === AKHIR VERIFIKASI ===

app.get("/", (req, res) => {
  res.json({ name: "Gadget Kini Padang MCP", status: "ok" });
});

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  let transport;

  if (sessionId && sessions[sessionId]) {
    transport = sessions[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => { sessions[sid] = transport; }
    });
    transport.onclose = () => {
      if (transport.sessionId) delete sessions[transport.sessionId];
    };
    await server.connect(transport);
  } else {
    return res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Bad Request: No valid session ID provided" },
      id: null
    });
  }

  await transport.handleRequest(req, res, req.body);
});

const handleSessionRequest = async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  if (!sessionId || !sessions[sessionId]) {
    return res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Bad Request: No valid session ID provided" },
      id: null
    });
  }
  const transport = sessions[sessionId];
  await transport.handleRequest(req, res);
};

app.get("/mcp", handleSessionRequest);
app.delete("/mcp", handleSessionRequest);

export default app;
