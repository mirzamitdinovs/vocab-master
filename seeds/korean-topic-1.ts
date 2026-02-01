import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

const languageKey = "Korean_Language";
const languageValue = "Korean";
const levelTitle = "Topic 1";
const seederName = "korean-topic-1";
const assetsBase = path.join(process.cwd(), "..", "assets");
const wordsCsvPath = path.join(assetsBase, "words", "korean", "topic-1.csv");
const audioDir = path.join(assetsBase, "audio", "korean", "topic-1");

type CsvRow = {
  id: string;
  order?: string;
  korean: string;
  translation: string;
  chapter: string;
};

function loadCsvRows(): CsvRow[] {
  const raw = fs.readFileSync(wordsCsvPath, "utf-8");
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[];
}

function getAudioPath(wordId: string) {
  const filename = `${wordId}.mp3`;
  const fullPath = path.join(audioDir, filename);
  if (!fs.existsSync(fullPath)) return null;
  return path.join("audio", "korean", "topic-1", filename);
}

async function down(prisma: { [key: string]: any }) {
  // eslint-disable-next-line no-console
  console.log(`[seed:${seederName}] removing language ${languageValue}`);
  await prisma.language.deleteMany({ where: { key: languageKey } });
}

async function up(prisma: { [key: string]: any }) {
  // eslint-disable-next-line no-console
  console.log(`[seed:${seederName}] upserting language ${languageValue}`);
  const language = await prisma.language.upsert({
    where: { key: languageKey },
    update: {},
    create: { key: languageKey, value: languageValue, order: 1 },
  });

  // eslint-disable-next-line no-console
  console.log(`[seed:${seederName}] upserting level ${levelTitle}`);
  const level = await prisma.level.upsert({
    where: { languageId_title: { languageId: language.id, title: levelTitle } },
    update: { order: 1 },
    create: { languageId: language.id, title: levelTitle, order: 1 },
  });

  const rows = loadCsvRows();
  const chapters = new Map<string, CsvRow[]>();
  const chapterOrder: string[] = [];

  for (const row of rows) {
    if (!row.chapter) continue;
    if (!chapters.has(row.chapter)) {
      chapters.set(row.chapter, []);
      chapterOrder.push(row.chapter);
    }
    chapters.get(row.chapter)?.push(row);
  }

  // eslint-disable-next-line no-console
  console.log(`[seed:${seederName}] found ${chapterOrder.length} chapters`);

  for (let i = 0; i < chapterOrder.length; i += 1) {
    const chapterTitle = chapterOrder[i];
    const chapterRows = chapters.get(chapterTitle) ?? [];
    if (chapterRows.length === 0) continue;

    // eslint-disable-next-line no-console
    console.log(
      `[seed:${seederName}] upserting chapter ${chapterTitle} (${chapterRows.length} words)`,
    );
    const chapter = await prisma.chapter.upsert({
      where: { levelId_title: { levelId: level.id, title: chapterTitle } },
      update: { order: i + 1 },
      create: { levelId: level.id, title: chapterTitle, order: i + 1 },
    });

    const words = chapterRows
      .filter((data) => data && data.korean && data.translation)
      .map((data, index) => ({
        id: data.id,
        chapterId: chapter.id,
        korean: data.korean,
        translation: {
          en: data.translation ?? "",
          ru: null,
          uz: null,
        },
        order: Number.isFinite(Number(data.order)) ? Number(data.order) : index + 1,
        audio: getAudioPath(data.id),
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
