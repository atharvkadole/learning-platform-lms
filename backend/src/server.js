import { app } from "./app.js";
import { env } from "./config/env.js";
import { disconnectPrisma, prisma } from "./config/prisma.js";

async function start() {
  await prisma.$queryRaw`SELECT 1`;
  app.listen(env.PORT, () => {
    console.log(`API server running on http://localhost:${env.PORT}`);
  });
}

process.on("SIGINT", async () => {
  await disconnectPrisma();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await disconnectPrisma();
  process.exit(0);
});

start().catch(async (error) => {
  console.error("Failed to start API server");
  console.error(error);
  await disconnectPrisma();
  process.exit(1);
});
