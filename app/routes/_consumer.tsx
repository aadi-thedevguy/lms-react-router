import { Button } from "~/components/ui/button";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/react-router";
import { data, Link, Outlet } from "react-router";
import { Suspense } from "react";
import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import { getUser } from "~/lib/clerk.server";
import type { Route } from "./+types/_consumer";
import { canAccessAdminPages } from "~/permissions/general";
import { aj } from "~/lib/arcjet.server";
import { isSpoofedBot } from "@arcjet/inspect";
import { HomeIcon } from "lucide-react";

export const loader = async (args: Route.LoaderArgs) => {
  const decision = await aj.protect(args, { requested: 5 });

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      throw new Response("Too many requests", { status: 429 });
    } else if (decision.reason.isBot()) {
      throw new Response("Bots forbidden", { status: 403 });
    }
    throw new Response("Forbidden", { status: 403 });
  }

  // Check for spoofed bots if using Arcjet Pro
  if (decision.results.some(isSpoofedBot)) {
    throw new Response("Forbidden", { status: 403 });
  }

  const headers = new Headers(args.request.headers);
  if (!decision.ip.isVpn() && !decision.ip.isProxy()) {
    if (decision.ip.country == null) {
      headers.delete("x-user-country");
    } else {
      headers.set("x-user-country", decision.ip.country);
    }
  }

  const { userId, sessionClaims } = await getAuth(args);

  if (!userId) {
    return redirect("/sign-in");
  }

  if (!sessionClaims?.dbId) {
    return redirect("/api/clerk/sync-users");
  }

  const user = await getUser(sessionClaims.dbId);

  if (!user) {
    console.log("User not found");
    return redirect("/sign-in");
  }

  return data(
    { user },
    {
      headers,
    }
  );
};

export default function Layout({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  return (
    <>
      <header className="flex w-full h-12 shadow bg-background z-10">
        <nav className="flex gap-4 container py-4 px-10">
          <Link
            className="mr-auto hidden text-lg hover:underline md:flex items-center"
            to="/"
          >
            LMS
          </Link>
          <Link
            className="mr-auto block text-lg hover:underline md:hidden"
            to="/"
          >
            <HomeIcon />
          </Link>
          <Suspense>
            <SignedIn>
              {canAccessAdminPages(user) && (
                <Link
                  className="hover:bg-accent/10 flex items-center px-2"
                  to="/admin"
                >
                  Admin
                </Link>
              )}
              <Link
                className="hover:bg-accent/10 flex items-center px-2"
                to="/courses"
              >
                My Courses
              </Link>
              <Link
                className="hover:bg-accent/10 flex items-center px-2"
                to="/purchases"
              >
                Purchase History
              </Link>
              <div className="size-8 self-center">
                <UserButton
                  appearance={{
                    elements: {
                      userButtonAvatarBox: { width: "100%", height: "100%" },
                    },
                  }}
                />
              </div>
            </SignedIn>
          </Suspense>
          <Suspense>
            <SignedOut>
              <Button className="self-center" asChild>
                <SignInButton>Sign In</SignInButton>
              </Button>
            </SignedOut>
          </Suspense>
        </nav>
      </header>
      <main className="container my-6 px-4 mx-auto">
        <Outlet />
      </main>
    </>
  );
}
