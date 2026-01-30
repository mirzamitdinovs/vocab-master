const fs = require("node:fs");
const path = require("node:path");

const languageTitle = "Korean";
const topicPrefix = "Topic 1";
const baseDir = path.join(__dirname);

function listChapterFiles() {
  const entries = fs.readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name);

  return entries.sort((a, b) => {
    const getNum = (value) => {
      const match = value.match(/\d+/);
      return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
    };
    const aNum = getNum(a);
    const bNum = getNum(b);
    if (aNum !== bNum) return aNum - bNum;
    return a.localeCompare(b);
  });
}

async function down(prisma) {
  await prisma.language.deleteMany({ where: { title: languageTitle } });
}

async function up(prisma) {
  const language = await prisma.language.upsert({
    where: { title: languageTitle },
    update: {},
    create: { title: languageTitle, order: 1 },
  });

  const level = await prisma.level.upsert({
    where: { languageId_title: { languageId: language.id, title: topicPrefix } },
    update: { order: 1 },
    create: { languageId: language.id, title: topicPrefix, order: 1 },
  });

  const chapterFiles = listChapterFiles();
  for (let i = 0; i < chapterFiles.length; i += 1) {
    const filePath = path.join(baseDir, chapterFiles[i]);
    const chapterWords = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (!Array.isArray(chapterWords) || chapterWords.length === 0) continue;

    const chapterTitle = chapterFiles[i].replace(/_/g, " ").replace(/\.json$/, "");
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
      await prisma.word.createMany({ data: words, skipDuplicates: true });
    }
  }
}

module.exports = { up, down };
