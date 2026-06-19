import { ShieldCheck, Sparkles, Gauge } from "lucide-react";
import { Logo } from "@/components/Logo";

const highlights = [
  {
    icon: Sparkles,
    title: "AI extraction in seconds",
    body: "Vendor, totals, line items and dates pulled from any PDF invoice.",
  },
  {
    icon: Gauge,
    title: "Confidence you can audit",
    body: "Every field is scored so your team reviews only what matters.",
  },
  {
    icon: ShieldCheck,
    title: "Built-in duplicate guard",
    body: "Catch repeat invoices before they ever reach your ledger.",
  },
];

export function AuthBrandPanel() {
  return (
    <div className="brand-ink-panel relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
      <div className="brand-grid pointer-events-none absolute inset-0 opacity-60" />

      <div className="relative">
        <Logo inverted />
      </div>

      <div className="relative max-w-md space-y-10">
        <div>
          <h2 className="font-display text-4xl leading-tight tracking-tight text-white">
            Turn invoices into clean, reviewed data.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300">
            InvoiceAI reads, validates and flags every document — so finance teams
            stop typing and start approving.
          </p>
        </div>

        <ul className="space-y-5">
          {highlights.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                <Icon className="h-5 w-5 text-sky-300" />
              </span>
              <div>
                <p className="font-medium text-white">{title}</p>
                <p className="mt-0.5 text-sm text-slate-400">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-sm text-slate-500">
        © {new Date().getFullYear()} InvoiceAI. All rights reserved.
      </p>
    </div>
  );
}
