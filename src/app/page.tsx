import Image from "next/image";
import LandingPage from "@/components/LandingPage";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();

  //if user is signed in go to dashboard
  if (userId) {
    console.log("user is signed in..");
    redirect("/dashboard");
  } else {
    console.log("user IS NOT signed in..");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background font-sans">
      <main className="">
        <LandingPage />
        <p>this is the main page</p>
      </main>
    </div>
  );
}
