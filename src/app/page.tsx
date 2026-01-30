import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Vocab Studio</p>
        <h1 className="heading-serif text-4xl font-semibold sm:text-5xl">Build memory with focus.</h1>
        <p className="max-w-2xl text-muted-foreground">
          Upload vocabulary, study flashcards, take quizzes, and practice handwriting.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass">
          <CardHeader>
            <CardTitle>Browse words</CardTitle>
            <CardDescription>See all uploaded words grouped by chapter.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/words">View Words</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle>See your stats</CardTitle>
            <CardDescription>Track your progress and session totals.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary" className="w-full">
              <Link href="/stats">View Stats</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
