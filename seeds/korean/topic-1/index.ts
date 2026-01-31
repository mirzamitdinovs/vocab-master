import fs from "node:fs";
import path from "node:path";

const languageTitle = "Korean";
const levelTitle = "Topic 1";
const baseDir = __dirname;
const seederName = "korean-topic-1";

function listChapterFiles() {
  const entries = fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name);

  return entries.sort((a, b) => {
    const getNum = (value: string) => {
      const match = value.match(/\d+/);
      return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
    };
    const aNum = getNum(a);
    const bNum = getNum(b);
    if (aNum !== bNum) return aNum - bNum;
    return a.localeCompare(b);
  });
}

async function down(prisma: { [key: string]: any }) {
  // eslint-disable-next-line no-console
  console.log(`[seed:${seederName}] removing language ${languageTitle}`);
  await prisma.language.deleteMany({ where: { title: languageTitle } });
}

async function up(prisma: { [key: string]: any }) {
  // eslint-disable-next-line no-console
  console.log(`[seed:${seederName}] upserting language ${languageTitle}`);
  const language = await prisma.language.upsert({
    where: { title: languageTitle },
    update: {},
    create: { title: languageTitle, order: 1 },
  });

  // eslint-disable-next-line no-console
  console.log(`[seed:${seederName}] upserting level ${levelTitle}`);
  const level = await prisma.level.upsert({
    where: { languageId_title: { languageId: language.id, title: levelTitle } },
    update: { order: 1 },
    create: { languageId: language.id, title: levelTitle, order: 1 },
  });

  const chapterFiles = listChapterFiles();
  // eslint-disable-next-line no-console
  console.log(`[seed:${seederName}] found ${chapterFiles.length} chapters`);
  for (let i = 0; i < chapterFiles.length; i += 1) {
    const filePath = path.join(baseDir, chapterFiles[i]);
    const chapterWords = JSON.parse(fs.readFileSync(filePath, "utf-8")) as {
      order?: number;
      korean: string;
      translation: string;
    }[];
    if (!Array.isArray(chapterWords) || chapterWords.length === 0) continue;

    const chapterTitle = chapterFiles[i].replace(/_/g, " ").replace(/\.json$/, "");
    // eslint-disable-next-line no-console
    console.log(`[seed:${seederName}] upserting chapter ${chapterTitle} (${chapterWords.length} words)`);
    const chapter = await prisma.chapter.upsert({
      where: { levelId_title: { levelId: level.id, title: chapterTitle } },
      update: { order: i + 1 },
      create: { levelId: level.id, title: chapterTitle, order: i + 1 },
    });

    const words = chapterWords
      .filter((data) => data && data.korean && data.translation)
      .map((data, index) => ({
        chapterId: chapter.id,
        korean: data.korean,
        translation: data.translation,
        order: Number.isFinite(data.order) ? data.order : index + 1,
      }));

    if (words.length > 0) {
      const result = await prisma.word.createMany({ data: words, skipDuplicates: true });
      // eslint-disable-next-line no-console
      console.log(
        `[seed:${seederName}] inserted ${result.count}/${words.length} words for ${chapterTitle}`,
      );
    }
  }
}

const seeder = { up, down, name: seederName };
export default seeder;
