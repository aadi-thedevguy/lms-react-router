import { getAuth } from "@clerk/react-router/ssr.server";
import { Fragment, useState } from "react";
import { Link, redirect } from "react-router";
import { and, eq } from "drizzle-orm";

import { db } from "~/drizzle/db";
import { formatDate, formatPrice } from "~/lib/formatters";
import type { Route } from "./+types/_consumer.purchases.$purchaseId";
import { PageHeader } from "~/components/PageHeader";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { getUser } from "~/lib/clerk.server";
import { getPaymentDetails } from "~/lib/payment.server";
import { PurchaseTable } from "~/drizzle/schema";

export const loader = async (args: Route.LoaderArgs) => {
  const { sessionClaims } = await getAuth(args);

  if (!sessionClaims?.dbId) {
    return redirect("/sign-in");
  }

  const user = await getUser(sessionClaims.dbId);

  if (!user) {
    console.log("User not found");
    return redirect("/sign-in");
  }

  const purchase = await getPurchase({
    userId: user.id,
    id: args.params.purchaseId,
  });

  if (!purchase) {
    throw new Response("Purchase not found", { status: 404 });
  }

  const { pricingRows } = await getPaymentDetails(
    purchase.paymentSessionId,
    purchase.pricePaidInCents,
    purchase.refundedAt
  );

  return {
    purchase,
    pricingRows,
    user,
    purchaseId: args.params.purchaseId,
  };
};

export default function PurchaseDetailPage({
  loaderData,
}: Route.ComponentProps) {
  const { purchase, pricingRows, user, purchaseId } = loaderData;
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadInvoice = () => {
    setIsDownloading(true);
    const link = document.createElement("a");
    link.href = `/api/purchases/${purchase.paymentSessionId}/invoice`;
    link.download = `invoice-${purchaseId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsDownloading(false);
  };

  return (
    <div className="container my-6">
      <PageHeader title={purchase.productDetails.name}>
        <Button variant="outline">
          <Link to={`/api/purchases/${purchase.paymentSessionId}/invoice`}>
            Download Invoice
          </Link>
        </Button>
        {/* <Button
          variant="outline"
          onClick={handleDownloadInvoice}
          disabled={isDownloading}
        >
          {isDownloading ? "Downloading..." : "Download Invoice"}
        </Button> */}
      </PageHeader>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col gap-1">
              <CardTitle>Receipt</CardTitle>
              <CardDescription>ID: {purchaseId}</CardDescription>
            </div>
            <Badge className="text-base">
              {purchase.refundedAt ? "Refunded" : "Paid"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-4 grid grid-cols-2 gap-8 border-t pt-4">
          <div>
            <label className="text-sm text-muted-foreground">Date</label>
            <div>{formatDate(new Date(purchase.createdAt))}</div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Product</label>
            <div>{purchase.productDetails.name}</div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Customer</label>
            <div>{user.name}</div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Seller</label>
            <div>LMS</div>
          </div>
        </CardContent>
        <CardFooter className="grid grid-cols-2 gap-y-4 gap-x-8 border-t pt-4">
          {pricingRows.map(({ label, amountInDollars, isBold }) => (
            <Fragment key={label}>
              <div className={isBold ? "font-bold" : ""}>{label}</div>
              <div className={`justify-self-end ${isBold ? "font-bold" : ""}`}>
                {formatPrice(amountInDollars, { showZeroAsNumber: true })}
              </div>
            </Fragment>
          ))}
        </CardFooter>
      </Card>
    </div>
  );
}

async function getPurchase({ userId, id }: { userId: string; id: string }) {
  return db.query.PurchaseTable.findFirst({
    columns: {
      pricePaidInCents: true,
      refundedAt: true,
      productDetails: true,
      createdAt: true,
      paymentSessionId: true,
    },
    where: and(eq(PurchaseTable.id, id), eq(PurchaseTable.userId, userId)),
  });
}
