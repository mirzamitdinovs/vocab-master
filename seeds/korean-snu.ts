import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

const seederName = "korean-snu";
const languageKey = "Korean_Language";
const languageValue = "Korean";
const assetsBase = path.join(process.cwd(), "..", "assets");
const snuIndexPath = path.join(assetsBase, "korean", "snu", "index.json");
const audioBaseUrl = "https://storage.googleapis.com/snu-1b-5b-audio";

type IndexFile = {
  books: Array<{
    id: string;
    title: Record<string, string>;
    chapters: Array<{
      id: string;
      title: Record<string, string>;
      csv: string;
      audio: string | null;
    }>;
  }>;
};

type CsvRow = {
  id: string;
  order?: string;
  korean: string;
  uz: string;
  en: string;
  ru: string;
};

function loadIndex(): IndexFile {
  const raw = fs.readFileSync(snuIndexPath, "utf-8");
  return JSON.parse(raw) as IndexFile;
}

function loadCsvRows(csvPath: string): CsvRow[] {
  const raw = fs.readFileSync(csvPath, "utf-8");
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[];
}

function stringifyTitle(title: Record<string, string>) {
  return JSON.stringify(title);
}

function audioUrl(bookId: string, chapterId: string, wordId: string) {
  return `${audioBaseUrl}/${bookId}/${chapterId}/${wordId}.mp3`;
}

async function down(prisma: { [key: string]: any }) {
  // eslint-disable-next-line no-console
  console.log(`[seed:${seederName}] removing language ${languageValue}`);
  await prisma.language.deleteMany({ where: { key: languageKey } });
}

async function up(prisma: { [key: string]: any }) {
  const index = loadIndex();

  // eslint-disable-next-line no-console
  console.log(`[seed:${seederName}] upserting language ${languageValue}`);
  const language = await prisma.language.upsert({
    where: { key: languageKey },
    update: {},
    create: { key: languageKey, value: languageValue, order: 1 },
  });

  for (let i = 0; i < index.books.length; i += 1) {
    const book = index.books[i];
    const levelTitle = stringifyTitle(book.title);

    // eslint-disable-next-line no-console
    console.log(`[seed:${seederName}] upserting level ${book.id}`);
    const level = await prisma.level.upsert({
      where: { languageId_title: { languageId: language.id, title: levelTitle } },
      update: { order: i + 1 },
      create: { languageId: language.id, title: levelTitle, order: i + 1 },
    });

    for (let j = 0; j < book.chapters.length; j += 1) {
      const chapterMeta = book.chapters[j];
      const chapterTitle = stringifyTitle(chapterMeta.title);
      const chapter = await prisma.chapter.upsert({
        where: { levelId_title: { levelId: level.id, title: chapterTitle } },
        update: { order: j + 1 },
        create: { levelId: level.id, title: chapterTitle, order: j + 1 },
      });

      const csvPath = path.join(assetsBase, "korean", "snu", chapterMeta.csv);
      const rows = loadCsvRows(csvPath);
      const words = rows
        .filter((row) => row.korean)
        .map((row, index) => ({
          chapterId: chapter.id,
          korean: row.korean,
          translation: {
            uz: row.uz ?? "",
            en: row.en ?? "",
            ru: row.ru ?? "",
          },
          order: Number.isFinite(Number(row.order)) ? Number(row.order) : index + 1,
          audio: audioUrl(book.id, chapterMeta.id, row.id),
        }));

      if (words.length > 0) {
        const result = await prisma.word.createMany({
          data: words,
          skipDuplicates: true,
        });
        // eslint-disable-next-line no-console
        console.log(
          `[seed:${seederName}] inserted ${result.count}/${words.length} words for ${book.id}:${chapterMeta.id}`,
        );
      }
    }
  }
}

const seeder = { up, down, name: seederName };
export default seeder;
