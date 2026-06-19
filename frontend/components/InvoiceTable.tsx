"use client";

import Link from "next/link";
import { FileText, Image, Trash2, Eye, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-12 text-center">
        <p className="mb-4 text-lg font-medium">No invoices found</p>
        <Button asChild>
          <Link href="/upload">Upload your first invoice</Link>
        </Button>
      </div>
    );
  }

  const SortButton = ({ column, label }: { column: string; label: string }) => (
    <button
      className="flex items-center gap-1 hover:text-primary"
      onClick={() => onSort(column)}
    >
      {label}
      {sortBy === column && <ArrowUpDown className="h-3 w-3" />}
    </button>
  );

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Invoice #</th>
              <th className="px-4 py-3 text-left font-medium"><SortButton column="vendor_name" label="Vendor" /></th>
              <th className="px-4 py-3 text-left font-medium"><SortButton column="invoice_date" label="Invoice Date" /></th>
              <th className="px-4 py-3 text-left font-medium"><SortButton column="due_date" label="Due Date" /></th>
              <th className="px-4 py-3 text-left font-medium"><SortButton column="total_amount" label="Amount" /></th>
              <th className="px-4 py-3 text-left font-medium">Tax</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Confidence</th>
              <th className="px-4 py-3 text-left font-medium">Method</th>
              <th className="px-4 py-3 text-left font-medium"><SortButton column="created_at" label="Uploaded" /></th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b hover:bg-slate-50">
                <td className="px-4 py-3">{inv.invoice_number || "—"}</td>
                <td className="px-4 py-3">{inv.vendor_name || "—"}</td>
                <td className="px-4 py-3">{formatDate(inv.invoice_date, inv.detected_locale || "en-US")}</td>
                <td className="px-4 py-3">{formatDate(inv.due_date, inv.detected_locale || "en-US")}</td>
                <td className="px-4 py-3">{formatCurrency(inv.total_amount, inv.currency || "USD", inv.detected_locale || "en-US")}</td>
                <td className="px-4 py-3">{formatCurrency(inv.tax_amount, inv.currency || "USD", inv.detected_locale || "en-US")}</td>
                <td className="px-4 py-3">
                  <Badge className={cn(getStatusColor(inv.status))}>{formatStatus(inv.status)}</Badge>
                </td>
                <td className="px-4 py-3 w-24">
                  <Progress value={(inv.overall_confidence || 0) * 100} className="h-2" />
                </td>
                <td className="px-4 py-3">
                  {inv.pdf_type === "digital" ? <FileText className="h-4 w-4" /> : <Image className="h-4 w-4" />}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatRelativeTime(inv.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/review/${inv.id}`}><Eye className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(inv.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing {start}–{end} of {total}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
