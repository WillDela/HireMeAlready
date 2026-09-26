import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/session";

// Placeholder home page that shows auth state. Stream D replaces it with the landing page.
export default async function Home() {
  const user = await getUser();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-semibold">AI Interview Practice</h1>
      {user ? (
        <>
          <p className="text-muted-foreground">Signed in as {user.email}</p>
          <SignOutButton />
        </>
      ) : (
        <Button render={<Link href="/sign-in" />}>Sign in</Button>
      )}
    </main>
  );
}
