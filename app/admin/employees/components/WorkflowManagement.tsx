"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Settings,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  getWorkflows,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  addWorkflowStep,
  deleteWorkflowStep,
  addWorkflowAssignment,
  deleteWorkflowAssignment,
  getEmployees,
  getProfile,
  updateStepApprover,
} from "@/app/api/api";

interface Workflow {
  id: string;
  name: string;
  type: string;
  organizationId: string;
  departmentId?: string;
  isActive: boolean;
  steps: WorkflowStep[];
}

interface WorkflowStep {
  id: string;
  workflowId: string;
  stepOrder: number;
  name: string;
  condition?: string;
  status: string;
  assignments: WorkflowAssignment[];
}

interface WorkflowAssignment {
  id: string;
  stepId: string;
  employeeId: string;
  approverId?: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
  };
  approver?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
  };
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  department?: {
    name: string;
  };
  designation?: {
    name: string;
  };
}

export default function WorkflowManagement() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [organizationId, setOrganizationId] = useState("");

  // Dialog states
  const [isWorkflowDialogOpen, setIsWorkflowDialogOpen] = useState(false);
  const [isStepDialogOpen, setIsStepDialogOpen] = useState(false);
  const [isApproverDialogOpen, setIsApproverDialogOpen] = useState(false);

  // Form states
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
  const [workflowForm, setWorkflowForm] = useState({
    name: "",
    type: "TIMESLIP",
    departmentId: "",
    isActive: true,
  });
  const [stepForm, setStepForm] = useState({
    name: "",
    stepOrder: 1,
    condition: "",
  });
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);

  // UI states
  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (organizationId) {
      fetchWorkflows();
      fetchEmployees();
    }
  }, [organizationId]);

  const fetchProfile = async () => {
    try {
      const response = await getProfile();
      setOrganizationId(response.data?.organizationId || "");
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to fetch user profile");
    }
  };

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const response = await getWorkflows();
      setWorkflows(response.data || []);
    } catch (error) {
      console.error("Error fetching workflows:", error);
      toast.error("Failed to fetch workflows");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      setEmployeeLoading(true);
      if (organizationId) {
        const response = await getEmployees(organizationId);
        setEmployees(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to fetch employees");
    } finally {
      setEmployeeLoading(false);
    }
  };

  // Workflow Management
  const handleCreateWorkflow = async () => {
    if (!workflowForm.name.trim()) {
      toast.error("Workflow name is required");
      return;
    }

    try {
      const workflowData = {
        ...workflowForm,
        organizationId,
      };
      await createWorkflow(workflowData);
      toast.success("Workflow created successfully");
      setIsWorkflowDialogOpen(false);
      setWorkflowForm({ name: "", type: "TIMESLIP", departmentId: "", isActive: true });
      fetchWorkflows();
    } catch (error: any) {
      console.error("Error creating workflow:", error);
      toast.error(error.response?.data?.message || "Failed to create workflow");
    }
  };

  const handleEditWorkflow = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setWorkflowForm({
      name: workflow.name,
      type: workflow.type,
      departmentId: workflow.departmentId || "",
      isActive: workflow.isActive,
    });
    setIsWorkflowDialogOpen(true);
  };

  const handleUpdateWorkflow = async () => {
    if (!selectedWorkflow) return;

    try {
      const workflowData = {
        ...workflowForm,
        organizationId,
      };
      await updateWorkflow(selectedWorkflow.id, workflowData);
      toast.success("Workflow updated successfully");
      setIsWorkflowDialogOpen(false);
      setSelectedWorkflow(null);
      setWorkflowForm({ name: "", type: "TIMESLIP", departmentId: "", isActive: true });
      fetchWorkflows();
    } catch (error: any) {
      console.error("Error updating workflow:", error);
      toast.error(error.response?.data?.message || "Failed to update workflow");
    }
  };

  const handleDeleteWorkflow = async (workflow: Workflow) => {
    if (!confirm(`Are you sure you want to delete "${workflow.name}"?`)) {
      return;
    }

    try {
      await deleteWorkflow(workflow.id);
      toast.success("Workflow deleted successfully");
      fetchWorkflows();
    } catch (error: any) {
      console.error("Error deleting workflow:", error);
      toast.error(error.response?.data?.message || "Failed to delete workflow");
    }
  };

  // Step Management
  const handleAddStep = (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    setSelectedWorkflow(workflow || null);
    setStepForm({
      name: "",
      stepOrder: (workflow?.steps.length || 0) + 1,
      condition: "",
    });
    setIsStepDialogOpen(true);
  };

  const handleCreateStep = async () => {
    if (!selectedWorkflow || !stepForm.name.trim()) {
      toast.error("Step name is required");
      return;
    }

    try {
      const stepData = {
        ...stepForm,
        status: "ACTIVE",
      };
      await addWorkflowStep(selectedWorkflow.id, stepData);
      toast.success("Workflow step created successfully");
      setIsStepDialogOpen(false);
      setStepForm({ name: "", stepOrder: 1, condition: "" });
      fetchWorkflows();
    } catch (error: any) {
      console.error("Error creating step:", error);
      toast.error(error.response?.data?.message || "Failed to create step");
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm("Are you sure you want to delete this step?")) {
      return;
    }

    try {
      await deleteWorkflowStep(stepId);
      toast.success("Workflow step deleted successfully");
      fetchWorkflows();
    } catch (error: any) {
      console.error("Error deleting step:", error);
      toast.error(error.response?.data?.message || "Failed to delete step");
    }
  };

  const handleManageApprovers = (step: WorkflowStep) => {
    setSelectedStep(step);
    // Set currently assigned approver (single selection)
    const currentApprover = step.assignments.length > 0
      ? [step.assignments[0].approverId || step.assignments[0].employeeId].filter(Boolean)
      : [];
    setSelectedApprovers(currentApprover);
    setIsApproverDialogOpen(true);
  };


  // Replace your existing handleSaveApprovers function with this:
