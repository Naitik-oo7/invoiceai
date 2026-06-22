"use client";

import Link from "next/link";
import {
  FileText,
  Image,
  Trash2,
  Eye,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCurrency,
  formatDate,
  formatRelativeTime,
  formatStatus,
  getStatusColor,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Invoice } from "@/types";

interface InvoiceTableProps {
  invoices: Invoice[];
  loading?: boolean;
  onDelete: (id: string) => void;
  onSort: (column: string) => void;
  sortBy: string;
  sortOrder: string;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

/** Colour the confidence bar by score band (mirrors getConfidenceColor). */
function confidenceBarColor(pct: number): string {
  if (pct >= 90) return "bg-emerald-500";
  if (pct >= 75) return "bg-amber-500";
  if (pct >= 50) return "bg-orange-500";
  return "bg-red-500";
}

function ConfidenceMeter({
  value,
  className,
}: {
  value: number | null | undefined;
  className?: string;
}) {
  const pct = Math.round((value || 0) * 100);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="h-1.5 w-14 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Extraction confidence ${pct}%`}
      >
        <div
          className={cn("h-full rounded-full transition-all", confidenceBarColor(pct))}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tnum text-xs font-medium text-muted-foreground">{pct}%</span>
    </div>
  );
}

function MethodIcon({ pdfType }: { pdfType: Invoice["pdf_type"] }) {
  const digital = pdfType === "digital";
  const label = digital ? "Digital PDF" : "Scanned image PDF";
  return (
    <span className="inline-flex items-center" title={label}>
      {digital ? (
        <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      ) : (
        /* eslint-disable-next-line jsx-a11y/alt-text */
        <Image className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      )}
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function InvoiceTable({
  invoices,
  loading,
  onDelete,
  onSort,
  sortBy,
  sortOrder,
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: InvoiceTableProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {/* Desktop skeleton */}
        <div className="hidden overflow-hidden rounded-lg border bg-card shadow-card lg:block">
          <div className="border-b bg-muted/50 px-4 py-3">
            <Skeleton className="h-4 w-40" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b px-4 py-4 last:border-0">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="ml-auto h-4 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
        {/* Mobile skeleton */}
        <div className="space-y-3 lg:hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-primary">
          <Inbox className="h-6 w-6" />
        </span>
        <p className="mt-4 text-base font-semibold text-brand-ink">No invoices found</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Nothing matches your filters yet. Upload an invoice to start extracting data.
        </p>
        <Button asChild className="mt-5">
          <Link href="/upload">Upload your first invoice</Link>
        </Button>
      </div>
    );
  }

  const SortHeader = ({ column, label }: { column: string; label: string }) => {
    const active = sortBy === column;
    return (
      <button
        type="button"
        className={cn(
          "group inline-flex items-center gap-1.5 transition-colors hover:text-foreground",
          active && "text-foreground"
        )}
        onClick={() => onSort(column)}
        aria-label={`Sort by ${label}`}
      >
        {label}
        {active ? (
          sortOrder === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-primary" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-primary" />
          )
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
        )}
      </button>
    );
  };

  const ariaSort = (column: string): "ascending" | "descending" | "none" =>
    sortBy === column ? (sortOrder === "asc" ? "ascending" : "descending") : "none";

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="space-y-4">
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto rounded-lg border bg-card shadow-card lg:block">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-medium">Invoice #</th>
              <th scope="col" className="px-4 py-3 text-left font-medium" aria-sort={ariaSort("vendor_name")}>
                <SortHeader column="vendor_name" label="Vendor" />
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium" aria-sort={ariaSort("invoice_date")}>
                <SortHeader column="invoice_date" label="Invoice Date" />
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium" aria-sort={ariaSort("due_date")}>
                <SortHeader column="due_date" label="Due Date" />
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium" aria-sort={ariaSort("total_amount")}>
                <SortHeader column="total_amount" label="Amount" />
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Tax</th>
              <th scope="col" className="px-4 py-3 text-left font-medium">Status</th>
              <th scope="col" className="px-4 py-3 text-left font-medium">Confidence</th>
              <th scope="col" className="px-4 py-3 text-center font-medium">Type</th>
              <th scope="col" className="px-4 py-3 text-left font-medium" aria-sort={ariaSort("created_at")}>
                <SortHeader column="created_at" label="Uploaded" />
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoices.map((inv) => (
              <tr key={inv.id} className="transition-colors hover:bg-muted/40">
                <td className="px-4 py-3 font-medium tnum text-foreground">{inv.invoice_number || "—"}</td>
                <td className="px-4 py-3 text-foreground">{inv.vendor_name || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.invoice_date, inv.detected_locale || "en-US")}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.due_date, inv.detected_locale || "en-US")}</td>
                <td className="px-4 py-3 text-right font-medium tnum text-foreground">{formatCurrency(inv.total_amount, inv.currency || "USD", inv.detected_locale || "en-US")}</td>
                <td className="px-4 py-3 text-right tnum text-muted-foreground">{formatCurrency(inv.tax_amount, inv.currency || "USD", inv.detected_locale || "en-US")}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={cn("border", getStatusColor(inv.status))}>{formatStatus(inv.status)}</Badge>
                </td>
                <td className="px-4 py-3">
                  <ConfidenceMeter value={inv.overall_confidence} />
                </td>
                <td className="px-4 py-3 text-center">
                  <MethodIcon pdfType={inv.pdf_type} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatRelativeTime(inv.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link href={`/review/${inv.id}`} aria-label={`Review invoice ${inv.invoice_number || inv.vendor_name || ""}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => onDelete(inv.id)}
                      aria-label={`Delete invoice ${inv.invoice_number || inv.vendor_name || ""}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <ul className="space-y-3 lg:hidden">
        {invoices.map((inv) => (
          <li
            key={inv.id}
            className="rounded-lg border bg-card p-4 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/review/${inv.id}`}
                  className="block truncate font-semibold text-brand-ink hover:text-primary"
                >
                  {inv.vendor_name || "Unknown vendor"}
                </Link>
                <p className="mt-0.5 truncate text-sm text-muted-foreground tnum">
                  {inv.invoice_number || "No number"} · {formatRelativeTime(inv.created_at)}
                </p>
              </div>
              <Badge variant="outline" className={cn("shrink-0 border", getStatusColor(inv.status))}>
                {formatStatus(inv.status)}
              </Badge>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="font-medium tnum text-foreground">
                  {formatCurrency(inv.total_amount, inv.currency || "USD", inv.detected_locale || "en-US")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Invoice date</p>
                <p className="tnum text-foreground">{formatDate(inv.invoice_date, inv.detected_locale || "en-US")}</p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
              <div className="flex items-center gap-3">
                <ConfidenceMeter value={inv.overall_confidence} />
                <MethodIcon pdfType={inv.pdf_type} />
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/review/${inv.id}`}>
                    <Eye className="h-4 w-4" /> Review
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDelete(inv.id)}
                  aria-label="Delete invoice"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
        <span className="tnum">
          Showing <span className="font-medium text-foreground">{start}–{end}</span> of{" "}
          <span className="font-medium text-foreground">{total}</span>
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="tnum px-1 text-xs">
            Page {page} of {Math.max(totalPages, 1)}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
