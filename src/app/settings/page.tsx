"use client";

import { useCallback, useEffect, useState } from "react";
import { UserGate, type User } from "@/components/user-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LearningLanguage } from "@/components/learning-language";
import { LearningTopic } from "@/components/learning-topic";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { graphqlRequest } from "@/lib/graphql/client";
import { useTranslations, useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";

const STORAGE_KEY = "vocab-master-user";
const WORDS_CACHE_PREFIX = "vocab-master-words:chapter:";

function clearCachedWords() {
  if (typeof localStorage === "undefined") return;
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith(WORDS_CACHE_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
}

export default function SettingsPage() {
  return (
    <UserGate>
      {(user) => <SettingsView user={user} />}
    </UserGate>
  );
}

function SettingsView({ user }: { user: User }) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [message, setMessage] = useState<string | null>(null);
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setName(user.name);
    setPhone(user.phone);
  }, [user]);


  const handleUpdate = useCallback(async () => {
    const data = await graphqlRequest<{ updateUser: User }>(
      `mutation UpdateUser($userId: ID!, $name: String!, $phone: String!) {
        updateUser(userId: $userId, name: $name, phone: $phone) { id name phone isAdmin }
      }`,
      { userId: user.id, name: name.trim(), phone: phone.trim() }
    );
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data.updateUser));
    setMessage(t("settings.save"));
  }, [user.id, name, phone, t]);

  const handleClearWords = useCallback(async () => {
    await graphqlRequest<{ clearWords: boolean }>(
      `mutation ClearWords($userId: ID!) { clearWords(userId: $userId) }`,
      { userId: user.id }
    );
    clearCachedWords();
    setMessage(t("settings.clearWords"));
  }, [user.id, t]);

  const handleDeleteAccount = useCallback(async () => {
    await graphqlRequest<{ deleteUser: boolean }>(
      `mutation DeleteUser($userId: ID!) { deleteUser(userId: $userId) }`,
      { userId: user.id }
    );
    sessionStorage.removeItem(STORAGE_KEY);
    window.location.href = `/${locale}`;
  }, [user.id, locale]);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    window.location.href = `/${locale}`;
  }, [locale]);

  return (
    <div className="space-y-6">
      {message && <div className="text-sm text-emerald-700">{message}</div>}

      <Card className="glass">
        <CardHeader>
          <CardTitle>{t("settings.profileTitle")}</CardTitle>
          <CardDescription>{t("settings.profileDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("settings.name")}</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("settings.phone")}</Label>
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
          <Button onClick={handleUpdate}>{t("settings.save")}</Button>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>{t("settings.learningTitle")}</CardTitle>
          <CardDescription>{t("settings.learningDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LearningLanguage />
          <LearningTopic />
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>{t("settings.dataTitle")}</CardTitle>
          <CardDescription>{t("settings.dataDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("settings.uiLanguage")}</Label>
            <div className="flex gap-2">
              {["en", "ru", "uz"].map((lng) => (
                <Button
                  key={lng}
                  variant={locale === lng ? "secondary" : "outline"}
                  onClick={() => {
                    const segments = pathname.split("/");
                    if (["en", "ru", "uz"].includes(segments[1])) {
                      segments[1] = lng;
                    } else {
                      segments.splice(1, 0, lng);
                    }
                    router.push(segments.join("/") || `/${lng}`);
                  }}
                >
                  {lng.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full">
                {t("settings.clearWords")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="left-1/2 top-auto bottom-0 w-full max-w-none translate-x-[-50%] translate-y-0 rounded-t-2xl sm:max-w-lg sm:rounded-lg">
              <AlertDialogHeader>
                <AlertDialogTitle>{t("settings.clearTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("settings.clearDesc")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("settings.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearWords}>
                  {t("settings.confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                {t("settings.deleteAccount")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="left-1/2 top-auto bottom-0 w-full max-w-none translate-x-[-50%] translate-y-0 rounded-t-2xl sm:max-w-lg sm:rounded-lg">
              <AlertDialogHeader>
                <AlertDialogTitle>{t("settings.deleteTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("settings.deleteDesc")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("settings.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount}>
                  {t("settings.delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button variant="ghost" className="w-full" onClick={handleLogout}>
            {t("settings.logout")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
