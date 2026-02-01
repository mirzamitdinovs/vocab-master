import { makeExecutableSchema } from "@graphql-tools/schema";
import { PrismaClient } from "@prisma/client";
import { parseTopicCsvOrThrow } from "@/lib/csv";

const prisma = new PrismaClient();

const normalizeTranslations = (value: unknown) => {
  if (!value) {
    return { en: "", ru: null, uz: null };
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed) as { en?: string; ru?: string; uz?: string };
        return {
          en: parsed.en ?? "",
          ru: parsed.ru ?? null,
          uz: parsed.uz ?? null,
        };
      } catch {
        return { en: value, ru: null, uz: null };
      }
    }
    return { en: value, ru: null, uz: null };
  }
  if (typeof value !== "object") {
    return { en: String(value), ru: null, uz: null };
  }
  const record = value as { en?: string; ru?: string; uz?: string };
  return {
    en: record.en ?? "",
    ru: record.ru ?? null,
    uz: record.uz ?? null,
  };
};

const normalizeWord = (word: any) => {
  const translations = normalizeTranslations(word.translation);
  return {
    ...word,
    translation: translations.en ?? "",
    translations,
  };
};

const typeDefs = /* GraphQL */ `
  type User {
    id: ID!
    name: String!
    phone: String!
    isAdmin: Boolean!
  }

  type Language {
    id: ID!
    key: String!
    value: String!
    description: String
    order: Int!
  }

  type Level {
    id: ID!
    languageId: ID!
    title: String!
    order: Int!
  }

  type Chapter {
    id: ID!
    levelId: ID!
    title: String!
    order: Int!
  }

  type Word {
    id: ID!
    chapterId: ID!
    korean: String!
    translation: String!
    translations: Translations!
    order: Int!
    audio: String
  }

  type CatalogWord {
    id: ID!
    chapterId: ID!
    korean: String!
    translation: String!
    translations: Translations!
    order: Int!
    audio: String
  }

  type CatalogChapter {
    id: ID!
    levelId: ID!
    title: String!
    order: Int!
    words: [CatalogWord!]!
  }

  type CatalogLevel {
    id: ID!
    languageId: ID!
    title: String!
    order: Int!
    chapters: [CatalogChapter!]!
  }

  type CatalogLanguage {
    id: ID!
    key: String!
    value: String!
    description: String
    order: Int!
    levels: [CatalogLevel!]!
  }

  type Translations {
    en: String
    ru: String
    uz: String
  }

  type LearningSettings {
    id: ID!
    userId: ID!
    learnSessionSize: Int!
    reviewSessionSize: Int!
    speedReviewSessionSize: Int!
    enableTyping: Boolean!
    enableTapping: Boolean!
    enableListening: Boolean!
  }

  type WordStat {
    id: ID!
    wordId: ID!
    correctCount: Int!
    incorrectCount: Int!
    lastSeenAt: String
  }

  type UserStatSummary {
    wordsLearned: Int!
    sessionsCompleted: Int!
    totalWords: Int!
    correctTotal: Int!
    incorrectTotal: Int!
  }

  type ImportResult {
    inserted: Int!
    skipped: Int!
    errors: [String!]!
  }

  input AnswerInput {
    wordId: ID!
    correct: Boolean!
  }

  type Query {
    health: String!
    user(id: ID, phone: String): User
    languages: [Language!]!
    levels(languageId: ID!): [Level!]!
    chapters(levelId: ID!): [Chapter!]!
    words(chapterId: ID!): [Word!]!
    wordsCatalog: [CatalogLanguage!]!
    sessionWords(userId: ID!, chapterIds: [ID!]!, limit: Int): [Word!]!
    stats(userId: ID!): UserStatSummary!
    learningSettings(userId: ID!): LearningSettings
  }

  type Mutation {
    upsertUser(name: String!, phone: String!): User!
    recordAnswer(userId: ID!, wordId: ID!, correct: Boolean!): WordStat!
    recordAnswers(userId: ID!, answers: [AnswerInput!]!): Boolean!
    completeSession(userId: ID!): UserStatSummary!
    updateUser(userId: ID!, name: String!, phone: String!): User!
    clearWords(userId: ID!): Boolean!
    deleteUser(userId: ID!): Boolean!
    createLanguage(userId: ID!, key: String!, value: String!, description: String, order: Int): Language!
    updateLanguage(userId: ID!, languageId: ID!, key: String!, value: String!, description: String, order: Int): Language!
    deleteLanguage(userId: ID!, languageId: ID!): Boolean!
    createLevel(userId: ID!, languageId: ID!, title: String!, order: Int): Level!
    updateLevel(userId: ID!, levelId: ID!, title: String!, order: Int): Level!
    deleteLevel(userId: ID!, levelId: ID!): Boolean!
    createChapter(userId: ID!, levelId: ID!, title: String!, order: Int): Chapter!
    updateChapter(userId: ID!, chapterId: ID!, title: String!, order: Int): Chapter!
    deleteChapter(userId: ID!, chapterId: ID!): Boolean!
    createWord(userId: ID!, chapterId: ID!, korean: String!, translation: String!, order: Int, audio: String): Word!
    updateWord(userId: ID!, wordId: ID!, korean: String!, translation: String!, order: Int, audio: String): Word!
    deleteWord(userId: ID!, wordId: ID!): Boolean!
    importWords(userId: ID!, chapterId: ID!, csv: String!): ImportResult!
    updateLearningSettings(userId: ID!, learnSessionSize: Int, reviewSessionSize: Int, speedReviewSessionSize: Int, enableTyping: Boolean, enableTapping: Boolean, enableListening: Boolean): LearningSettings!
  }
`;

