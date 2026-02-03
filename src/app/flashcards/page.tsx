'use client';

import { useState } from 'react';
import { UserGate } from '@/components/user-gate';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LearningLanguage } from '@/components/learning-language';
import { LearningTopic } from '@/components/learning-topic';
import { LearningLesson } from '@/components/learning-lesson';
import { graphqlRequest } from '@/lib/graphql/client';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

export default function FlashcardsPage() {
  return <UserGate>{() => <FlashcardsView />}</UserGate>;
}

function FlashcardsView() {
  const [chapterId, setChapterId] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const wordsCachePrefix = 'vocab-master-words:chapter:';

  async function startSession() {
    if (!chapterId) return;
    setLoading(true);
    const cacheKey = `${wordsCachePrefix}${chapterId}`;
    if (!localStorage.getItem(cacheKey)) {
      try {
        const data = await graphqlRequest<{
          words: {
            id: string;
            chapterId: string;
            korean: string;
            translations?: {
              en?: string | null;
              ru?: string | null;
              uz?: string | null;
            };
            order?: number | null;
            audio?: string | null;
          }[];
        }>(
          `query Words($chapterId: ID!) {
            words(chapterId: $chapterId) {
              id
              chapterId
              korean
              translations {
                en
                ru
                uz
              }
              order
              audio
            }
          }`,
          { chapterId },
        );
        localStorage.setItem(cacheKey, JSON.stringify(data.words));
      } catch {
        // ignore caching errors, still start session
      }
    }
    router.push(`/${locale}/flashcards/${chapterId}`);
    setLoading(false);
  }

  return (
    <div className="h-full w-full px-6 flex items-center justify-center">
      <Card className="w-full max-w-3xl border bg-white/90 shadow-sm">
        <CardContent className="space-y-6 p-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <LearningLanguage />
            <LearningTopic />
            <LearningLesson
              onChange={(chapter) => {
                const nextId = chapter?.id ?? '';
                setChapterId(nextId);
                if (nextId && chapter?.title) {
                  const storedTitle =
                    typeof chapter.title === 'string'
                      ? chapter.title
                      : JSON.stringify(chapter.title);
                  sessionStorage.setItem(
                    `flashcards-lesson-title-${nextId}`,
                    storedTitle,
                  );
                }
              }}
            />
          </div>
          <Button
            className="w-full h-12 text-base bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:opacity-90"
            onClick={startSession}
            disabled={loading || !chapterId}
          >
            {loading ? t('session.loading') : t('session.startSession')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
