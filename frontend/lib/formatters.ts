import { format, formatDistanceToNow, parseISO } from "date-fns";

export function formatCurrency(
  amount: string | number | null | undefined,
  currency = "USD",
  locale = "en-US"
): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(num);
}

export function formatDate(
  dateStr: string | null | undefined,
  locale = "en-US"
): string {
  if (!dateStr) return "—";
  try {
    return format(parseISO(dateStr), "PPP");
  } catch {
    return dateStr;
  }
}

export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function getConfidenceColor(confidence: number | null | undefined): string {
  if (confidence === null || confidence === undefined) {
    return "text-red-700 bg-red-50 border-red-200";
  }
  const pct = confidence * 100;
  if (pct >= 90) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (pct >= 75) return "text-amber-700 bg-amber-50 border-amber-200";
  if (pct >= 50) return "text-orange-700 bg-orange-50 border-orange-200";
  return "text-red-700 bg-red-50 border-red-200";
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "approved":
      return "text-emerald-700 bg-emerald-50 border-emerald-200";
    case "review_pending":
      return "text-amber-700 bg-amber-50 border-amber-200";
    case "rejected":
      return "text-red-700 bg-red-50 border-red-200";
    case "failed":
      return "text-gray-700 bg-gray-50 border-gray-200";
    default:
      return "text-gray-700 bg-gray-50 border-gray-200";
  }
}

export function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
