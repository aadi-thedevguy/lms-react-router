import { PageHeader } from "~/components/PageHeader";
import { db } from "~/drizzle/db";
import { PurchaseTable } from "~/drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { redirect, Await } from "react-router";
import type { Route } from "./+types/_consumer.purchases._index";
import { getAuth } from "@clerk/react-router/ssr.server";
import {
  UserPurchaseTable,
  UserPurchaseTableSkeleton,
} from "~/features/purchases/components/UserPurchaseTable";
import { Suspense } from "react";

export const loader = async (args: Route.LoaderArgs) => {
  const { userId, sessionClaims } = await getAuth(args);

  if (!userId || !sessionClaims?.dbId) {
    return redirect("/sign-in");
  }

  const purchases = getPurchases(sessionClaims?.dbId);

  return { purchases };
};

export default function Purchases({ loaderData }: Route.ComponentProps) {
  const { purchases } = loaderData;

  return (
    <div className="container my-6">
      <PageHeader title="Purchase History" />
      <Suspense fallback={<UserPurchaseTableSkeleton />}>
        <Await resolve={purchases}>
          {(value) => <UserPurchaseTable purchases={value} />}
        </Await>
      </Suspense>
    </div>
  );
}

async function getPurchases(userId: string) {
  return db.query.PurchaseTable.findMany({
    columns: {
      id: true,
      pricePaidInCents: true,
      refundedAt: true,
      productDetails: true,
      createdAt: true,
    },
    where: eq(PurchaseTable.userId, userId),
    orderBy: desc(PurchaseTable.createdAt),
  });
}
