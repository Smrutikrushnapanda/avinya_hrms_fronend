"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Plane,
  Check,
  X,
  Eye,
  ExternalLink,
  Filter,
  RefreshCw,
  Search,
  Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  getProfile,
  getAllOfficeTrips,
  updateOfficeTripStatus,
  getEmployees,
  getDepartments,
} from "@/app/api/api";
import { format } from "date-fns";

// ─── Constants ───────────────────────────────────────────────────────────────

const TRIP_TYPE_LABELS: Record<string, string> = {
  OFFICE_TRIP: "Office Trip",
  CLIENT_VISIT: "Client Visit",
  OTHER: "Other",
};

const ATTACHMENT_TYPE_LABELS: Record<string, string> = {
  TRAVEL_TICKET: "Travel Ticket",
  APPROVAL_LETTER: "Approval Letter",
  CLIENT_INVITATION: "Client Invitation",
  OTHER: "Other Document",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface OfficeTripAttachment {
  type: string;
  url: string;
  fileName: string;
}

interface OfficeTrip {
  id: string;
  userId: string;
  user?: { id: string; firstName?: string; lastName?: string; email?: string };
  tripType: string;
  tripTypeOther?: string | null;
  fromDate: string;
  toDate: string;
  startTime?: string | null;
  endTime?: string | null;
  clientOfficeName: string;
  location: string;
  purpose: string;
  description?: string | null;
  attachments: OfficeTripAttachment[];
  status: string;
  adminRemarks?: string | null;
  approvedBy?: { id: string; firstName?: string; lastName?: string } | null;
  approvedAt?: string | null;
  createdAt: string;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  switch (status?.toUpperCase()) {
    case "APPROVED":
      return (
        <Badge className="bg-green-100 text-green-700 border-green-300 hover:bg-green-100">
          Approved
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge className="bg-red-100 text-red-700 border-red-300 hover:bg-red-100">
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100">
          Pending
        </Badge>
      );
  }
}

function employeeName(trip: OfficeTrip): string {
  if (trip.user) {
    const parts = [trip.user.firstName, trip.user.lastName].filter(Boolean);
    if (parts.length) return parts.join(" ");
    return trip.user.email || "Employee";
  }
  return "Employee";
}

function tripTypeLabel(trip: OfficeTrip): string {
  return trip.tripType === "OTHER"
    ? trip.tripTypeOther || "Other"
    : TRIP_TYPE_LABELS[trip.tripType] || trip.tripType;
}

function formatDateRange(trip: OfficeTrip): string {
  try {
    const from = format(new Date(trip.fromDate), "dd MMM yyyy");
    const to = format(new Date(trip.toDate), "dd MMM yyyy");
    return from === to ? from : `${from} – ${to}`;
  } catch {
    return "-";
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminOfficeTripsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const approverId = profile?.userId ?? profile?.id;

  const [trips, setTrips] = useState<OfficeTrip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);

  const [employees, setEmployees] = useState<{ userId: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Filters (server-side)
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [tripTypeFilter, setTripTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Detail dialog
  const [detailTrip, setDetailTrip] = useState<OfficeTrip | null>(null);

  // Action dialog
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    trip: OfficeTrip | null;
    action: "approve" | "reject" | null;
  }>({ open: false, trip: null, action: null });
  const [remarks, setRemarks] = useState("");
  const [actioning, setActioning] = useState(false);

  // ─── Fetch profile ──────────────────────────────────────────────────────

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfile();
        setProfile(res.data);
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // ─── Fetch employees + departments for filters ──────────────────────────

  useEffect(() => {
    if (!profile?.organizationId) return;
    getEmployees(profile.organizationId)
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setEmployees(
          data.map((e: any) => ({
            userId: e.userId ?? e.user?.id,
            name: [e.firstName, e.lastName].filter(Boolean).join(" ") || e.workEmail || "Employee",
          }))
        );
      })
      .catch(() => {});
    getDepartments(profile.organizationId)
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setDepartments(data.map((d: any) => ({ id: d.id, name: d.name })));
      })
      .catch(() => {});
  }, [profile?.organizationId]);

  // ─── Fetch office trips ─────────────────────────────────────────────────

  const fetchTrips = useCallback(async () => {
    if (!profile?.organizationId) return;
    setTripsLoading(true);
    try {
      const res = await getAllOfficeTrips(profile.organizationId, {
        employeeId: employeeFilter !== "all" ? employeeFilter : undefined,
        departmentId: departmentFilter !== "all" ? departmentFilter : undefined,
        tripType: tripTypeFilter !== "all" ? tripTypeFilter : undefined,
        status: activeTab !== "all" ? activeTab.toUpperCase() : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setTrips(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load office trip requests");
    } finally {
      setTripsLoading(false);
    }
  }, [profile?.organizationId, employeeFilter, departmentFilter, tripTypeFilter, activeTab, dateFrom, dateTo]);

  useEffect(() => {
    if (profile) fetchTrips();
  }, [profile, fetchTrips]);

  // ─── Client-side search on top of server-filtered results ──────────────

  const filtered = useMemo(() => {
    if (!search.trim()) return trips;
    const q = search.toLowerCase();
    return trips.filter(
      (t) =>
        employeeName(t).toLowerCase().includes(q) ||
        t.clientOfficeName.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q) ||
        t.purpose.toLowerCase().includes(q)
    );
  }, [trips, search]);

  // ─── Summary (unfiltered-by-tab counts come from the currently fetched set) ─

  const pending = trips.filter((t) => t.status === "PENDING").length;
  const approved = trips.filter((t) => t.status === "APPROVED").length;
  const rejected = trips.filter((t) => t.status === "REJECTED").length;

  // ─── Approve / Reject ───────────────────────────────────────────────────

  const openAction = (trip: OfficeTrip, action: "approve" | "reject") => {
    setRemarks("");
    setActionDialog({ open: true, trip, action });
  };

  const handleAction = async () => {
    if (!actionDialog.trip || !actionDialog.action) return;
    setActioning(true);
    try {
      await updateOfficeTripStatus(actionDialog.trip.id, approverId, {
        status: actionDialog.action === "approve" ? "APPROVED" : "REJECTED",
        adminRemarks: remarks.trim() || undefined,
      });
      toast.success(
        actionDialog.action === "approve"
          ? "Office trip request approved"
          : "Office trip request rejected"
      );
      setActionDialog({ open: false, trip: null, action: null });
      fetchTrips();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Action failed");
    } finally {
      setActioning(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Plane className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Office Trip / Client Visit Requests</h1>
            <p className="text-xs text-muted-foreground">
              Review requests and manage attendance validation bypass windows
            </p>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={fetchTrips} title="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Pending Review</p>
          <p className="text-2xl font-bold text-amber-600">{pending}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Approved</p>
          <p className="text-2xl font-bold text-green-600">{approved}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Rejected</p>
          <p className="text-2xl font-bold text-red-600">{rejected}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />

            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.userId} value={e.userId}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={tripTypeFilter} onValueChange={setTripTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Trip Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trip Types</SelectItem>
                <SelectItem value="OFFICE_TRIP">Office Trip</SelectItem>
                <SelectItem value="CLIENT_VISIT">Client Visit</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
              <Input
                type="date"
                className="w-[150px]"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">To</Label>
              <Input
                type="date"
                className="w-[150px]"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            {(employeeFilter !== "all" ||
              departmentFilter !== "all" ||
              tripTypeFilter !== "all" ||
              dateFrom ||
              dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEmployeeFilter("all");
                  setDepartmentFilter("all");
                  setTripTypeFilter("all");
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trips Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                All Requests
              </CardTitle>
              <CardDescription>Review, approve or reject office trip / client visit requests</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-8 w-48"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {tripsLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No office trip / client visit requests found
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sl#</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Trip Type</TableHead>
                        <TableHead>Client / Office</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>From – To</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Approved By</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((trip, index) => (
                        <TableRow key={trip.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell className="font-medium">{employeeName(trip)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs gap-1">
                              <Plane className="h-3 w-3" />
                              {tripTypeLabel(trip)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[160px] truncate" title={trip.clientOfficeName}>
                            {trip.clientOfficeName}
                          </TableCell>
                          <TableCell className="text-sm">{trip.location}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {formatDateRange(trip)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={trip.status} />
                            {trip.adminRemarks && (
                              <p
                                className="text-xs text-muted-foreground mt-1 max-w-[140px] truncate"
                                title={trip.adminRemarks}
                              >
                                {trip.adminRemarks}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {trip.approvedBy ? (
                              <>
                                {[trip.approvedBy.firstName, trip.approvedBy.lastName]
                                  .filter(Boolean)
                                  .join(" ") || "Admin"}
                                {trip.approvedAt && (
                                  <div>{format(new Date(trip.approvedAt), "dd MMM yyyy HH:mm")}</div>
                                )}
                              </>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setDetailTrip(trip)}
                                className="h-7 w-7"
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {trip.status === "PENDING" && (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => openAction(trip, "approve")}
                                    className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    title="Approve"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => openAction(trip, "reject")}
                                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    title="Reject"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailTrip} onOpenChange={(open) => !open && setDetailTrip(null)}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          {detailTrip && (
            <>
              <DialogHeader>
                <div className="flex flex-col items-center text-center gap-2 pb-2">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plane className="w-5 h-5 text-primary" />
                  </div>
                  <DialogTitle>{tripTypeLabel(detailTrip)}</DialogTitle>
                  <DialogDescription>
                    {employeeName(detailTrip)} — {formatDateRange(detailTrip)}
                  </DialogDescription>
                </div>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Client / Office Name</p>
                    <p className="font-medium">{detailTrip.clientOfficeName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Location / City</p>
                    <p className="font-medium">{detailTrip.location}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">From Date</p>
                    <p className="font-medium">
                      {format(new Date(detailTrip.fromDate), "dd MMM yyyy")}
                      {detailTrip.startTime ? ` at ${detailTrip.startTime.slice(0, 5)}` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">To Date</p>
                    <p className="font-medium">
                      {format(new Date(detailTrip.toDate), "dd MMM yyyy")}
                      {detailTrip.endTime ? ` at ${detailTrip.endTime.slice(0, 5)}` : ""}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Purpose of Visit</p>
                  <p>{detailTrip.purpose}</p>
                </div>

                {detailTrip.description && (
                  <div>
                    <p className="text-xs text-muted-foreground">Description / Remarks</p>
                    <p>{detailTrip.description}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <StatusBadge status={detailTrip.status} />
                </div>

                {detailTrip.adminRemarks && (
                  <div>
                    <p className="text-xs text-muted-foreground">Admin Remarks</p>
                    <p>{detailTrip.adminRemarks}</p>
                  </div>
                )}

                {detailTrip.approvedBy && (
                  <div>
                    <p className="text-xs text-muted-foreground">Decided By</p>
                    <p>
                      {[detailTrip.approvedBy.firstName, detailTrip.approvedBy.lastName]
                        .filter(Boolean)
                        .join(" ") || "Admin"}
                      {detailTrip.approvedAt &&
                        ` on ${format(new Date(detailTrip.approvedAt), "dd MMM yyyy HH:mm")}`}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Attachments</p>
                  {detailTrip.attachments?.length ? (
                    <div className="space-y-1">
                      {detailTrip.attachments.map((a, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 p-2 border rounded-md"
                        >
                          <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground shrink-0">
                            {ATTACHMENT_TYPE_LABELS[a.type] || a.type}:
                          </span>
                          <span className="flex-1 truncate">{a.fileName}</span>
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:underline text-xs shrink-0"
                          >
                            View <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">None</p>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2">
                {detailTrip.status === "PENDING" && (
                  <>
                    <Button
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => {
                        setDetailTrip(null);
                        openAction(detailTrip, "reject");
                      }}
                    >
                      Reject
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setDetailTrip(null);
                        openAction(detailTrip, "approve");
                      }}
                    >
                      Approve
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve/Reject Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => setActionDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="flex flex-col items-center text-center gap-2 pb-2">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  actionDialog.action === "approve" ? "bg-green-100" : "bg-red-100"
                }`}
              >
                {actionDialog.action === "approve" ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <X className="w-5 h-5 text-red-600" />
                )}
              </div>
              <DialogTitle>
                {actionDialog.action === "approve" ? "Approve Request" : "Reject Request"}
              </DialogTitle>
              {actionDialog.trip && (
                <DialogDescription>
                  {employeeName(actionDialog.trip)} — {tripTypeLabel(actionDialog.trip)} (
                  {formatDateRange(actionDialog.trip)})
                </DialogDescription>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>
                Remarks{" "}
                <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Textarea
                rows={3}
                placeholder="Add remarks for the employee..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, trip: null, action: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={actioning}
              className={
                actionDialog.action === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {actioning ? "Processing..." : actionDialog.action === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