const resolvers = {
  Query: {
    health: () => "ok",
    user: async (_: unknown, args: { id?: string; phone?: string }) => {
      if (args.id) {
        return prisma.user.findUnique({ where: { id: args.id } });
      }
      if (args.phone) {
        return prisma.user.findUnique({ where: { phone: args.phone } });
      }
      return null;
    },
    languages: async () => {
      return prisma.language.findMany({
        orderBy: { order: "asc" },
        select: {
          id: true,
          key: true,
          value: true,
          description: true,
          order: true,
          createdAt: true,
        },
      });
    },
    levels: async (_: unknown, args: { languageId: string }) => {
      return prisma.level.findMany({
        where: { languageId: args.languageId },
        orderBy: { order: "asc" },
      });
    },
    chapters: async (_: unknown, args: { levelId: string }) => {
      return prisma.chapter.findMany({
        where: { levelId: args.levelId },
        orderBy: { order: "asc" },
      });
    },
    words: async (_: unknown, args: { chapterId: string }) => {
      const rows = await prisma.word.findMany({
        where: { chapterId: args.chapterId },
        orderBy: { order: "asc" },
      });
      return rows.map(normalizeWord);
    },
    wordsCatalog: async () => {
      const languages = await prisma.language.findMany({
        orderBy: { order: "asc" },
        include: {
          levels: {
            orderBy: { order: "asc" },
            include: {
              chapters: {
                orderBy: { order: "asc" },
                include: {
                  words: { orderBy: { order: "asc" } },
                },
              },
            },
          },
        },
      });

      return languages.map((language) => ({
        ...language,
        levels: language.levels.map((level) => ({
          ...level,
          chapters: level.chapters.map((chapter) => ({
            ...chapter,
            words: chapter.words.map(normalizeWord),
          })),
        })),
      }));
    },
    sessionWords: async (
      _: unknown,
      args: { userId: string; chapterIds: string[]; limit?: number }
    ) => {
      const take = args.limit == null ? undefined : Math.min(Math.max(args.limit, 1), 200);
      const rows = await prisma.word.findMany({
        where: {
          chapterId: { in: args.chapterIds },
          NOT: {
            progress: {
              some: {
                userId: args.userId,
                learnedAt: { not: null },
              },
            },
          },
        },
        orderBy: { order: "asc" },
        ...(take ? { take } : {}),
      });
      return rows.map(normalizeWord);
    },
    stats: async (_: unknown, args: { userId: string }) => {
      const [wordAgg, totalWords, userStat] = await Promise.all([
        prisma.wordStat.aggregate({
          where: { userId: args.userId },
          _sum: { correctCount: true, incorrectCount: true },
        }),
        prisma.word.count(),
        prisma.userStat.findUnique({ where: { userId: args.userId } }),
      ]);

      return {
        wordsLearned: userStat?.wordsLearned ?? 0,
        sessionsCompleted: userStat?.sessionsCompleted ?? 0,
        totalWords,
        correctTotal: wordAgg._sum.correctCount ?? 0,
        incorrectTotal: wordAgg._sum.incorrectCount ?? 0,
      };
    },
    learningSettings: async (_: unknown, args: { userId: string }) => {
      return prisma.learningSettings.findUnique({ where: { userId: args.userId } });
    },
  },
  Mutation: {
    upsertUser: async (_: unknown, args: { name: string; phone: string }) => {
      const isAdmin = args.phone === "+998901202467";
      const existing = await prisma.user.findUnique({ where: { phone: args.phone } });
      if (existing) {
        return prisma.user.update({
          where: { id: existing.id },
          data: { name: args.name, isAdmin },
        });
      }

      const user = await prisma.user.create({
        data: { name: args.name, phone: args.phone, isAdmin },
      });
      await prisma.userStat.create({ data: { userId: user.id } });
      await prisma.learningSettings.create({ data: { userId: user.id } });
      return user;
    },
    recordAnswer: async (_: unknown, args: { userId: string; wordId: string; correct: boolean }) => {
      return applyAnswer(args.userId, args.wordId, args.correct);
    },
    recordAnswers: async (_: unknown, args: { userId: string; answers: { wordId: string; correct: boolean }[] }) => {
      for (const answer of args.answers) {
        await applyAnswer(args.userId, answer.wordId, answer.correct);
      }
      return true;
    },
    completeSession: async (_: unknown, args: { userId: string }) => {
      const updated = await prisma.userStat.upsert({
        where: { userId: args.userId },
        create: { userId: args.userId, sessionsCompleted: 1 },
        update: { sessionsCompleted: { increment: 1 } },
      });

      const [wordAgg, totalWords] = await Promise.all([
        prisma.wordStat.aggregate({
          where: { userId: args.userId },
          _sum: { correctCount: true, incorrectCount: true },
        }),
        prisma.word.count(),
      ]);

      return {
        wordsLearned: updated.wordsLearned,
        sessionsCompleted: updated.sessionsCompleted,
        totalWords,
        correctTotal: wordAgg._sum.correctCount ?? 0,
        incorrectTotal: wordAgg._sum.incorrectCount ?? 0,
      };
    },
    updateUser: async (_: unknown, args: { userId: string; name: string; phone: string }) => {
      const isAdmin = args.phone === "+998901202467";
      return prisma.user.update({
        where: { id: args.userId },
        data: { name: args.name, phone: args.phone, isAdmin },
      });
    },
    clearWords: async (_: unknown, args: { userId: string }) => {
      await prisma.wordStat.deleteMany({ where: { userId: args.userId } });
      await prisma.wordProgress.deleteMany({ where: { userId: args.userId } });
      await prisma.userStat.upsert({
        where: { userId: args.userId },
        create: { userId: args.userId },
        update: { wordsLearned: 0, sessionsCompleted: 0 },
      });
      return true;
    },
    deleteUser: async (_: unknown, args: { userId: string }) => {
      await prisma.user.delete({ where: { id: args.userId } });
      return true;
    },
    createLanguage: async (
      _: unknown,
      args: { userId: string; key: string; value: string; description?: string | null; order?: number | null }
    ) => {
      await requireAdmin(args.userId);
      return prisma.language.create({
        data: { key: args.key, value: args.value, description: args.description ?? undefined, order: args.order ?? 0 },
      });
    },
    updateLanguage: async (
      _: unknown,
      args: { userId: string; languageId: string; key: string; value: string; description?: string | null; order?: number | null }
    ) => {
      await requireAdmin(args.userId);
      return prisma.language.update({
        where: { id: args.languageId },
        data: { key: args.key, value: args.value, description: args.description ?? undefined, order: args.order ?? 0 },
      });
    },
    deleteLanguage: async (_: unknown, args: { userId: string; languageId: string }) => {
      await requireAdmin(args.userId);
      await prisma.language.delete({ where: { id: args.languageId } });
      return true;
    },
    createLevel: async (_: unknown, args: { userId: string; languageId: string; title: string; order?: number | null }) => {
      await requireAdmin(args.userId);
      return prisma.level.create({
        data: { languageId: args.languageId, title: args.title, order: args.order ?? 0 },
      });
    },
    updateLevel: async (_: unknown, args: { userId: string; levelId: string; title: string; order?: number | null }) => {
      await requireAdmin(args.userId);
      return prisma.level.update({
        where: { id: args.levelId },
        data: { title: args.title, order: args.order ?? 0 },
      });
    },
    deleteLevel: async (_: unknown, args: { userId: string; levelId: string }) => {
      await requireAdmin(args.userId);
      await prisma.level.delete({ where: { id: args.levelId } });
      return true;
    },
    createChapter: async (_: unknown, args: { userId: string; levelId: string; title: string; order?: number | null }) => {
      await requireAdmin(args.userId);
      return prisma.chapter.create({
        data: { levelId: args.levelId, title: args.title, order: args.order ?? 0 },
      });
    },
    updateChapter: async (_: unknown, args: { userId: string; chapterId: string; title: string; order?: number | null }) => {
      await requireAdmin(args.userId);
      return prisma.chapter.update({
        where: { id: args.chapterId },
        data: { title: args.title, order: args.order ?? 0 },
      });
    },
    deleteChapter: async (_: unknown, args: { userId: string; chapterId: string }) => {
      await requireAdmin(args.userId);
      await prisma.chapter.delete({ where: { id: args.chapterId } });
      return true;
    },
    createWord: async (
      _: unknown,
      args: { userId: string; chapterId: string; korean: string; translation: string; order?: number | null; audio?: string | null }
    ) => {
      await requireAdmin(args.userId);
      const word = await prisma.word.create({
        data: {
          chapterId: args.chapterId,
          korean: args.korean,
          translation: { en: args.translation, ru: null, uz: null },
          order: args.order ?? 0,
          audio: args.audio ?? null,
        },
      });
      return normalizeWord(word);
    },
    updateWord: async (
      _: unknown,
      args: { userId: string; wordId: string; korean: string; translation: string; order?: number | null; audio?: string | null }
    ) => {
      await requireAdmin(args.userId);
      const word = await prisma.word.update({
        where: { id: args.wordId },
        data: {
          korean: args.korean,
          translation: { en: args.translation, ru: null, uz: null },
          order: args.order ?? 0,
          audio: args.audio ?? null,
        },
      });
      return normalizeWord(word);
    },
    deleteWord: async (_: unknown, args: { userId: string; wordId: string }) => {
      await requireAdmin(args.userId);
      await prisma.word.delete({ where: { id: args.wordId } });
      return true;
    },
    importWords: async (_: unknown, args: { userId: string; chapterId: string; csv: string }) => {
      await requireAdmin(args.userId);
      try {
        const rows = parseTopicCsvOrThrow(args.csv);
        if (rows.length === 0) {
          return { inserted: 0, skipped: 0, errors: ["CSV has no rows."] };
        }
        const data = rows.map((row) => ({
          chapterId: args.chapterId,
          order: row.order ?? 0,
          korean: row.korean,
          translation: { en: row.translation, ru: null, uz: null },
        }));
        const result = await prisma.word.createMany({ data, skipDuplicates: true });
        return {
          inserted: result.count,
          skipped: Math.max(data.length - result.count, 0),
          errors: [],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid CSV.";
        return { inserted: 0, skipped: 0, errors: [message] };
      }
    },
    updateLearningSettings: async (
      _: unknown,
      args: {
        userId: string;
        learnSessionSize?: number | null;
        reviewSessionSize?: number | null;
        speedReviewSessionSize?: number | null;
        enableTyping?: boolean | null;
        enableTapping?: boolean | null;
        enableListening?: boolean | null;
      }
    ) => {
      return prisma.learningSettings.upsert({
        where: { userId: args.userId },
        create: {
          userId: args.userId,
          learnSessionSize: args.learnSessionSize ?? 10,
          reviewSessionSize: args.reviewSessionSize ?? 10,
          speedReviewSessionSize: args.speedReviewSessionSize ?? 15,
          enableTyping: args.enableTyping ?? true,
          enableTapping: args.enableTapping ?? true,
          enableListening: args.enableListening ?? true,
        },
        update: {
          ...(args.learnSessionSize != null ? { learnSessionSize: args.learnSessionSize } : {}),
          ...(args.reviewSessionSize != null ? { reviewSessionSize: args.reviewSessionSize } : {}),
          ...(args.speedReviewSessionSize != null
            ? { speedReviewSessionSize: args.speedReviewSessionSize }
            : {}),
          ...(args.enableTyping != null ? { enableTyping: args.enableTyping } : {}),
          ...(args.enableTapping != null ? { enableTapping: args.enableTapping } : {}),
          ...(args.enableListening != null ? { enableListening: args.enableListening } : {}),
        },
      });
    },
  },
};

async function requireAdmin(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.isAdmin) {
    throw new Error("Not authorized.");
  }
}

