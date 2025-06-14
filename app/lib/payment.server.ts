import { ProductTable, UserTable } from "~/drizzle/schema";
import DodoPayments from "dodopayments";

export const client = new DodoPayments({
  bearerToken: process.env.PAYMENT_SECRET_KEY,
  environment: "test_mode",
});

type PricingRow = {
  label: string;
  amountInDollars: number;
  isBold?: boolean;
};

type PaymentDetails = {
  receiptUrl: string | null;
  pricingRows: PricingRow[];
};

export async function getClientSessionSecret(
  product: typeof ProductTable.$inferSelect,
  user: typeof UserTable.$inferSelect,
  coupon?: { discountPercentage: number; couponId: string }
) {
  const return_url = `${process.env.SERVER_URL}/products/${product.id}/purchase/success`;
  const payment = await client.payments.create({
    billing: {
      city: "",
      country: "US",
      state: "",
      street: "",
      zipcode: "",
    },
    customer: { name: user.name, email: user.email },
    product_cart: [{ product_id: product.dodoProductId, quantity: 1 }],
    discount_code: coupon?.couponId,
    payment_link: true,
    return_url,
    metadata: {
      productId: product.id,
      userId: user.id,
    },
  });

  if (!payment.payment_link) throw new Error("Payment link not found");

  return payment.payment_link;
}

export async function getPaymentDetails(
  paymentId: string,
  pricePaidInCents: number,
  refundedAt: Date | null
): Promise<PaymentDetails> {
  try {
    const payment = await client.payments.retrieve(paymentId);
    const refunds = payment.refunds || [];
    const refundAmount = refunds.reduce(
      (sum, refund) => sum + (refund.amount || 0),
      0
    );
    const isRefunded = refundedAt !== null || refundAmount > 0;

    const subtotal = payment.settlement_amount ?? payment.total_amount;
    const total = payment.total_amount;
    const tax = payment.tax ?? 0;

    return {
      receiptUrl: payment.payment_link || null,
      pricingRows: getPricingRows({
        subtotal,
        total,
        tax,
        refund: isRefunded ? refundAmount : 0,
        currency: payment.currency || "USD",
      }),
    };
  } catch (error) {
    console.error("Error fetching payment details:", error);
    return {
      receiptUrl: null,
      pricingRows: [
        {
          label: "Total",
          amountInDollars: pricePaidInCents / 100,
          isBold: true,
        },
      ],
    };
  }
}

function getPricingRows({
  subtotal,
  total,
  tax,
  refund,
  currency,
}: {
  subtotal: number;
  total: number;
  tax: number;
  refund?: number;
  currency: string;
}): PricingRow[] {
  const pricingRows: PricingRow[] = [];

  if (subtotal !== total) {
    pricingRows.push({
      label: "Subtotal",
      amountInDollars: subtotal / 100,
    });
  }

  if (tax > 0) {
    pricingRows.push({
      label: `Tax (${currency})`,
      amountInDollars: tax / 100,
    });
  }

  if (refund && refund > 0) {
    pricingRows.push({
      label: "Refund",
      amountInDollars: -refund / 100,
    });
  }

  if (pricingRows.length === 0) {
    return [
      {
        label: "Total",
        amountInDollars: total / 100,
        isBold: true,
      },
    ];
  }

  return [
    ...pricingRows,
    {
      label: "Total",
      amountInDollars: total / 100,
      isBold: true,
    },
  ];
}
