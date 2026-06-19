import { cn } from "@/lib/utils";

interface LogoMarkProps {
  className?: string;
}

/** The standalone brand mark — a document with an AI spark. */
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("h-8 w-8", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E293B" />
          <stop offset="1" stopColor="#0B5E96" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#logo-bg)" />
      <path
        d="M11 7h7l4 4v10.5A1.5 1.5 0 0 1 20.5 23h-9A1.5 1.5 0 0 1 10 21.5V8.5A1.5 1.5 0 0 1 11.5 7Z"
        fill="#fff"
        fillOpacity="0.16"
      />
      <path
        d="M17.5 7v3.5a1 1 0 0 0 1 1H22"
        stroke="#7DD3FC"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.8 14h6.4M12.8 17h6.4M12.8 20h3.8"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="m22.5 16.8 1.1 2.3 2.4.3-1.8 1.7.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.7 2.4-.3 1.1-2.3Z"
        fill="#38BDF8"
      />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  markClassName?: string;
  /** Render the wordmark in inverted (light-on-dark) colors. */
  inverted?: boolean;
}

/** Mark + wordmark lockup. */
export function Logo({ className, markClassName, inverted }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />
      <span
        className={cn(
          "font-display text-xl leading-none tracking-tight",
          inverted ? "text-white" : "text-brand-ink"
        )}
      >
        Invoice<span className="text-primary">AI</span>
      </span>
    </span>
  );
}