async function applyAnswer(userId: string, wordId: string, correct: boolean) {
  const existing = await prisma.wordStat.findUnique({
    where: { userId_wordId: { userId, wordId } },
  });
  const existingProgress = await prisma.wordProgress.findUnique({
    where: { userId_wordId: { userId, wordId } },
  });

  const isFirstCorrect = correct && (!existing || existing.correctCount === 0);
  const shouldLearn = correct && !existingProgress?.learnedAt;

  await prisma.wordProgress.upsert({
    where: { userId_wordId: { userId, wordId } },
    create: {
      userId,
      wordId,
      learnedAt: shouldLearn ? new Date() : null,
      lastAnswerAt: new Date(),
      correctCount: correct ? 1 : 0,
      incorrectCount: correct ? 0 : 1,
      totalTests: 1,
      streak: correct ? 1 : 0,
    },
    update: {
      learnedAt: shouldLearn ? new Date() : undefined,
      lastAnswerAt: new Date(),
      correctCount: { increment: correct ? 1 : 0 },
      incorrectCount: { increment: correct ? 0 : 1 },
      totalTests: { increment: 1 },
      streak: correct ? { increment: 1 } : { set: 0 },
    },
  });

  const updated = await prisma.wordStat.upsert({
    where: { userId_wordId: { userId, wordId } },
    create: {
      userId,
      wordId,
      correctCount: correct ? 1 : 0,
      incorrectCount: correct ? 0 : 1,
      lastSeenAt: new Date(),
    },
    update: {
      correctCount: { increment: correct ? 1 : 0 },
      incorrectCount: { increment: correct ? 0 : 1 },
      lastSeenAt: new Date(),
    },
  });

  if (isFirstCorrect) {
    await prisma.userStat.upsert({
      where: { userId },
      create: { userId, wordsLearned: 1, points: 1 },
      update: { wordsLearned: { increment: 1 }, points: { increment: 1 } },
    });
  } else {
    await prisma.userStat.upsert({
      where: { userId },
      create: { userId, points: correct ? 1 : 0 },
      update: { points: { increment: correct ? 1 : 0 } },
    });
  }

  return updated;
}

export const schema = makeExecutableSchema({ typeDefs, resolvers });
