import { db } from "~/drizzle/db";
import { redirect } from "react-router";
import type { Route } from "./+types/_consumer.products.$productId.purchase";
import { LoadingSpinner } from "~/components/LoadingSpinner";
import { getAuth } from "@clerk/react-router/ssr.server";
import { userOwnsProduct } from "~/features/products/db/products";
import { getClientSessionSecret } from "~/lib/payment.server";
import { getUser } from "~/lib/clerk.server";

export async function loader(args: Route.LoaderArgs) {
  const { params } = args;
  const { userId, sessionClaims } = await getAuth(args);

  if (!userId || !sessionClaims?.dbId) {
    return redirect(
      `/sign-in?redirect_url=/products/${params.productId}/purchase`
    );
  }

  const user = await getUser(sessionClaims.dbId);

  if (!user) {
    console.log("User not found");
    return redirect("/sign-in");
  }

  const product = await db.query.ProductTable.findFirst({
    where: (products, { eq }) => eq(products.id, params.productId),
  });

  if (!product) {
    throw new Response("Product not found", { status: 404 });
  }

  if (await userOwnsProduct({ userId: user.id, productId: params.productId })) {
    return redirect("/courses");
  }

  const paymentLink = await getClientSessionSecret(product, user);
  return redirect(paymentLink);
}

export default function PurchasePage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner className="w-16 h-16" />
        <p className="text-lg">Preparing your purchase...</p>
      </div>
    </div>
  );
}
