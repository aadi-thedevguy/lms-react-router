import { Link } from "react-router";
import { db } from "~/drizzle/db";
import type { Route } from "./+types/_consumer.products.$productId.purchase.success";
import { Button } from "~/components/ui/button";

export async function loader({ params }: Route.LoaderArgs) {
  const product = await db.query.ProductTable.findFirst({
    where: (products, { eq }) => eq(products.id, params.productId),
    columns: {
      id: true,
      name: true,
      imageUrl: true,
    },
  });

  if (!product) {
    throw new Response("Product not found", { status: 404 });
  }

  return { product };
}

export default function ProductPurchaseSuccessPage({
  loaderData: { product },
}: Route.ComponentProps) {
  return (
    <div className="container my-6">
      <div className="flex gap-16 items-center justify-between flex-col lg:flex-row">
        <div className="flex flex-col gap-4 items-start">
          <div className="text-3xl font-semibold">Purchase Successful</div>
          <div className="text-xl">
            Thank you for purchasing {product.name}.
          </div>
          <Button asChild className="text-xl h-auto py-4 px-8 rounded-lg">
            <Link to="/courses">View My Courses</Link>
          </Button>
        </div>
        <div className="relative aspect-video max-w-lg flex-grow w-full">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="object-contain rounded-xl w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}
