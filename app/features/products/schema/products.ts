import { z } from "zod";

export const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const productStatuses = ["public", "private"] as const;

export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  priceInDollars: z.coerce.number().min(0, "Price must be a positive number"),
  status: z.enum(productStatuses).default("private"),
  courseIds: z.array(z.string()).optional(),
  imageFile: z.any()
    .refine((file) => {
      if (typeof file === 'string') return file.length > 0;
      return file instanceof File && file.size > 0;
    }, 'Image is required')
    .refine((file) => {
      if (typeof file === 'string') return true;
      return !file || file.size <= MAX_FILE_SIZE;
    }, `Max file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    .refine((file) => {
      if (typeof file === 'string') return true;
      return !file || ALLOWED_FILE_TYPES.includes(file.type);
    }, `Only ${ALLOWED_FILE_TYPES.map(t => t.split('/')[1]).join(', ')} files are allowed`),
});

export const deleteProductSchema = z.object({
  productId: z.string().min(1, "Product is Required"),
})

