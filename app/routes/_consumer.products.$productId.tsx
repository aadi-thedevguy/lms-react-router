import { and, eq, asc } from "drizzle-orm";
import { VideoIcon } from "lucide-react";
import { Link } from "react-router";
import { db } from "~/drizzle/db";
import {
  ProductTable,
  CourseSectionTable,
  LessonTable,
} from "~/drizzle/schema";
import type { Route } from "./+types/_consumer.products.$productId";
import { Button } from "~/components/ui/button";
import { formatPlural, formatPrice } from "~/lib/formatters";
import { sumArray } from "~/lib/sumArray";
import { wherePublicProducts } from "~/features/products/permissions/products";
import { wherePublicCourseSections } from "~/features/courseSections/permissions/sections";
import { wherePublicLessons } from "~/features/lessons/permissions/lessons";

export async function loader({ params }: Route.LoaderArgs) {
  const product = await getPublicProduct(params.productId);

  if (!product) {
    throw new Response("Product not found", { status: 404 });
  }

  return { product };
}

export default function ProductPage({ loaderData }: Route.ComponentProps) {
  const { product } = loaderData;

  const courseCount = product.courses.length;
  const lessonCount = sumArray(product.courses, (course) =>
    sumArray(course.courseSections, (s) => s.lessons.length)
  );

  return (
    <div className="container my-6">
      <div className="flex gap-16 items-center justify-between flex-col lg:flex-row">
        <div className="flex gap-6 flex-col items-start">
          <div className="flex flex-col gap-2">
            <div className="text-xl">{formatPrice(product.priceInDollars)}</div>
            <h1 className="text-4xl font-semibold">{product.name}</h1>
            <div className="text-muted-foreground">
              {formatPlural(courseCount, {
                singular: "course",
                plural: "courses",
              })}{" "}
              •{" "}
              {formatPlural(lessonCount, {
                singular: "lesson",
                plural: "lessons",
              })}
            </div>
          </div>
          <div className="text-xl">{product.description}</div>
          <Button asChild className="text-xl h-auto py-4 px-8 rounded-lg">
            <Link to={`/products/${product.id}/purchase`}>Purchase Now</Link>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 items-start">
        {product.courses.map((course) => (
          <div key={course.id} className="border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">{course.name}</h2>
            <div className="space-y-4">
              {course.courseSections.map((section) => (
                <div key={section.id} className="space-y-2">
                  <h3 className="text-lg font-medium">{section.name}</h3>
                  <ul className="space-y-1 pl-4">
                    {section.lessons.map((lesson) => (
                      <li key={lesson.id} className="flex items-center gap-2">
                        <VideoIcon className="w-4 h-4 text-muted-foreground" />
                        <span>{lesson.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function getPublicProduct(id: string) {
  const product = await db.query.ProductTable.findFirst({
    columns: {
      id: true,
      name: true,
      description: true,
      priceInDollars: true,
      imageUrl: true,
    },
    where: and(eq(ProductTable.id, id), wherePublicProducts),
    with: {
      courseProducts: {
        columns: {},
        with: {
          course: {
            columns: { id: true, name: true },
            with: {
              courseSections: {
                columns: { id: true, name: true },
                where: wherePublicCourseSections,
                orderBy: asc(CourseSectionTable.order),
                with: {
                  lessons: {
                    columns: { id: true, name: true, status: true },
                    where: wherePublicLessons,
                    orderBy: asc(LessonTable.order),
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (product == null) return product;

  const { courseProducts, ...other } = product;

  return {
    ...other,
    courses: courseProducts.map((cp) => cp.course),
  };
}
