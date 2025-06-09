import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import type { Route } from "./+types/api.purchases.$paymentId.invoice";
import { client } from "~/lib/payment.server";

export const loader = async (args: Route.LoaderArgs) => {
  const { sessionClaims } = await getAuth(args);

  if (!sessionClaims?.dbId) {
    return redirect("/sign-in");
  }

  const { paymentId } = args.params;

  try {
    console.log('Fetching invoice for payment:', paymentId);
    
    // Get the raw PDF data from the API
    const response = await client.invoices.payments.retrieve(paymentId) as unknown;
    
    // Log the response type for debugging
    console.log('Response type:', typeof response);
    
    // Convert the response to a buffer
    let buffer: Buffer;
    
    if (Buffer.isBuffer(response)) {
      // If it's already a buffer, use it directly
      buffer = response;
    } else if (typeof response === 'string') {
      // If it's a string, convert to buffer
      buffer = Buffer.from(response, 'binary');
    } else if (response && typeof response === 'object' && 'data' in response) {
      // If it's an object with a data property
      buffer = Buffer.from((response as any).data, 'binary');
    } else {
      // Fallback: try to stringify and convert to buffer
      buffer = Buffer.from(JSON.stringify(response), 'utf8');
    }
    
    // Log the first 100 characters to verify it's a PDF
    const preview = buffer.toString('utf8', 0, 100);
    console.log('PDF preview:', preview);
    
    // Return the PDF with appropriate headers
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${paymentId}.pdf"`,
        'Content-Length': String(buffer.length),
        // 'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error("Error generating invoice:", error);
    return new Response(
      error instanceof Error ? error.message : "Failed to generate invoice",
      { status: 500 }
    );
  }
};
