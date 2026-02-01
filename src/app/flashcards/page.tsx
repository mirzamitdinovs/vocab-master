'use client';

import { useState } from 'react';
import { UserGate } from '@/components/user-gate';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LearningLanguage } from '@/components/learning-language';
import { LearningTopic } from '@/components/learning-topic';
import { SessionStarter } from '@/components/session-starter';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

export default function FlashcardsPage() {
  return <UserGate>{() => <FlashcardsView />}</UserGate>;
}

function FlashcardsView() {
  const [frontLanguage, setFrontLanguage] = useState<'korean' | 'translation'>(
    'korean',
  );
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();

  function startSession(
    chapterIds: string[],
    _limit?: number | null,
    chapterTitle?: string,
  ) {
    const chapterId = chapterIds[0];
    if (!chapterId) return;
    sessionStorage.setItem('flashcards-front-language', frontLanguage);
    if (chapterTitle) {
      sessionStorage.setItem(
        `flashcards-lesson-title-${chapterId}`,
        chapterTitle,
      );
    }
    router.push(`/${locale}/flashcards/${chapterId}`);
  }

  return (
    <div className="h-full w-full px-6 flex items-center justify-center">
      <Card className="w-full max-w-3xl border bg-white/90 shadow-sm">
        <CardContent className="space-y-6 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <LearningLanguage />
            <LearningTopic />
            <div className="sm:col-span-2">
              <SessionStarter onStart={startSession} label={t('session.startSession')} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">
              {t('flashcards.frontLanguage')}
            </div>
            <div className="grid gap-2 grid-cols-2">
              <Button
                className={`w-full ${
                  frontLanguage === 'korean'
                    ? '!bg-emerald-100 !text-emerald-800'
                    : '!bg-slate-100 !text-slate-700'
                }`}
                variant="outline"
                onClick={() => setFrontLanguage('korean')}
              >
                {t('flashcards.koreanFirst')}
              </Button>
              <Button
                className={`w-full ${
                  frontLanguage === 'translation'
                    ? '!bg-emerald-100 !text-emerald-800'
                    : '!bg-slate-100 !text-slate-700'
                }`}
                variant="outline"
                onClick={() => setFrontLanguage('translation')}
              >
                {t('flashcards.translationFirst')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
