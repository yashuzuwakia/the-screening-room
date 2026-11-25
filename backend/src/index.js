import { createApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./lib/prisma.js";

const app = createApp();

async function start() {
  try {
    await prisma.$connect();
    console.log("[db] connected");
  } catch (error) {
    console.error("[db] Could not connect. Start Postgres: docker compose up -d");
    console.error(error.message);
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`[api] http://localhost:${config.port}`);
    console.log(`[api] health → http://localhost:${config.port}/api/health`);
  });
}

start();
