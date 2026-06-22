"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SearchFiltersProps {
  onChange: (filters: Record<string, string>) => void;
}

export function SearchFilters({ onChange }: SearchFiltersProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [dateFrom, setDateFrom] = useState(searchParams.get("date_from") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("date_to") || "");

  const hasActiveFilters = Boolean(search || status || dateFrom || dateTo);

  const applyFilters = useCallback(
    (overrides: Record<string, string> = {}) => {
      const filters = {
        search: overrides.search ?? search,
        status: overrides.status ?? status,
        date_from: overrides.date_from ?? dateFrom,
        date_to: overrides.date_to ?? dateTo,
      };
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      router.replace(`?${params.toString()}`);
      onChange(filters);
    },
    [search, status, dateFrom, dateTo, onChange, router]
  );

  useEffect(() => {
    const timer = setTimeout(() => applyFilters(), 300);
    return () => clearTimeout(timer);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setDateFrom("");
    setDateTo("");
    router.replace("?");
    onChange({});
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-card sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative min-w-[200px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search vendor or invoice #..."
          aria-label="Search invoices"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Select value={status || "all"} onValueChange={(v) => { const s = v === "all" ? "" : v; setStatus(s); applyFilters({ status: s }); }}>
        <SelectTrigger className="h-11 w-full sm:w-[170px]" aria-label="Filter by status">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="review_pending">Pending Review</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          className="w-full sm:w-[150px]"
          aria-label="From date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); applyFilters({ date_from: e.target.value }); }}
        />
        <span className="text-sm text-muted-foreground">–</span>
        <Input
          type="date"
          className="w-full sm:w-[150px]"
          aria-label="To date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); applyFilters({ date_to: e.target.value }); }}
        />
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={clearFilters}
        disabled={!hasActiveFilters}
        className="sm:ml-auto"
      >
        <X className="mr-1 h-4 w-4" /> Clear
      </Button>
    </div>
  );
}
