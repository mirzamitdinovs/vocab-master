import koreanTopic1 from "./korean/topic-1";

const seeders = [koreanTopic1];

export async function downAll(prisma: { [key: string]: any }) {
  // eslint-disable-next-line no-console
  console.log("[seed] starting down...");
  for (const seeder of seeders) {
    if (seeder.down) {
      // eslint-disable-next-line no-console
      console.log(`[seed] down: ${seeder.name ?? "anonymous"}`);
      await seeder.down(prisma);
    }
  }
  // eslint-disable-next-line no-console
  console.log("[seed] down complete");
}

export async function upAll(prisma: { [key: string]: any }) {
  // eslint-disable-next-line no-console
  console.log("[seed] starting up...");
  for (const seeder of seeders) {
    if (seeder.up) {
      // eslint-disable-next-line no-console
      console.log(`[seed] up: ${seeder.name ?? "anonymous"}`);
      await seeder.up(prisma);
    }
  }
  // eslint-disable-next-line no-console
  console.log("[seed] up complete");
}
