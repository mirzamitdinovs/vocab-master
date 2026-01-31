import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/words');
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Exercises
        </p>
        <h1 className="heading-serif text-4xl font-semibold sm:text-5xl">
          Start practicing now.
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Jump into flashcards, quiz, or handwriting practice.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass">
          <CardHeader>
            <CardTitle>Flashcards</CardTitle>
            <CardDescription>Learn new words with quick flips.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/flashcards">Start flashcards</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Quiz</CardTitle>
            <CardDescription>Multiple-choice recall practice.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary" className="w-full">
              <Link href="/quiz">Start quiz</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Writing</CardTitle>
            <CardDescription>Practice handwriting on a blank canvas.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/write">Start writing</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Words</CardTitle>
            <CardDescription>Browse all lessons and vocabulary.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/words">Browse words</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
