import { getRequestConfig } from 'next-intl/server';

const locales = ['en', 'ru', 'uz'] as const;

export default getRequestConfig(async ({ locale }) => {
  const normalized = locales.includes(locale as typeof locales[number])
    ? (locale as typeof locales[number])
    : 'en';

  return {
    locale: normalized,
    messages: (await import(`./src/messages/${normalized}.json`)).default,
  };
});
