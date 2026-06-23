import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
      <Logo />
      <p className="mt-10 font-display text-7xl leading-none tracking-tight text-brand-ink">
        404
      </p>
      <h1 className="mt-3 text-xl font-semibold text-foreground">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
      </p>
      <Button asChild className="mt-6">
        <Link href="/dashboard">
          <LayoutDashboard className="h-4 w-4" /> Back to dashboard
        </Link>
      </Button>
    </div>
  );
}
