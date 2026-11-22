import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const STORE = {
  name: "Gadget Kini Padang",
  address: "Padang, Sumatera Barat - hubungi WA untuk alamat lengkap",
  whatsapp: "https://wa.me/6280000000000",
  instagram: "https://instagram.com/gadgetkinipadang",
  website: "https://gadgetkinipadang.web.id",
  hours: "Setiap hari 09.00 - 21.00 WIB",
  services: "Jual HP baru & second, tukar tambah, aksesoris HP",
};

function createServer() {
  const server = new McpServer({
    name: "gadget-kini-padang",
    version: "1.0.0",
  });

  server.tool(
    "get_store_info",
    "Info lengkap toko Gadget Kini Padang: alamat, jam buka, kontak, layanan",
    {},
    async () => ({
      content: [{ type: "text", text: JSON.stringify(STORE, null, 2) }],
    })
  );

  return server;
}

const app = express();
app.use(express.json());

app.all("/mcp", async (req, res) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on("close", () => transport.close());
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/", (req, res) => {
  res.json({ name: "Gadget Kini Padang MCP", status: "ok" });
});

export default app;
