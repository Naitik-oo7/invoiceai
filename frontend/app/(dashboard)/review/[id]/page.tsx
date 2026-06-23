"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { FileX2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card px-6 py-20 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <FileX2 className="h-6 w-6" />
        </span>
        <p className="mt-4 text-base font-semibold text-brand-ink">Invoice not found</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          This invoice may have been deleted, or you don&rsquo;t have access to it.
        </p>
        <Button asChild className="mt-5">
          <Link href="/invoices">Back to invoices</Link>
        </Button>
      </div>
    );
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
