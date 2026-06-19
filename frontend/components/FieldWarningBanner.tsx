import { AlertTriangle } from "lucide-react";

interface FieldWarningBannerProps {
  message: string;
  variant?: "warning" | "sanity";
}

export function FieldWarningBanner({ message, variant = "warning" }: FieldWarningBannerProps) {
  return (
    <div
      className={
        variant === "sanity"
          ? "flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-2 text-sm text-yellow-800"
          : "flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50 p-2 text-sm text-orange-700"
      }
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
