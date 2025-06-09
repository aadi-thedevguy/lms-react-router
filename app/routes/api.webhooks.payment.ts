import { Webhook } from "standardwebhooks";
import { data } from "react-router";
import { type Payment as BasePayment } from "dodopayments/resources/payments.mjs";
import type { Route } from "./+types/api.webhooks.payment";
import { db } from "~/drizzle/db";
import { eq } from "drizzle-orm";
import { ProductTable, UserTable } from "~/drizzle/schema";
import { addUserCourseAccess } from "~/features/courses/db/userCourseAcccess";
import { insertPurchase } from "~/features/purchases/db/purchases";

type Payment = BasePayment & { payload_type: string };
type WebhookPayload = {
  type: string;
  data: Payment;
};

const webhook = new Webhook(process.env.STRIPE_WEBHOOK_SECRET);

export async function action({ request }: Route.ActionArgs) {
  console.log("🎯 Webhook Request Received:", new Date().toISOString());

  // 🔍 Validate HTTP method
  if (request.method !== "POST") {
    console.log("❌ Invalid Method:", request.method);
    return data({ message: "Method not allowed" }, { status: 405 });
  }

  const webhookHeaders = {
    "webhook-id": request.headers.get("webhook-id") || "",
    "webhook-signature": request.headers.get("webhook-signature") || "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") || "",
  };

  console.log("🔐 Webhook Headers:", webhookHeaders);

  const rawBody = await request.text();

  // ✅ Verify webhook signature
  let event: WebhookPayload;

  try {
    await webhook.verify(rawBody, webhookHeaders);
    console.log("✅ Webhook Verified Successfully");

    event = JSON.parse(rawBody) as WebhookPayload;

    console.log("📥 Received Webhook Type:", event.type);

    if (!event.data?.metadata?.userId || !event.data?.metadata?.productId) {
      throw new Error("Missing metadata in payload");
    }

    const userId = event.data.metadata.userId;
    const productId = event.data.metadata.productId;

    if (
      event.data.payload_type === "Payment" &&
      event.type === "payment.succeeded" &&
      !event.data.subscription_id
    ) {
      const [product, user] = await Promise.all([
        getProduct(productId),
        getUser(userId),
      ]);

      console.log("✅ User Found Successfully", user);
      console.log("✅ Product Found Successfully", product);

      if (product == null) throw new Error("Product not found");
      if (user == null) throw new Error("User not found");

      const courseIds = product.courseProducts.map((cp) => cp.courseId);
      db.transaction(async (trx) => {
        try {
          await addUserCourseAccess({ userId: user.id, courseIds }, trx);
          await insertPurchase(
            {
              paymentSessionId: event.data.payment_id,
              pricePaidInCents: event.data.total_amount,
              productDetails: product,
              userId: user.id,
              productId,
            },
            trx
          );

          console.log("✨ New Purchase Created Successfully:");
        } catch (error) {
          trx.rollback();
          throw error;
        }
      });

      return productId;
    }
  } catch (err) {
    console.error("🚨 Webhook Verification Failed:", err);
    return data({ message: "Error occurred" }, { status: 400 });
  }
  console.log("🎉 Webhook Processed Successfully");
  return data({ message: "Success" }, { status: 200 });
}

function getProduct(id: string) {
  return db.query.ProductTable.findFirst({
    columns: {
      id: true,
      priceInDollars: true,
      name: true,
      description: true,
      imageUrl: true,
    },
    where: eq(ProductTable.id, id),
    with: {
      courseProducts: { columns: { courseId: true } },
    },
  });
}

function getUser(id: string) {
  return db.query.UserTable.findFirst({
    columns: { id: true },
    where: eq(UserTable.id, id),
  });
}