const handleSaveApprovers = async () => {
  if (!selectedStep) return;

  try {
    const newApproverId = selectedApprovers[0];
    
    if (!newApproverId) {
      toast.error("Please select an approver");
      return;
    }

    // Check if same approver is already assigned
    const currentApprover = selectedStep.assignments.length > 0 
      ? selectedStep.assignments[0].approverId || selectedStep.assignments[0].employeeId 
      : null;

    if (currentApprover === newApproverId) {
      toast.info("This approver is already assigned to this step");
      setIsApproverDialogOpen(false);
      setSelectedStep(null);
      setSelectedApprovers([]);
      return;
    }

    // Use the API to update approver
    await updateStepApprover(selectedStep.id, newApproverId);

    toast.success("Approver updated successfully");
    setIsApproverDialogOpen(false);
    setSelectedStep(null);
    setSelectedApprovers([]);
    fetchWorkflows();
  } catch (error: any) {
    console.error("Error updating approver:", error);
    toast.error(error.response?.data?.message || "Failed to update approver");
  }
};




  const toggleWorkflowExpansion = (workflowId: string) => {
    setExpandedWorkflows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workflowId)) {
        newSet.delete(workflowId);
      } else {
        newSet.add(workflowId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-300 rounded w-1/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Workflow Management</h1>
          <p className="text-gray-600">Manage approval workflows and assign approvers</p>
        </div>
        <Button onClick={() => setIsWorkflowDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Workflow
        </Button>
      </div>

      {/* Workflows List */}
      <div className="space-y-6">
        {workflows.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows found</h3>
              <p className="text-gray-600">Create your first workflow to get started</p>
            </CardContent>
          </Card>
        ) : (
          workflows.map((workflow) => (
            <Card key={workflow.id} className="overflow-hidden">
              <Collapsible>
                <CollapsibleTrigger
                  className="w-full"
                  onClick={() => toggleWorkflowExpansion(workflow.id)}
                >
                  <CardHeader className="hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {expandedWorkflows.has(workflow.id) ? (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                        <div className="text-left">
                          <CardTitle className="text-lg">{workflow.name}</CardTitle>
                          <div className="flex items-center space-x-4 mt-1">
                            <Badge variant="outline">{workflow.type}</Badge>
                            <Badge variant={workflow.isActive ? "default" : "secondary"}>
                              {workflow.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {workflow.steps.length} step{workflow.steps.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddStep(workflow.id);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Step
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditWorkflow(workflow);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWorkflow(workflow);
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent>
                    {workflow.steps.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Settings className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p>No steps configured. Add a step to get started.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {workflow.steps
                          .sort((a, b) => a.stepOrder - b.stepOrder)
                          .map((step, index) => (
                            <div key={step.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-4">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                                  {step.stepOrder}
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900">{step.name}</h4>
                                  <div className="flex items-center space-x-4 mt-1">
                                    <span className="text-sm text-gray-600">
                                      {step.assignments.length > 0 ? "1 approver" : "No approver assigned"}                                    </span>
                                    <div className="flex items-center space-x-2">
                                      {step.assignments.length > 0 && (
                                        <Badge variant="secondary" className="text-xs">
                                          {step.assignments[0].approver?.firstName} {step.assignments[0].approver?.lastName}
                                        </Badge>
                                      )}
                                      {step.assignments.length > 3 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{step.assignments.length - 3} more
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleManageApprovers(step)}
                                >
                                  <Users className="h-4 w-4 mr-1" />
                                  Manage Approvers
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteStep(step.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Workflow Dialog */}
      <Dialog open={isWorkflowDialogOpen} onOpenChange={setIsWorkflowDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedWorkflow ? "Edit Workflow" : "Create New Workflow"}</DialogTitle>
            <DialogDescription>
              {selectedWorkflow ? "Update workflow details" : "Create a new approval workflow"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={workflowForm.name}
                onChange={(e) => setWorkflowForm({ ...workflowForm, name: e.target.value })}
                placeholder="Enter workflow name"
              />
            </div>

            <div>
              <Label htmlFor="type">Type *</Label>
              <Select
                value={workflowForm.type}
                onValueChange={(value) => setWorkflowForm({ ...workflowForm, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select workflow type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TIMESLIP">Timeslip</SelectItem>
                  <SelectItem value="LEAVE">Leave</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                  <SelectItem value="GENERIC">Generic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={workflowForm.isActive}
                onChange={(e) => setWorkflowForm({ ...workflowForm, isActive: e.target.checked })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsWorkflowDialogOpen(false);
                setSelectedWorkflow(null);
                setWorkflowForm({ name: "", type: "TIMESLIP", departmentId: "", isActive: true });
              }}
            >
              Cancel
            </Button>
            <Button onClick={selectedWorkflow ? handleUpdateWorkflow : handleCreateWorkflow}>
              {selectedWorkflow ? "Update" : "Create"} Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Step Dialog */}
      <Dialog open={isStepDialogOpen} onOpenChange={setIsStepDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Workflow Step</DialogTitle>
            <DialogDescription>
              Add a new approval step to "{selectedWorkflow?.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="stepName">Step Name *</Label>
              <Input
                id="stepName"
                value={stepForm.name}
                onChange={(e) => setStepForm({ ...stepForm, name: e.target.value })}
                placeholder="e.g., Manager Approval, HR Review"
              />
            </div>

            <div>
              <Label htmlFor="stepOrder">Step Order</Label>
              <Input
                id="stepOrder"
                type="number"
                value={stepForm.stepOrder}
                onChange={(e) => setStepForm({ ...stepForm, stepOrder: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div>
              <Label htmlFor="condition">Condition (Optional)</Label>
              <Input
                id="condition"
                value={stepForm.condition}
                onChange={(e) => setStepForm({ ...stepForm, condition: e.target.value })}
                placeholder="e.g., amount > 1000"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsStepDialogOpen(false);
                setStepForm({ name: "", stepOrder: 1, condition: "" });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateStep}>Add Step</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fixed Manage Approvers Dialog - Single Selection */}
      <Dialog open={isApproverDialogOpen} onOpenChange={setIsApproverDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Approver</DialogTitle>
            <DialogDescription>
              Select one employee to approve "{selectedStep?.name}" step
            </DialogDescription>
          </DialogHeader>

          {employeeLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="h-8 w-8 mx-auto mb-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <p>Loading employees...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Employee selection area with proper scrolling */}
              <div className="max-h-64 overflow-y-auto space-y-2 border rounded-md p-2 bg-gray-50">
                {employees.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>No employees found</p>
                  </div>
                ) : (
                  employees.map((employee) => (
                    <label
                      key={employee.id}
                      className={`flex items-center space-x-3 p-3 bg-white rounded-lg border cursor-pointer hover:bg-blue-50 transition-colors ${selectedApprovers.includes(employee.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                        }`}
                    >
                      <input
                        type="radio"
                        name="approver"
                        value={employee.id}
                        checked={selectedApprovers.includes(employee.id)}
                        onChange={() => {
                          // Single selection - replace previous selection
                          setSelectedApprovers([employee.id]);
                        }}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {employee.employeeCode}
                          {employee.designation?.name && ` • ${employee.designation.name}`}
                          {employee.department?.name && ` • ${employee.department.name}`}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>

              {/* Selected approver display */}
              {selectedApprovers.length > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                  <div className="text-sm font-medium text-blue-800">
                    Selected Approver:
                  </div>
                  <div className="text-sm text-blue-700">
                    {employees.find(emp => emp.id === selectedApprovers[0])?.firstName} {employees.find(emp => emp.id === selectedApprovers[0])?.lastName}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsApproverDialogOpen(false);
                setSelectedStep(null);
                setSelectedApprovers([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveApprovers}
              disabled={selectedApprovers.length === 0}
            >
              Save Approver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
