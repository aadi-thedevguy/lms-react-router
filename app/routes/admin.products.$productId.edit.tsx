import { zodResolver } from "@hookform/resolvers/zod";
import { useRemixForm, getValidatedFormData } from "remix-hook-form";
import { Form } from "react-router";
import { useRef, useState } from "react";
import { eq } from "drizzle-orm";
import { X, Loader2 } from "lucide-react";
import { dataWithError, redirectWithSuccess } from "remix-toast";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { db } from "~/drizzle/db";
import { ProductTable } from "~/drizzle/schema";
import { PageHeader } from "~/components/PageHeader";
import { RequiredLabelIcon } from "~/components/RequiredLabelIcon";
import { Label } from "~/components/ui/label";
import type { Route } from "./+types/admin.products.$productId.edit";
import { productSchema } from "~/features/products/schema/products";
import { updateProduct } from "~/features/products/db/products";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
} from "~/features/products/schema/products";
import { MultiSelect } from "~/components/ui/custom/multi-select";
import { client } from "~/lib/payment.server";

const resolver = zodResolver(productSchema);

export async function loader({ params }: Route.LoaderArgs) {
  const [product, courses] = await Promise.all([
    db.query.ProductTable.findFirst({
      where: eq(ProductTable.id, params.productId),
      with: {
        courseProducts: {
          columns: {
            courseId: true,
          },
        },
      },
    }),
    db.query.CourseTable.findMany({
      columns: {
        id: true,
        name: true,
      },
    }),
  ]);

  if (!product) {
    throw new Response("Product not found", { status: 404 });
  }

  return {
    product: {
      ...product,
      courseIds: product.courseProducts.map((cp) => cp.courseId),
    },
    courses,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const existingProduct = await getProduct(params.productId);

  if (!existingProduct) {
    throw new Response("Product not found", { status: 404 });
  }

  const { errors, data, receivedValues } = await getValidatedFormData(
    request,
    resolver
  );

  if (errors) {
    return {
      errors,
      defaultValues: receivedValues,
    };
  }

  const { courseIds, ...productData } = data;
  const { imageUrl, dodoProductId } = existingProduct;
  let newImageId = "";

  try {
    if (data.imageFile && data.imageFile instanceof File) {
      const { url, image_id } = await client.products.images.update(
        dodoProductId
      );

      // Upload the file to the presigned URL
      const fileBuffer = await data.imageFile.arrayBuffer();
      const uploadResponse = await fetch(url, {
        method: "PUT",
        body: fileBuffer,
        headers: {
          "Content-Type": data.imageFile.type || "image/jpeg",
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image to Dodo Payments");
      }
      newImageId = image_id ?? "";
    }

    await updateProduct(
      params.productId,
      {
        ...productData,
        courseIds: courseIds || [],
        dodoProductId,
        imageUrl,
      },
      newImageId
    );

    return redirectWithSuccess(
      "/admin/products",
      "Product updated successfully"
    );
  } catch (error) {
    console.error("Failed to update product:", error);
    return dataWithError(null, "Failed to update product");
  }
}

export default function EditProductPage({
  loaderData: { courses, product },
}: Route.ComponentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    product.imageUrl || null
  );

  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    register,
    setValue,
    watch,
  } = useRemixForm({
    resolver,
    defaultValues: {
      ...product,
      imageFile: product.imageUrl || "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Set the file to the form
    setValue("imageFile", file, { shouldValidate: true });
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    setValue("imageFile", "", { shouldValidate: true });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="container my-6">
      <PageHeader title="Edit Product" />
      <Form
        method="post"
        encType="multipart/form-data"
        onSubmit={handleSubmit}
        className="flex gap-6 flex-col max-w-2xl"
        key={product.id}
      >
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex flex-col gap-2 md:w-1/2 w-full">
            <Label htmlFor="name">
              <RequiredLabelIcon />
              Name
            </Label>
            <Input id="name" placeholder="Name" {...register("name")} />
            <p className="text-destructive">
              {errors.name && errors.name?.message}
            </p>
          </div>

          <div className="flex flex-col gap-2 md:w-1/2 w-full">
            <Label htmlFor="priceInDollars">
              <RequiredLabelIcon />
              Price
            </Label>
            <Input
              id="priceInDollars"
              type="number"
              placeholder="Price"
              {...register("priceInDollars", {
                valueAsNumber: true,
              })}
            />
            <p className="text-destructive">
              {errors.priceInDollars && errors.priceInDollars?.message}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex flex-col gap-2 md:w-1/2 w-full">
            <div className="flex flex-col gap-2">
              <Label htmlFor="imageFile">
                <RequiredLabelIcon />
                Product Image
              </Label>
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <div className="w-full h-52 rounded-md border border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-400 text-sm">
                        No image selected
                      </span>
                    )}
                  </div>
                  {previewUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Input
                    id="imageFile"
                    type="file"
                    accept={ALLOWED_FILE_TYPES.join(",")}
                    onChange={handleFileChange}
                    ref={(e) => {
                      fileInputRef.current = e;
                    }}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    {previewUrl ? "Change Image" : "Choose Image"}
                  </Button>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {ALLOWED_FILE_TYPES.map((t) => t.split("/")[1]).join(", ")}{" "}
                    up to {MAX_FILE_SIZE / 1024 / 1024}MB
                  </p>
                  {errors.imageFile && (
                    <p className="text-destructive text-sm mt-1">
                      {errors.imageFile.message as string}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 md:w-1/2 w-full">
            <Label htmlFor="status">Status</Label>
            <Select
              value={watch("status")}
              onValueChange={(value) =>
                setValue("status", value as "public" | "private")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="w-full">
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="courseIds">Courses</Label>
          <MultiSelect
            options={courses}
            getValue={(course) => course.id}
            getLabel={(course) => course.name}
            selectedValues={watch("courseIds") || []}
            onSelectedValuesChange={(value) => setValue("courseIds", value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="description">
            <RequiredLabelIcon />
            Description
          </Label>
          <Textarea
            className="min-h-20 resize-none"
            placeholder="Description"
            {...register("description")}
          />
          <p className="text-destructive">
            {errors.description && errors.description?.message}
          </p>
        </div>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.history.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </Form>
    </div>
  );
}

async function getProduct(id: string) {
  return db.query.ProductTable.findFirst({
    columns: {
      id: true,
      name: true,
      description: true,
      priceInDollars: true,
      status: true,
      imageUrl: true,
      dodoProductId: true,
    },
    where: eq(ProductTable.id, id),
    with: { courseProducts: { columns: { courseId: true } } },
  });
}
