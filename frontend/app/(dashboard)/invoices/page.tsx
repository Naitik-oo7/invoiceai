"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { SearchFilters } from "@/components/SearchFilters";
import { InvoiceTable } from "@/components/InvoiceTable";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { api } from "@/lib/api";
import type { Invoice } from "@/types";

function InvoicesContent() {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchInvoices = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const result = await api.listInvoices(token, {
        page,
        page_size: 20,
        sort_by: sortBy,
        sort_order: sortOrder,
        ...filters,
      });
      setInvoices(result.items);
      setTotal(result.total);
      setTotalPages(result.total_pages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [token, page, sortBy, sortOrder, filters]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const confirmDelete = async () => {
    if (!token || !deleteId) return;
    setDeleting(true);
    try {
      await api.deleteInvoice(deleteId, token);
      toast.success("Invoice deleted");
      setDeleteId(null);
      fetchInvoices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async (format: "csv" | "excel") => {
    if (!token) return;
    const params = new URLSearchParams(filters);
    const url = api.exportUrl(format, Object.fromEntries(params));
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `invoices.${format === "csv" ? "csv" : "xlsx"}`;
      a.click();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Library"
        title="Invoices"
        description="Search, filter and export every invoice your team has processed."
        className="mb-0"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport("excel")}>
              <Download className="h-4 w-4" /> Excel
            </Button>
          </>
        }
      />

      <SearchFilters onChange={(f) => { setFilters(f); setPage(1); }} />

      <InvoiceTable
        invoices={invoices}
        loading={loading}
        onDelete={setDeleteId}
        onSort={handleSort}
        sortBy={sortBy}
        sortOrder={sortOrder}
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={20}
        onPageChange={setPage}
      />

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete this invoice?"
        description="This permanently removes the invoice and its extracted data. This action cannot be undone."
        confirmLabel={deleting ? "Deleting…" : "Delete invoice"}
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

function InvoicesFallback() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-72 w-full rounded-lg" />
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<InvoicesFallback />}>
      <InvoicesContent />
    </Suspense>
  );
}
