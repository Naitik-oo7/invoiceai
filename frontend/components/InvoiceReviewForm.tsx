"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { FileWarning, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldConfidenceBadge } from "@/components/FieldConfidenceBadge";
import { FieldWarningBanner } from "@/components/FieldWarningBanner";
import { ReExtractDiffDialog } from "@/components/ReExtractDiffDialog";
import { api } from "@/lib/api";
import { formatCurrency, formatRelativeTime, getConfidenceColor } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Invoice, ReExtractResponse } from "@/types";

const schema = z.object({
  invoice_number: z.string().optional(),
  vendor_name: z.string().min(1, "Vendor name is required"),
  invoice_date: z.string().min(1, "Invoice date is required"),
  due_date: z.string().optional(),
  total_amount: z.string().min(1, "Total amount is required"),
  tax_amount: z.string().optional(),
  currency: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface InvoiceReviewFormProps {
  invoice: Invoice;
  pdfUrl: string | null;
  token: string;
  onSaved: (invoice: Invoice) => void;
}

const FIELDS = [
  { key: "invoice_number" as const, label: "Invoice Number", type: "text" },
  { key: "vendor_name" as const, label: "Vendor Name", type: "text" },
  { key: "invoice_date" as const, label: "Invoice Date", type: "date" },
  { key: "due_date" as const, label: "Due Date", type: "date" },
  { key: "total_amount" as const, label: "Total Amount", type: "number" },
  { key: "tax_amount" as const, label: "Tax Amount", type: "number" },
  { key: "currency" as const, label: "Currency", type: "text" },
];

export function InvoiceReviewForm({ invoice, pdfUrl, token, onSaved }: InvoiceReviewFormProps) {
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [reExtractData, setReExtractData] = useState<ReExtractResponse | null>(null);
  const [showReExtract, setShowReExtract] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      invoice_number: invoice.invoice_number || "",
      vendor_name: invoice.vendor_name || "",
      invoice_date: invoice.invoice_date || "",
      due_date: invoice.due_date || "",
      total_amount: invoice.total_amount || "",
      tax_amount: invoice.tax_amount || "",
      currency: invoice.currency || "USD",
    },
  });

  const hasWarnings = Object.keys(invoice.field_warnings || {}).length > 0;
  const confidencePct = Math.round((invoice.overall_confidence || 0) * 100);

  const save = async (status: string, extra: Record<string, unknown> = {}) => {
    setSaving(true);
    try {
      const values = form.getValues();
      const updated = await api.updateInvoice(
        invoice.id,
        { ...values, status, ...extra },
        token
      );
      toast.success(status === "approved" ? "Invoice approved" : "Invoice saved");
      onSaved(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    const valid = await form.trigger();
    if (!valid) return;
    if (hasWarnings) {
      setShowApproveConfirm(true);
      return;
    }
    await save("approved");
  };

  const handleReExtract = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const result = await api.reExtract(invoice.id, file, token);
        setReExtractData(result);
        setShowReExtract(true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Re-extraction failed");
      }
    };
    input.click();
  };

  const handleApplyDiff = async (choices: Record<string, string>) => {
    try {
      const updated = await api.applyDiff(invoice.id, choices, token);
      setShowReExtract(false);
      onSaved(updated);
      toast.success("Changes applied");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Apply failed");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-lg">Original Document</CardTitle>
          </CardHeader>
          <CardContent>
            {pdfUrl ? (
              <iframe src={pdfUrl} className="h-[600px] w-full rounded border" title="PDF Preview" />
            ) : (
              <div className="flex h-[300px] flex-col items-center justify-center rounded border border-dashed bg-slate-50 p-6 text-center">
                <FileWarning className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-medium">PDF not retained</p>
                <p className="text-sm text-muted-foreground">
                  Original file no longer available. The review form still works without preview.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-3 space-y-4">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{invoice.original_filename}</Badge>
              <Badge className={invoice.pdf_type === "digital" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}>
                {invoice.pdf_type === "digital" ? "Digital PDF" : "Scanned PDF"}
              </Badge>
              <Badge variant="outline">{invoice.extraction_method === "text" ? "Text extraction" : "Vision extraction"}</Badge>
              {invoice.extraction_cost_usd && (
                <Badge variant="outline">${parseFloat(invoice.extraction_cost_usd).toFixed(4)}</Badge>
              )}
              {invoice.extraction_duration_ms && (
                <Badge variant="outline">{(invoice.extraction_duration_ms / 1000).toFixed(1)}s</Badge>
              )}
            </div>

            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span>Overall confidence</span>
                <span className={cn("font-medium", getConfidenceColor(invoice.overall_confidence).split(" ")[0])}>
                  {confidencePct}%
                </span>
              </div>
              <Progress value={confidencePct} />
            </div>

            <p className="text-xs text-muted-foreground">
              Uploaded {formatRelativeTime(invoice.created_at)}
            </p>
          </CardContent>
        </Card>

        <form className="space-y-4">
          {FIELDS.map(({ key, label, type }) => {
            const warning = invoice.field_warnings?.[key];
            const confidence = invoice.field_confidence?.[key];
            const value = form.watch(key);

            return (
              <div key={key} className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor={key}>{label}</Label>
                  <FieldConfidenceBadge confidence={confidence} value={value} />
                </div>
                <Input id={key} type={type} step={type === "number" ? "0.01" : undefined} {...form.register(key)} />
                {warning && <FieldWarningBanner message={warning} />}
                {form.formState.errors[key] && (
                  <p className="text-sm text-red-600">{form.formState.errors[key]?.message}</p>
                )}
              </div>
            );
          })}
        </form>

        <div className="flex flex-wrap gap-2">
          <Button variant="success" onClick={handleApprove} disabled={saving}>
            Approve & Save
          </Button>
          <Button variant="secondary" onClick={() => save("review_pending")} disabled={saving}>
            Save Draft
          </Button>
          <Button variant="outline" onClick={() => setShowRejectDialog(true)} disabled={saving}>
            Reject
          </Button>
          <Button variant="outline" onClick={handleReExtract} disabled={saving}>
            <RefreshCw className="mr-1 h-4 w-4" /> Re-extract
          </Button>
        </div>
      </div>

      <Dialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve with warnings?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This invoice has extraction warnings. Are you sure you want to approve it?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveConfirm(false)}>Cancel</Button>
            <Button variant="success" onClick={async () => { setShowApproveConfirm(false); await save("approved"); }}>
              Approve anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Invoice</DialogTitle>
          </DialogHeader>
          <textarea
            className="w-full rounded-md border p-2 text-sm"
            rows={3}
            placeholder="Rejection reason..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              setShowRejectDialog(false);
              await save("rejected", { rejection_reason: rejectReason });
            }}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReExtractDiffDialog
        open={showReExtract}
        data={reExtractData}
        onApply={handleApplyDiff}
        onCancel={() => setShowReExtract(false)}
      />
    </div>
  );
}
