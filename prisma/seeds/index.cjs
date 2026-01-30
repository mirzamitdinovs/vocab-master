const koreanTopic1 = require("./korean/topic-1");

const seeders = [koreanTopic1];

async function downAll(prisma) {
  for (const seeder of seeders) {
    if (seeder.down) {
      await seeder.down(prisma);
    }
  }
}

async function upAll(prisma) {
  for (const seeder of seeders) {
    if (seeder.up) {
      await seeder.up(prisma);
    }
  }
}

module.exports = { downAll, upAll };
