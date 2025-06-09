import { client } from "./payment.server";

export async function uploadImageToDodo(
  file: File,
  productId: string
): Promise<string> {
  try {
    // Get presigned URL from Dodo
    const { url } = await client.products.images.update(productId);

    // Upload the file to the presigned URL
    const fileBuffer = await file.arrayBuffer();
    const uploadResponse = await fetch(url, {
      method: "PUT",
      body: fileBuffer,
      headers: {
        "Content-Type": file.type || "image/jpeg",
      },
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload image to Dodo Payments");
    }

    const updatedProduct = await client.products.retrieve(productId);

    return updatedProduct.image ?? "";
  } catch (error) {
    console.error("Error uploading image to Dodo Payments:", error);
    throw new Error("Failed to upload image");
  }
}