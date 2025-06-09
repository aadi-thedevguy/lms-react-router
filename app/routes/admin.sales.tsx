import { PageHeader } from "~/components/PageHeader"
import { db } from "~/drizzle/db"
import { PurchaseTable as DbPurchaseTable } from "~/drizzle/schema"
import { PurchaseTable } from "~/features/purchases/components/PurchaseTable"
import { desc } from "drizzle-orm"
import type { Route } from "./+types/admin.sales"

export const loader = async () => {
  return await getPurchases()
}

export default function Purchases({ loaderData }: Route.ComponentProps) {

  const purchases = loaderData

  return (
    <div className="container my-6">
      <PageHeader title="Sales" />
      <PurchaseTable purchases={purchases} />
    </div>
  )
}

async function getPurchases() {

  return db.query.PurchaseTable.findMany({
    columns: {
      id: true,
      pricePaidInCents: true,
      refundedAt: true,
      productDetails: true,
      createdAt: true,
    },
    orderBy: desc(DbPurchaseTable.createdAt),
    with: { user: { columns: { name: true } } },
  })
}
