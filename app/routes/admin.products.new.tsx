import { zodResolver } from "@hookform/resolvers/zod";
import { useRemixForm, getValidatedFormData } from "remix-hook-form";
import { Form, useActionData } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { db } from "~/drizzle/db";
import { PageHeader } from "~/components/PageHeader";
import { RequiredLabelIcon } from "~/components/RequiredLabelIcon";
import { Label } from "~/components/ui/label";
import type { Route } from "./+types/admin.products.new";
import {
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  productSchema,
} from "~/features/products/schema/products";
import { redirectWithSuccess } from "remix-toast";
import { insertProduct } from "~/features/products/db/products";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { MultiSelect } from "~/components/ui/custom/multi-select";
import { useRef, useState } from "react";
import { client } from "~/lib/payment.server";
import { uploadImageToDodo } from "~/lib/upload.server";
import { Loader2Icon, XIcon } from "lucide-react";

const resolver = zodResolver(productSchema);

export async function loader() {
  const courses = await db.query.CourseTable.findMany({
    columns: {
      id: true,
      name: true,
    },
  });

  return { courses };
}

export async function action({ request }: Route.ActionArgs) {
  const { errors, data, receivedValues } = await getValidatedFormData(
    request,
    resolver
  );

  if (errors) {
    return { errors, defaultValues: receivedValues };
  }

  try {
    const dodoProduct = await client.products.create({
      price: {
        currency: "USD",
        discount: 0,
        price: data.priceInDollars * 100, // Convert to cents
        purchasing_power_parity: true,
        type: "one_time_price",
      },
      tax_category: "digital_products",
      name: data.name,
      description: data.description,
    });

    let imageUrl = "";
    if (data.imageFile instanceof File) {
      imageUrl = await uploadImageToDodo(
        data.imageFile,
        dodoProduct.product_id
      );
    }

    await insertProduct({
      courseIds: data.courseIds ?? [],
      name: data.name,
      description: data.description,
      priceInDollars: data.priceInDollars,
      status: data.status,
      imageUrl,
      dodoProductId: dodoProduct.product_id,
    });

    return redirectWithSuccess(
      "/admin/products/",
      "Product created successfully"
    );
  } catch (error) {
    console.error("Failed to create product:", error);
    return {
      errors: {
        server:
          error instanceof Error ? error.message : "Failed to create product",
      },
      defaultValues: receivedValues,
    };
  }
}

export default function NewProductPage({
  loaderData: { courses },
}: Route.ComponentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const actionData = useActionData<{ errors?: any }>();

  const {
    handleSubmit,
    formState: { errors: formErrors, isSubmitting },
    register,
    setValue,
    watch,
  } = useRemixForm({
    resolver,
    defaultValues: {
      name: "",
      description: "",
      priceInDollars: 0,
      imageFile: "",
      status: "private" as const,
      courseIds: [] as string[],
    },
  });

  const errors = { ...formErrors, ...actionData?.errors };

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
      <PageHeader title="New Product" />
      <Form
        method="post"
        encType="multipart/form-data"
        onSubmit={handleSubmit}
        className="flex gap-6 flex-col max-w-2xl"
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
            {/* Image Upload */}
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
                      <XIcon className="w-4 h-4" />
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
        <div className="self-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Create"
            )}
          </Button>
        </div>
      </Form>
    </div>
  );
}
