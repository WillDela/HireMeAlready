"use client";

import { ErrorReturned } from "@/components/ui/States";

export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <ErrorReturned title="This page didn't load" onRetry={retry}>
      Something went wrong on our side. Your interviews and resume are safe. Try again, or go back to Home.
    </ErrorReturned>
  );
}
