import { SignIn } from "@clerk/nextjs";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  const redirectUrl = params.redirect_url || "/dashboard";

  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignIn forceRedirectUrl={redirectUrl} signUpUrl="/signup" />
    </div>
  );
}
