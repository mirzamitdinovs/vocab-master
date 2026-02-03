'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LearningLanguage } from '@/components/learning-language';
import { LearningTopic } from '@/components/learning-topic';
import { LearningLesson } from '@/components/learning-lesson';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

export default function QuizPage() {
  return <QuizView />;
}

function QuizView() {
  const [chapterId, setChapterId] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();

  function startQuiz() {
    if (!chapterId) return;
    setLoading(true);
    router.push(`/${locale}/quiz/${chapterId}`);
  }

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle>{t('quiz.title')}</CardTitle>
          <CardDescription>{t('quiz.startHint')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <LearningLanguage />
            <LearningTopic />
            <LearningLesson onChange={(chapter) => setChapterId(chapter?.id ?? '')} />
          </div>
          <Button
            className="w-full h-12 text-base bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:opacity-90"
            onClick={startQuiz}
            disabled={loading || !chapterId}
          >
            {loading ? t('session.loading') : t('session.startSession')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
