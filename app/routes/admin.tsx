import { Badge } from "~/components/ui/badge";
import { UserButton } from "@clerk/react-router";
import { Link, Outlet, redirect } from "react-router";
import { getAuth } from "@clerk/react-router/ssr.server";
import type { Route } from "./+types/admin";
import { getUser } from "~/lib/clerk.server";
import { Home } from "lucide-react";

export const loader = async (args: Route.LoaderArgs) => {
  const { userId, sessionClaims } = await getAuth(args);

  if (!userId) {
    return redirect("/sign-in");
  }

  if (!sessionClaims?.dbId) {
    return redirect("/api/clerk/sync-users");
  }

  const user = await getUser(sessionClaims.dbId);

  if (!user) {
    return redirect("/sign-in");
  }

  if (user.role !== "admin") {
    return redirect("/");
  }

  return null;
};

export default function AdminLayout() {
  return (
    <>
      <Navbar />
      <section className="container my-6 px-4 mx-auto">
        <Outlet />
      </section>
    </>
  );
}

function Navbar() {
  return (
    <header className="flex w-full h-12 shadow bg-background z-10">
      <nav className="flex gap-4 container py-4 px-10">
        <div className="mr-auto flex items-center gap-2">
          <Link className="hidden md:block text-lg hover:underline" to="/admin">
            LMS
          </Link>
          <Link className="block md:hidden text-lg hover:underline" to="/admin">
            <Home />
          </Link>
          <Badge>Admin</Badge>
        </div>
        <Link
          className="hover:bg-accent/10 flex items-center px-2"
          to="/admin/courses"
        >
          Courses
        </Link>
        <Link
          className="hover:bg-accent/10 flex items-center px-2"
          to="/admin/products"
        >
          Products
        </Link>
        <Link
          className="hover:bg-accent/10 flex items-center px-2"
          to="/admin/sales"
        >
          Sales
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
      </nav>
    </header>
  );
}
