import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function QuizEntryPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Take the quiz</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Pick a category. 2 minutes. Top 3 recommendations.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>TVs</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Gaming, movies, sports, family.</p>
            <Button asChild>
              <Link href="/quiz/tvs">Start</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Smartphones</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Camera, battery, performance, value.</p>
            <Button asChild>
              <Link href="/quiz/smartphones">Start</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
