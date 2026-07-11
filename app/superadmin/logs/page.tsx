"use client";

import { useEffect, useState } from "react";
import { getSuperadminLogs } from "@/app/api/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Search,
  Activity,
  ArrowLeft,
  ArrowRight,
  Terminal,
  CheckCircle,
  XCircle,
  Clock,
  Laptop
} from "lucide-react";
import { toast } from "sonner";

type LogItem = {
  id: string;
  userName: string | null;
  name: string;
  organizationName: string;
  activityType: string;
  description: string;
  location: string;
  device: string;
  loggedAt: string;
  isSuccess: boolean;
};

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * limit;
      const res = await getSuperadminLogs(limit, offset);
      setLogs(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      toast.error("Failed to load global activity logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const filteredLogs = logs.filter(
    (log) =>
      log.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.userName && log.userName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      log.organizationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.activityType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent flex items-center gap-2">
            <Terminal className="h-7 w-7 text-blue-600" /> Platform Security & Audit Logs
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time trace of user authentications and tenant activity across the cluster.
          </p>
        </div>
      </div>

      {/* Log list Card */}
      <Card className="border border-gray-200 dark:border-gray-800 shadow-sm">
        <CardHeader className="pb-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle>System Activity Logs</CardTitle>
            <CardDescription>
              Displaying {logs.length} of {total} activities globally.
            </CardDescription>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs (user, company, type)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : filteredLogs.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Activity Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Source / Device</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/40 text-xs">
                        <TableCell className="text-slate-500 font-mono whitespace-nowrap">
                          {new Date(log.loggedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold">{log.name}</div>
                          <div className="text-[10px] text-muted-foreground">@{log.userName || "unknown"}</div>
                        </TableCell>
                        <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                          {log.organizationName}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 font-semibold text-blue-600 dark:text-blue-400">
                            {log.activityType}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={log.description}>
                          {log.description}
                        </TableCell>
                        <TableCell className="space-y-0.5">
                          <div className="flex items-center gap-1 text-slate-500 font-mono text-[10px]">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>{log.location}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-500 font-mono text-[10px] truncate max-w-[150px]" title={log.device}>
                            <Laptop className="h-3 w-3 shrink-0" />
                            <span>{log.device}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {log.isSuccess ? (
                            <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination controls */}
              <div className="flex items-center justify-between border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {totalPages || 1}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="gap-1.5"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                    disabled={page >= totalPages}
                    className="gap-1.5"
                  >
                    Next <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/60 mb-3" />
              <h3 className="font-semibold text-lg">No activities recorded</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                There are no user activity records found matching search queries.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
