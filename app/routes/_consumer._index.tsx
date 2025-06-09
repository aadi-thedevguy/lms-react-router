import { db } from "~/drizzle/db";
import { ProductTable } from "~/drizzle/schema";
import { asc } from "drizzle-orm";
import type { Route } from "./+types/_consumer._index";
import { ProductCard } from "~/features/products/components/ProductCard";
import { pppCoupons } from "~/data/pppCoupons";

export const loader = async (args: Route.LoaderArgs) => {
  // Get user's country from headers
  const country =
    args.request.headers.get("cf-ipcountry") ||
    args.request.headers.get("x-vercel-ip-country") ||
    args.request.headers.get("x-user-country") ||
    "US";

  const coupon = pppCoupons.find((coupon) =>
    coupon.countryCodes.includes(country)
  );

  const products = await getPublicProducts();

  if (coupon == null) return { products, coupon: undefined };

  return {
    products,
    coupon: {
      discountPercentage: coupon.discountPercentage,
      couponId: coupon.couponId,
    },
  };
};

export default function HomePage({
  loaderData: { products, coupon },
}: Route.ComponentProps) {
  return (
    <div className="container my-6">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} {...product} coupon={coupon} />
        ))}
      </div>
    </div>
  );
}

async function getPublicProducts() {
  return db.query.ProductTable.findMany({
    columns: {
      id: true,
      name: true,
      description: true,
      priceInDollars: true,
      imageUrl: true,
    },
    orderBy: asc(ProductTable.name),
  });
}
