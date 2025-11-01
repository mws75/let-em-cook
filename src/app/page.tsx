import Image from "next/image";
import LandingPage from "@/components/LandingPage";
export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="">
        <LandingPage />
        <p>this is the main page</p>
      </main>
    </div>
  );
}
