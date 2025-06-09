import { Button } from "~/components/ui/button";
import { Link } from "react-router";

export default function ProductPurchaseFailurePage() {
  return (
    <div className="container my-6">
      <div className="flex flex-col gap-4 items-start">
        <div className="text-3xl font-semibold">Purchase Failed</div>
        <div className="text-xl">
          There was a problem with your purchase.
        </div>
        <Button asChild className="text-xl h-auto py-4 px-8 rounded-lg">
          <Link to="/">Try again</Link>
        </Button>
      </div>
    </div>
  );
}
