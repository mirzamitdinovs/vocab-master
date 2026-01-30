const { PrismaClient } = require('@prisma/client');
const { downAll, upAll } = require('../seeds/index.cjs');

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
