'use client';

import { useEffect, useState } from 'react';
import {
  LANGUAGE_STORAGE_KEY,
  LEVEL_STORAGE_KEY,
} from '@/components/learning-language';
import { LearningLanguage } from '@/components/learning-language';
import { LearningTopic } from '@/components/learning-topic';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

export function SessionSetupModal() {
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [selectedLanguageId, setSelectedLanguageId] = useState('');
  const [missingSelectionsOpen, setMissingSelectionsOpen] = useState(false);
  const t = useTranslations();

  useEffect(() => {
    const storedLevel = localStorage.getItem(LEVEL_STORAGE_KEY) ?? '';
    const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? '';
    setSelectedLevelId(storedLevel);
    setSelectedLanguageId(storedLanguage);
    const handleUpdate = () => {
      const nextLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? '';
      const nextLevel = localStorage.getItem(LEVEL_STORAGE_KEY) ?? '';
      setSelectedLanguageId(nextLanguage);
      setSelectedLevelId(nextLevel);
    };
    window.addEventListener('learning-language-updated', handleUpdate);
    window.addEventListener('learning-topic-updated', handleUpdate);
    return () => {
      window.removeEventListener('learning-language-updated', handleUpdate);
      window.removeEventListener('learning-topic-updated', handleUpdate);
    };
  }, []);

  useEffect(() => {
    const missing = !selectedLanguageId || !selectedLevelId;
    setMissingSelectionsOpen(missing);
  }, [selectedLanguageId, selectedLevelId]);

  return (
    <Dialog
      open={missingSelectionsOpen}
      onOpenChange={setMissingSelectionsOpen}
    >
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:w-full">
        <DialogHeader>
          <DialogTitle>{t('session.finishSetup')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('session.finishDesc')}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <LearningLanguage mode="inline" />
            <LearningTopic mode="inline" />
          </div>
          <Button
            className="w-full h-12 text-base"
            onClick={() => setMissingSelectionsOpen(false)}
            disabled={!selectedLanguageId || !selectedLevelId}
          >
            {t('session.start')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
