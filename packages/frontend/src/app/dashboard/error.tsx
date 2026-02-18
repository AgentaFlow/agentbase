"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Dashboard Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Something went wrong while loading the dashboard. This has been
            logged and we&apos;ll look into it.
          </p>
          {process.env.NODE_ENV === "development" && (
            <pre className="mt-4 max-h-40 overflow-auto rounded bg-muted p-3 text-xs">
              {error.message}
            </pre>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={() => reset()} className="w-full">
            Try again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
