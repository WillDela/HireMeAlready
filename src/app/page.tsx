import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { LandingPage } from "@/components/marketing/LandingPage";

export default async function Home() {
  const user = await getUser();
  if (user) redirect("/practice");
  return <LandingPage />;
}
