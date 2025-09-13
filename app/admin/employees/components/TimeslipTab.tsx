"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  Plus,
  Calendar,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  getTimeslipsByEmployee,
  createTimeslip,
  updateTimeslip,
  deleteTimeslip,
  getProfile,
} from "@/app/api/api";
import { Employee } from "./types";

interface TimeslipTabProps {
  employeeId: string;
  employee: Employee;
}

interface Timeslip {
  id: string;
  date: string;
  missing_type: 'IN' | 'OUT' | 'BOTH';
  corrected_in: string | null;
  corrected_out: string | null;
  reason: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  updated_at: string;
  approvals: TimeslipApproval[];
}

interface TimeslipApproval {
  id: string;
  action: 'PENDING' | 'APPROVED' | 'REJECTED';
  remarks: string | null;
  acted_at: string | null;
  approver: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
  } | null;
}

export default function TimeslipTab({ employeeId, employee }: TimeslipTabProps) {
  const [timeslips, setTimeslips] = useState<Timeslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTimeslip, setSelectedTimeslip] = useState<Timeslip | null>(null);
  const [organizationId, setOrganizationId] = useState<string>("");
  
  const [formData, setFormData] = useState({
    date: "",
    missingType: "IN" as 'IN' | 'OUT' | 'BOTH',
    correctedIn: "",
    correctedOut: "",
    reason: "",
  });

  useEffect(() => {
    fetchProfile();
    fetchTimeslips();
  }, [employeeId]);

  const fetchProfile = async () => {
    try {
      const response = await getProfile();
      setOrganizationId(response.data?.organizationId || "");
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchTimeslips = async () => {
    try {
      setLoading(true);
      const response = await getTimeslipsByEmployee(employeeId, {
        page: 1,
        limit: 50,
      });
      
      if (response.data?.data) {
        setTimeslips(response.data.data);
      } else if (Array.isArray(response.data)) {
        setTimeslips(response.data);
      } else {
        setTimeslips([]);
      }
    } catch (error) {
      console.error("Error fetching timeslips:", error);
      setTimeslips([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTimeslip = async () => {
    if (!formData.date || !organizationId) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const timeslipData = {
        employeeId: employeeId,
        organizationId: organizationId,
        date: formData.date,
        missingType: formData.missingType,
        correctedIn: formData.correctedIn ? `${formData.date}T${formData.correctedIn}:00` : undefined,
        correctedOut: formData.correctedOut ? `${formData.date}T${formData.correctedOut}:00` : undefined,
        reason: formData.reason || undefined,
      };

      await createTimeslip(timeslipData);
      toast.success("Timeslip created successfully");
      setIsCreateDialogOpen(false);
      resetForm();
      fetchTimeslips();
    } catch (error: any) {
      console.error("Error creating timeslip:", error);
      toast.error(error.response?.data?.message || "Failed to create timeslip");
    }
  };

  const handleUpdateTimeslip = async () => {
    if (!selectedTimeslip || !formData.date) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const updateData = {
        date: formData.date,
        missingType: formData.missingType,
        correctedIn: formData.correctedIn ? `${formData.date}T${formData.correctedIn}:00` : undefined,
        correctedOut: formData.correctedOut ? `${formData.date}T${formData.correctedOut}:00` : undefined,
        reason: formData.reason || undefined,
      };

      await updateTimeslip(selectedTimeslip.id, updateData);
      toast.success("Timeslip updated successfully");
      setIsEditDialogOpen(false);
      setSelectedTimeslip(null);
      resetForm();
      fetchTimeslips();
    } catch (error: any) {
      console.error("Error updating timeslip:", error);
      toast.error(error.response?.data?.message || "Failed to update timeslip");
    }
  };

  const handleDeleteTimeslip = async (timeslip: Timeslip) => {
    if (!confirm("Are you sure you want to delete this timeslip?")) {
      return;
    }

    try {
      await deleteTimeslip(timeslip.id);
      toast.success("Timeslip deleted successfully");
      fetchTimeslips();
    } catch (error: any) {
      console.error("Error deleting timeslip:", error);
      toast.error(error.response?.data?.message || "Failed to delete timeslip");
    }
  };

  const handleEditTimeslip = (timeslip: Timeslip) => {
    setSelectedTimeslip(timeslip);
    setFormData({
      date: timeslip.date,
      missingType: timeslip.missing_type,
      correctedIn: timeslip.corrected_in ? format(new Date(timeslip.corrected_in), "HH:mm") : "",
      correctedOut: timeslip.corrected_out ? format(new Date(timeslip.corrected_out), "HH:mm") : "",
      reason: timeslip.reason || "",
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      date: "",
      missingType: "IN",
      correctedIn: "",
      correctedOut: "",
      reason: "",
    });
  };

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: { icon: Clock, className: "bg-yellow-100 text-yellow-800" },
      APPROVED: { icon: CheckCircle, className: "bg-green-100 text-green-800" },
      REJECTED: { icon: XCircle, className: "bg-red-100 text-red-800" },
    };
    
    const { icon: Icon, className } = config[status as keyof typeof config] || config.PENDING;
    
    return (
      <Badge className={className}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "Not set";
    try {
      return format(new Date(timeString), "HH:mm");
    } catch {
      return "Invalid time";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Time Slip Records</h3>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Timeslip
        </Button>
      </div>

      {timeslips.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No timeslip records found</p>
          <p className="text-sm mt-2">Create a new timeslip to get started</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Missing Type</TableHead>
                <TableHead>Corrected In</TableHead>
                <TableHead>Corrected Out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approvals</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeslips.map((timeslip) => (
                <TableRow key={timeslip.id}>
                  <TableCell>
                    {format(parseISO(timeslip.date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{timeslip.missing_type}</Badge>
                  </TableCell>
                  <TableCell>{formatTime(timeslip.corrected_in)}</TableCell>
                  <TableCell>{formatTime(timeslip.corrected_out)}</TableCell>
                  <TableCell>{getStatusBadge(timeslip.status)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {timeslip.approvals?.map((approval) => (
                        <div key={approval.id} className="text-xs">
                          {approval.approver ? (
                            <span>
                              {approval.approver.firstName} {approval.approver.lastName}: {approval.action}
                            </span>
                          ) : (
                            <span>Pending approval: {approval.action}</span>
                          )}
                        </div>
                      ))}
                      {!timeslip.approvals || timeslip.approvals.length === 0 ? (
                        <span className="text-xs text-gray-500">No approvals yet</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTimeslip(timeslip)}
                        disabled={timeslip.status !== 'PENDING'}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTimeslip(timeslip)}
                        disabled={timeslip.status !== 'PENDING'}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Timeslip Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Timeslip</DialogTitle>
            <DialogDescription>
              Submit a correction request for missing attendance
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div>
              <Label htmlFor="missingType">Missing Type *</Label>
              <Select
                value={formData.missingType}
                onValueChange={(value: 'IN' | 'OUT' | 'BOTH') => 
                  setFormData({...formData, missingType: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Clock In</SelectItem>
                  <SelectItem value="OUT">Clock Out</SelectItem>
                  <SelectItem value="BOTH">Both In & Out</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.missingType === 'IN' || formData.missingType === 'BOTH') && (
              <div>
                <Label htmlFor="correctedIn">Corrected Clock In Time</Label>
                <Input
                  id="correctedIn"
                  type="time"
                  value={formData.correctedIn}
                  onChange={(e) => setFormData({...formData, correctedIn: e.target.value})}
                />
              </div>
            )}

            {(formData.missingType === 'OUT' || formData.missingType === 'BOTH') && (
              <div>
                <Label htmlFor="correctedOut">Corrected Clock Out Time</Label>
                <Input
                  id="correctedOut"
                  type="time"
                  value={formData.correctedOut}
                  onChange={(e) => setFormData({...formData, correctedOut: e.target.value})}
                />
              </div>
            )}

            <div>
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="Explain why the attendance was missed..."
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateTimeslip}>
              Create Timeslip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Timeslip Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Timeslip</DialogTitle>
            <DialogDescription>
              Update your correction request
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="editDate">Date *</Label>
              <Input
                id="editDate"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div>
              <Label htmlFor="editMissingType">Missing Type *</Label>
              <Select
                value={formData.missingType}
                onValueChange={(value: 'IN' | 'OUT' | 'BOTH') => 
                  setFormData({...formData, missingType: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Clock In</SelectItem>
                  <SelectItem value="OUT">Clock Out</SelectItem>
                  <SelectItem value="BOTH">Both In & Out</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.missingType === 'IN' || formData.missingType === 'BOTH') && (
              <div>
                <Label htmlFor="editCorrectedIn">Corrected Clock In Time</Label>
                <Input
                  id="editCorrectedIn"
                  type="time"
                  value={formData.correctedIn}
                  onChange={(e) => setFormData({...formData, correctedIn: e.target.value})}
                />
              </div>
            )}

            {(formData.missingType === 'OUT' || formData.missingType === 'BOTH') && (
              <div>
                <Label htmlFor="editCorrectedOut">Corrected Clock Out Time</Label>
                <Input
                  id="editCorrectedOut"
                  type="time"
                  value={formData.correctedOut}
                  onChange={(e) => setFormData({...formData, correctedOut: e.target.value})}
                />
              </div>
            )}

            <div>
              <Label htmlFor="editReason">Reason</Label>
              <Textarea
                id="editReason"
                placeholder="Explain why the attendance was missed..."
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              setSelectedTimeslip(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTimeslip}>
              Update Timeslip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
