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
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-lg border bg-white p-4 shadow-sm">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search vendor or invoice #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Select value={status || "all"} onValueChange={(v) => { const s = v === "all" ? "" : v; setStatus(s); applyFilters({ status: s }); }}>
        <SelectTrigger className="w-[180px]">
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

      <Input type="date" className="w-[150px]" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); applyFilters({ date_from: e.target.value }); }} />
      <Input type="date" className="w-[150px]" value={dateTo} onChange={(e) => { setDateTo(e.target.value); applyFilters({ date_to: e.target.value }); }} />

      <Button variant="ghost" size="sm" onClick={clearFilters}>
        <X className="mr-1 h-4 w-4" /> Clear
      </Button>
    </div>
  );
}
