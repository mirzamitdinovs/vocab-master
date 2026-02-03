import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { LayoutShell } from '@/components/layout-shell';
import { getMessages } from '@/i18n/messages';

const locales = new Set(['en', 'ru', 'uz']);

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { lang: string };
}) {
  const locale = params.lang;
  if (!locales.has(locale)) {
    notFound();
  }
  const messages = await getMessages(locale);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LayoutShell>{children}</LayoutShell>
    </NextIntlClientProvider>
  );
}
