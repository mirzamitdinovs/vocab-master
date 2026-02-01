import { redirect } from "next/navigation";

export default function LocaleHome({
  params,
}: {
  params: { lang: string };
}) {
  redirect(`/${params.lang}/words`);
}
