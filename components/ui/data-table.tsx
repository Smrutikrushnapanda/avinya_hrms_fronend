"use client";

import * as React from "react";
import {
  ColumnDef,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, ChevronDown } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageCount: number;
  state: {
    page: number;
    pageSize: number;
    search: string;
    sorting: any;
  };
  setState: (s: {
    page: number;
    pageSize: number;
    search: string;
    sorting: any;
  }) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageCount,
  state,
  setState,
}: DataTableProps<TData, TValue>) {
  const [inputValue, setInputValue] = React.useState(state.search);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  // Debounce search
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (inputValue !== state.search) {
        setState({ ...state, search: inputValue, page: 0 });
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [inputValue]);

  const table = useReactTable({
    data,
    columns,
    pageCount,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    state: {
      columnVisibility,
      pagination: {
        pageIndex: state.page,
        pageSize: state.pageSize,
      },
      sorting: state.sorting,
      globalFilter: state.search,
    },
    onPaginationChange: (updater) => {
      const newState =
        typeof updater === "function"
          ? updater({ pageIndex: state.page, pageSize: state.pageSize })
          : updater;
      setState({
        ...state,
        page: newState.pageIndex,
        pageSize: newState.pageSize,
      });
    },
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: (sorting) => setState({ ...state, sorting }),
    onGlobalFilterChange: () => {}, // unused
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="w-full space-y-4">
      {/* Search & Column Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Input
          placeholder="Search..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="max-w-sm"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <span>Columns</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table className="">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
              key={headerGroup.id}
              className="border-b border-gray-200 bg-muted"
            >
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className="cursor-pointer select-none whitespace-nowrap border-r border-gray-200 last:border-r-0 py-2 text-left text-sm font-medium text-muted-foreground"
                >
                  <div className="flex items-center gap-1">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    {header.column.getCanSort() && (
                      <ArrowUpDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-b border-gray-100 hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="border-r border-gray-100 last:border-r-0 px-4 py-2 whitespace-nowrap text-sm"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center h-24"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            Page {state.page + 1} of {pageCount}
          </span>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={state.pageSize}
            onChange={(e) => setState({ ...state, pageSize: +e.target.value })}
          >
            {[10, 20, 30, 50, 100].map((size) => (
              <option key={size} value={size}>
                Show {size}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
