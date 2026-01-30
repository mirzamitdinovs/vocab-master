import { makeExecutableSchema } from "@graphql-tools/schema";
import { prisma } from "@/lib/prisma";
import { parseCsvOrThrow } from "@/lib/csv";

const typeDefs = /* GraphQL */ `
  type User {
    id: ID!
    name: String!
    phone: String!
  }

  type Vocabulary {
    id: ID!
    order: Int
    korean: String!
    translation: String!
    chapter: String!
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

  type Query {
    health: String!
    user(id: ID, phone: String): User
    chapters(userId: ID!): [String!]!
    sessionWords(userId: ID!, chapters: [String!], limit: Int): [Vocabulary!]!
    stats(userId: ID!): UserStatSummary!
  }

  type Mutation {
    upsertUser(name: String!, phone: String!): User!
    importVocabulary(userId: ID!, csv: String!): ImportResult!
    recordAnswer(userId: ID!, wordId: ID!, correct: Boolean!): WordStat!
    completeSession(userId: ID!): UserStatSummary!
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
    chapters: async (_: unknown, args: { userId: string }) => {
      const rows = await prisma.vocabulary.findMany({
        where: { userId: args.userId },
        distinct: ["chapter"],
        select: { chapter: true },
        orderBy: { chapter: "asc" },
      });
      return rows.map((r: { chapter: string }) => r.chapter);
    },
    sessionWords: async (
      _: unknown,
      args: { userId: string; chapters?: string[]; limit?: number }
    ) => {
      const take = Math.min(Math.max(args.limit ?? 20, 1), 200);
      return prisma.vocabulary.findMany({
        where: {
          userId: args.userId,
          ...(args.chapters && args.chapters.length > 0
            ? { chapter: { in: args.chapters } }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take,
      });
    },
    stats: async (_: unknown, args: { userId: string }) => {
      const [wordAgg, totalWords, userStat] = await Promise.all([
        prisma.wordStat.aggregate({
          where: { userId: args.userId },
          _sum: { correctCount: true, incorrectCount: true },
        }),
        prisma.vocabulary.count({ where: { userId: args.userId } }),
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
  },
  Mutation: {
    upsertUser: async (_: unknown, args: { name: string; phone: string }) => {
      const existing = await prisma.user.findUnique({ where: { phone: args.phone } });
      if (existing) {
        return prisma.user.update({
          where: { id: existing.id },
          data: { name: args.name },
        });
      }

      const user = await prisma.user.create({
        data: { name: args.name, phone: args.phone },
      });
      await prisma.userStat.create({ data: { userId: user.id } });
      return user;
    },
    importVocabulary: async (_: unknown, args: { userId: string; csv: string }) => {
      try {
        const rows = parseCsvOrThrow(args.csv);
        if (rows.length === 0) {
          return { inserted: 0, skipped: 0, errors: ["CSV has no rows."] };
        }

        const data = rows.map((row) => ({
          userId: args.userId,
          order: row.order ?? undefined,
          korean: row.korean,
          translation: row.translation,
          chapter: row.chapter,
        }));

        const result = await prisma.vocabulary.createMany({
          data,
          skipDuplicates: true,
        });

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
    recordAnswer: async (
      _: unknown,
      args: { userId: string; wordId: string; correct: boolean }
    ) => {
      const existing = await prisma.wordStat.findUnique({
        where: { userId_wordId: { userId: args.userId, wordId: args.wordId } },
      });

      const isFirstCorrect = args.correct && (!existing || existing.correctCount === 0);

      const updated = await prisma.wordStat.upsert({
        where: { userId_wordId: { userId: args.userId, wordId: args.wordId } },
        create: {
          userId: args.userId,
          wordId: args.wordId,
          correctCount: args.correct ? 1 : 0,
          incorrectCount: args.correct ? 0 : 1,
          lastSeenAt: new Date(),
        },
        update: {
          correctCount: { increment: args.correct ? 1 : 0 },
          incorrectCount: { increment: args.correct ? 0 : 1 },
          lastSeenAt: new Date(),
        },
      });

      if (isFirstCorrect) {
        await prisma.userStat.upsert({
          where: { userId: args.userId },
          create: { userId: args.userId, wordsLearned: 1 },
          update: { wordsLearned: { increment: 1 } },
        });
      }

      return updated;
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
        prisma.vocabulary.count({ where: { userId: args.userId } }),
      ]);

      return {
        wordsLearned: updated.wordsLearned,
        sessionsCompleted: updated.sessionsCompleted,
        totalWords,
        correctTotal: wordAgg._sum.correctCount ?? 0,
        incorrectTotal: wordAgg._sum.incorrectCount ?? 0,
      };
    },
  },
};

export const schema = makeExecutableSchema({ typeDefs, resolvers });
