"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataTablePaginationProps {
  /** Current page (1-based) */
  page: number;
  /** Rows per page */
  pageSize: number;
  /** Total number of filtered rows */
  total: number;
  /** Called with the new page number */
  onPageChange: (page: number) => void;
  /** Called with the new page size. Omit to hide the rows selector. */
  onPageSizeChange?: (size: number) => void;
  /** Options for the rows selector */
  pageSizeOptions?: number[];
  /** Plural noun shown in "Showing X–Y of Z <itemLabel>" */
  itemLabel?: string;
  /** Render inside a bordered card footer (adds border-t + padding) */
  className?: string;
}

/**
 * Shared paginator used by every data table.
 *
 * Structure (identical everywhere):
 *   [ Showing X–Y of Z ... ]  [ Rows: 10 ▾ ]     [Previous] [1] […] [n] [Next]
 */
export function DataTablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  itemLabel = "rows",
  className = "",
}: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  // Windowed page numbers: 1 … (page-1) page (page+1) … last
  const pageNumbers: (number | "…")[] = [];
  const nums: number[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - safePage) <= 1) nums.push(p);
  }
  let prev = 0;
  for (const n of nums) {
    if (prev && n - prev > 1) pageNumbers.push("…");
    pageNumbers.push(n);
    prev = n;
  }

  if (total === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-sm text-muted-foreground">
          Showing {from}–{to} of {total} {itemLabel}
        </p>
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rows</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange(Number(v))}
            >
              <SelectTrigger className="h-8 w-[72px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          Previous
        </Button>
        {pageNumbers.map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-sm text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === safePage ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
