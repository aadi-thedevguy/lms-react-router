import { and, eq, isNull } from "drizzle-orm";
import { db } from "~/drizzle/db";
import {
  CourseProductTable,
  ProductTable,
  PurchaseTable,
} from "~/drizzle/schema";
import { client } from "~/lib/payment.server";

export async function userOwnsProduct({
  userId,
  productId,
}: {
  userId: string;
  productId: string;
}) {
  // "use cache"
  // cacheTag(getPurchaseUserTag(userId))

  const existingPurchase = await db.query.PurchaseTable.findFirst({
    where: and(
      eq(PurchaseTable.productId, productId),
      eq(PurchaseTable.userId, userId),
      isNull(PurchaseTable.refundedAt)
    ),
  });

  return existingPurchase != null;
}

export async function insertProduct(
  data: typeof ProductTable.$inferInsert & {
    courseIds: string[];
  }
) {
  const newProduct = await db.transaction(async (trx) => {
    const [newProduct] = await trx
      .insert(ProductTable)
      .values({
        ...data,
      })
      .returning();

    if (newProduct == null) {
      trx.rollback();
      // Try to clean up the Dodo product if creation failed
      try {
        await client.products.delete(data.dodoProductId);
      } catch (e) {
        console.error("Failed to clean up Dodo product after failure:", e);
      }
      throw new Error("Failed to create product");
    }

    await trx.insert(CourseProductTable).values(
      data.courseIds.map((courseId) => ({
        productId: newProduct.id,
        courseId,
      }))
    );

    return newProduct;
  });

  // revalidateProductCache(newProduct.id)
  return newProduct;
}

export async function updateProduct(
  id: string,
  data: typeof ProductTable.$inferInsert & {
    courseIds: string[];
  },
  newImageId?: string
) {
  const updatedProduct = await db.transaction(async (trx) => {
    // Update the Dodo Payments product if price, name, or description changed
    if (
      data.dodoProductId &&
      (data.priceInDollars !== undefined ||
        data.name !== undefined ||
        data.description !== undefined ||
        newImageId !== undefined)
    ) {
      const response = await client.products.update(data.dodoProductId, {
        ...(data.name && { name: data.name }),
        ...(data.description && { description: data.description }),
        ...(data.priceInDollars !== undefined && {
          price: {
            currency: "USD",
            discount: 0,
            price: data.priceInDollars * 100,
            purchasing_power_parity: true,
            type: "one_time_price",
          },
          ...(newImageId && { image_id: newImageId }),
        }),
      });
      console.log("Updated Dodo product:", response);

      const { image } = await client.products.retrieve(data.dodoProductId);
      if (image) data.imageUrl = image;
    }

    const [updatedProduct] = await trx
      .update(ProductTable)
      .set({
        ...data,
      })
      .where(eq(ProductTable.id, id))
      .returning();

    if (updatedProduct == null) {
      trx.rollback();
      throw new Error("Failed to update product");
    }

    // Update course associations
    await trx
      .delete(CourseProductTable)
      .where(eq(CourseProductTable.productId, updatedProduct.id));

    if (data.courseIds.length > 0) {
      await trx.insert(CourseProductTable).values(
        data.courseIds.map((courseId) => ({
          productId: updatedProduct.id,
          courseId,
        }))
      );
    }

    return updatedProduct;
  });

  // revalidateProductCache(updatedProduct.id)
  return updatedProduct;
}

export async function deleteProduct(id: string) {
  const product = await db.query.ProductTable.findFirst({
    where: eq(ProductTable.id, id),
  });

  if (!product) {
    throw new Error("Product not found");
  }

  // Delete from Dodo Payments if it exists
  if (product.dodoProductId) {
    try {
      await client.products.delete(product.dodoProductId);
    } catch (error) {
      console.error("Failed to delete Dodo Payments product:", error);
      // Continue with local deletion even if Dodo deletion fails
    }
  }

  const [deletedProduct] = await db
    .delete(ProductTable)
    .where(eq(ProductTable.id, id))
    .returning();

  if (deletedProduct == null) throw new Error("Failed to delete product");

  // revalidateProductCache(deletedProduct.id)
  return deletedProduct;
}
