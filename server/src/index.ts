import "dotenv/config"; // ✅ must be FIRST, before other imports

import http from "http";
import app from "./app";
import { connectDB } from "./config/database";

async function start() {
  await connectDB();

  const PORT = Number(process.env.PORT) || 5000;
  const server = http.createServer(app);

  server.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`✅ Swagger Docs: http://localhost:${PORT}/docs`);
  });
}

start().catch((err) => {
  console.error("❌ Server failed:", err);
  process.exit(1);
});
