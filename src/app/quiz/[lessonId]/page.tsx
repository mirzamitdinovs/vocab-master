'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { UserGate, type User } from '@/components/user-gate';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { graphqlRequest } from '@/lib/graphql/client';
import { useLocale, useTranslations } from 'next-intl';

type Vocabulary = {
  id: string;
  order?: number | null;
  korean: string;
  translation?: string | null;
  translations?: { en?: string | null; ru?: string | null; uz?: string | null };
};

const GROUP_SIZE = 20;

export default function QuizLessonGroupsPage() {
  return <UserGate>{(user) => <QuizLessonGroupsView user={user} />}</UserGate>;
}

function QuizLessonGroupsView({ user }: { user: User }) {
  const params = useParams();
  const router = useRouter();
  const lessonId = Array.isArray(params.lessonId)
    ? params.lessonId[0]
    : params.lessonId;
  const locale = useLocale();
  const t = useTranslations();
  const [words, setWords] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const wordsCachePrefix = 'vocab-master-words:chapter:';
  const resumePrefix = lessonId ? `quiz-session:${lessonId}:group:` : '';

  useEffect(() => {
    async function loadWords() {
      if (!lessonId) return;
      setLoading(true);
      const cacheKey = `${wordsCachePrefix}${lessonId}`;
      let list: Vocabulary[] | null = null;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          list = JSON.parse(cached) as Vocabulary[];
        } catch {
          localStorage.removeItem(cacheKey);
        }
      }
      if (!list) {
        const data = await graphqlRequest<{ sessionWords: Vocabulary[] }>(
          `query SessionWords($userId: ID!, $chapterIds: [ID!]!, $limit: Int) {
            sessionWords(userId: $userId, chapterIds: $chapterIds, limit: $limit) {
              id
              order
              korean
              translations {
                en
                ru
                uz
              }
            }
          }`,
          { userId: user.id, chapterIds: [lessonId], limit: null },
        );
        list = data.sessionWords ?? [];
        localStorage.setItem(cacheKey, JSON.stringify(list));
      }
      if (list.length > 0 && list.some((word) => word.order != null)) {
        list = [...list].sort(
          (a, b) =>
            (a.order ?? Number.MAX_SAFE_INTEGER) -
            (b.order ?? Number.MAX_SAFE_INTEGER),
        );
      }
      setWords(list);
      setLoading(false);
    }
    loadWords();
  }, [lessonId, user.id]);

  const groups = useMemo(() => {
    const chunks: Vocabulary[][] = [];
    for (let i = 0; i < words.length; i += GROUP_SIZE) {
      chunks.push(words.slice(i, i + GROUP_SIZE));
    }
    return chunks;
  }, [words]);

  const totalGroups = groups.length;

  return (
    <div className="p-4 space-y-4">
      <header className="border-b rounded-lg bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={t('flashcards.back')}
          >
            <Link href={`/${locale}/quiz`}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1 text-center">
            <div className="text-sm font-semibold text-foreground">
              {t('quiz.title')}
            </div>
            <div className="text-xs text-muted-foreground">
              {loading
                ? t('flashcards.loading')
                : t('quiz.groupCount', {
                    total: totalGroups,
                    words: words.length,
                  })}
            </div>
          </div>
          <div className="w-9" />
        </div>
      </header>

      {loading ? (
        <div className="text-center text-sm text-muted-foreground">
          {t('flashcards.loadingSession')}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground">
          {t('flashcards.noWords')}
        </div>
      ) : (
        <div className="grid gap-3">
          {groups.map((group, index) => {
            const groupId = String(index + 1);
            const start = index * GROUP_SIZE + 1;
            const end = start + group.length - 1;
            const resumeKey = `${resumePrefix}${groupId}`;
            const hasResume = Boolean(localStorage.getItem(resumeKey));
            return (
              <Card key={groupId} className="border bg-white shadow-sm">
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <div className="text-base font-semibold">
                      {t('quiz.groupLabel', { index: groupId })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('quiz.groupRange', { start, end })}
                    </div>
                  </div>
                  <Button
                    className={`h-10 ${
                      hasResume
                        ? 'bg-emerald-500 text-white hover:opacity-90'
                        : 'bg-blue-500 text-white hover:opacity-90'
                    }`}
                    onClick={() => {
                      if (!hasResume) {
                        const orderIds = [...group]
                          .sort(() => Math.random() - 0.5)
                          .map((word) => word.id);
                        localStorage.setItem(
                          resumeKey,
                          JSON.stringify({
                            index: 0,
                            orderIds,
                            answers: [],
                            showResults: false,
                          }),
                        );
                      }
                      router.push(`/${locale}/quiz/${lessonId}/${groupId}`);
                    }}
                  >
                    {hasResume
                      ? t('session.continueSession')
                      : t('session.startSession')}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
