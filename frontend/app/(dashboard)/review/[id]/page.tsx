"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { InvoiceReviewForm } from "@/components/InvoiceReviewForm";
import { api } from "@/lib/api";
import { useUploadStore } from "@/lib/upload-store";
import type { Invoice } from "@/types";

export default function ReviewPage() {
  const params = useParams();
  const { data: session } = useSession();
  const objectUrl = useUploadStore((s) => s.objectUrl);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  const id = params.id as string;
  const token = (session as { accessToken?: string })?.accessToken;

  useEffect(() => {
    if (!token || !id) return;
    api.getInvoice(id, token).then(setInvoice).finally(() => setLoading(false));
  }, [token, id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!invoice || !token) {
    return <p>Invoice not found</p>;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Review & approve"
        title="Review Invoice"
        description="Verify the extracted fields, fix anything flagged, then approve."
      />
      <InvoiceReviewForm
        invoice={invoice}
        pdfUrl={objectUrl}
        token={token}
        onSaved={setInvoice}
      />
    </div>
  );
}
