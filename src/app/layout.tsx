import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Vocab Master",
  description: "Upload vocabulary CSVs and study with flashcards and quizzes.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen hero-bg pb-24 sm:pb-10">
          <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
