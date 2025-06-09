import { Button } from "~/components/ui/button"
import { PageHeader } from "~/components/PageHeader"
import { Link } from "react-router"
import { ProductTable } from "~/features/products/components/ProductTable"
import { db } from "~/drizzle/db"
import {
  CourseProductTable,
  ProductTable as DbProductTable,
  PurchaseTable,
} from "~/drizzle/schema"
import { asc, countDistinct, eq } from "drizzle-orm"
import type { Route } from "./+types/admin.products._index"
import { getValidatedFormData } from "remix-hook-form"
import { deleteProductSchema } from "~/features/products/schema/products"
import { deleteProduct } from "~/features/products/db/products"
import { dataWithError, redirectWithSuccess } from "remix-toast"
import { zodResolver } from "@hookform/resolvers/zod"

export const loader = async () => {
  return await getProducts()
}

export async function action({ request }: Route.ActionArgs) {
    const { errors, data } = await getValidatedFormData(request, zodResolver(deleteProductSchema))

    if (errors) {
      return dataWithError(null, errors.productId?.message || "Invalid Product Id")
    }
    await deleteProduct(data.productId)
    return redirectWithSuccess("/admin/products", "Product deleted successfully")

}

export default function ProductsPage({ loaderData }: Route.ComponentProps) {

  const products = loaderData

  return (
    <div className="container my-6">
      <PageHeader title="Products">
        <Button asChild>
          <Link to="/admin/products/new">New Product</Link>
        </Button>
      </PageHeader>

      <ProductTable products={products} />
    </div>
  )
}

async function getProducts() {

  return db
    .select({
      id: DbProductTable.id,
      name: DbProductTable.name,
      status: DbProductTable.status,
      priceInDollars: DbProductTable.priceInDollars,
      description: DbProductTable.description,
      imageUrl: DbProductTable.imageUrl,
      coursesCount: countDistinct(CourseProductTable.courseId),
      customersCount: countDistinct(PurchaseTable.userId),
    })
    .from(DbProductTable)
    .leftJoin(PurchaseTable, eq(PurchaseTable.productId, DbProductTable.id))
    .leftJoin(
      CourseProductTable,
      eq(CourseProductTable.productId, DbProductTable.id)
    )
    .orderBy(asc(DbProductTable.name))
    .groupBy(DbProductTable.id)
}

