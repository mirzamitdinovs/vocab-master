import { PrismaClient } from "@prisma/client";
import { downAll, upAll } from "../seeds";

const prisma = new PrismaClient();

async function main() {
  await downAll(prisma);
  await upAll(prisma);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
