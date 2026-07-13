"use client";

import { Fragment, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ListTree } from "lucide-react";
import { toast } from "sonner";
import { getAllMenuItemsForAdmin, createMenuItem, updateMenuItem, deleteMenuItem } from "@/app/api/api";

interface MenuItemRow {
  id: string;
  parentId?: string;
  label: string;
  iconName?: string;
  route?: string;
  roles: string[];
  planTiers: string[];
  sortOrder: number;
  condition?: string;
  isActive: boolean;
  children?: MenuItemRow[];
}

const MENU_ITEM_ROLES = ["ADMIN", "HR", "EMPLOYEE", "SUPERADMIN"];
const MENU_ITEM_PLAN_TIERS = ["BASIC", "PRO", "ENTERPRISE"];

export default function SuperadminMenuItemsPage() {
  const [menuItems, setMenuItems] = useState<MenuItemRow[]>([]);
  const [isMenuItemDialogOpen, setIsMenuItemDialogOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItemRow | null>(null);
  const [menuItemForm, setMenuItemForm] = useState({
    parentId: "",
    label: "",
    iconName: "",
    route: "",
    roles: [] as string[],
    planTiers: [] as string[],
    sortOrder: 0,
    condition: "",
    isActive: true,
  });

  const loadMenuItems = async () => {
    try {
      const res = await getAllMenuItemsForAdmin();
      setMenuItems(res.data || []);
    } catch (error) {
      toast.error("Failed to load menu items");
    }
  };

  useEffect(() => {
    loadMenuItems();
  }, []);

  const handleSaveMenuItem = async () => {
    if (!menuItemForm.label.trim()) {
      toast.error("Label is required");
      return;
    }
    if (!menuItemForm.roles.length || !menuItemForm.planTiers.length) {
      toast.error("Select at least one role and one plan tier");
      return;
    }
    try {
      const payload = {
        label: menuItemForm.label.trim(),
        iconName: menuItemForm.iconName.trim() || undefined,
        route: menuItemForm.route.trim() || undefined,
        parentId: menuItemForm.parentId || undefined,
        roles: menuItemForm.roles,
        planTiers: menuItemForm.planTiers,
        sortOrder: menuItemForm.sortOrder,
        condition: menuItemForm.condition || undefined,
        isActive: menuItemForm.isActive,
      };
      if (editingMenuItem) {
        await updateMenuItem(editingMenuItem.id, payload);
        toast.success("Menu item updated");
      } else {
        await createMenuItem(payload);
        toast.success("Menu item created");
      }
      setIsMenuItemDialogOpen(false);
      setEditingMenuItem(null);
      loadMenuItems();
    } catch (error) {
      toast.error("Failed to save menu item");
    }
  };

  const handleDeleteMenuItem = async (item: MenuItemRow) => {
    if (item.children?.length) {
      toast.error("Delete or move this item's children first");
      return;
    }
    if (!confirm(`Delete "${item.label}"? This cannot be undone.`)) return;
    try {
      await deleteMenuItem(item.id);
      toast.success("Menu item deleted");
      loadMenuItems();
    } catch (error) {
      toast.error("Failed to delete menu item");
    }
  };

  const openMenuItemDialog = (item: MenuItemRow | null, parentId?: string) => {
    setEditingMenuItem(item);
    setMenuItemForm(
      item
        ? {
            parentId: item.parentId || "",
            label: item.label,
            iconName: item.iconName || "",
            route: item.route || "",
            roles: item.roles || [],
            planTiers: item.planTiers || [],
            sortOrder: item.sortOrder ?? 0,
            condition: item.condition || "",
            isActive: item.isActive,
          }
        : {
            parentId: parentId || "",
            label: "",
            iconName: "",
            route: "",
            roles: [],
            planTiers: [],
            sortOrder: 0,
            condition: "",
            isActive: true,
          }
    );
    setIsMenuItemDialogOpen(true);
  };

  const toggleMenuItemFormValue = (key: "roles" | "planTiers", value: string) => {
    setMenuItemForm((prev) => {
      const current = prev[key];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: next };
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
          Menu Items
        </h1>
        <p className="text-muted-foreground mt-1">
          Platform-wide sidebar configuration — controls which nav links exist and which roles/plan tiers can see them across every organization.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ListTree className="w-5 h-5" />
              Sidebar Navigation
            </CardTitle>
            <CardDescription>
              These items are global, not organization-specific — changes here affect every tenant on the platform.
            </CardDescription>
          </div>
          <Button onClick={() => openMenuItemDialog(null)}>
            <Plus className="w-4 h-4 mr-2" /> Add Menu Item
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Plan Tiers</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuItems.map((parent) => (
                  <Fragment key={parent.id}>
                    <TableRow>
                      <TableCell className="font-medium">{parent.label}</TableCell>
                      <TableCell>{parent.route || "—"}</TableCell>
                      <TableCell>{parent.roles.join(", ")}</TableCell>
                      <TableCell>{parent.planTiers.join(", ")}</TableCell>
                      <TableCell>{parent.sortOrder}</TableCell>
                      <TableCell>{parent.isActive ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" onClick={() => openMenuItemDialog(null, parent.id)} title="Add sub-item">
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openMenuItemDialog(parent)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteMenuItem(parent)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {parent.children?.map((child) => (
                      <TableRow key={child.id}>
                        <TableCell className="pl-8 text-muted-foreground">↳ {child.label}</TableCell>
                        <TableCell>{child.route || "—"}</TableCell>
                        <TableCell>{child.roles.join(", ")}</TableCell>
                        <TableCell>{child.planTiers.join(", ")}</TableCell>
                        <TableCell>{child.sortOrder}</TableCell>
                        <TableCell>{child.isActive ? "Yes" : "No"}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button variant="ghost" size="sm" onClick={() => openMenuItemDialog(child)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteMenuItem(child)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isMenuItemDialogOpen} onOpenChange={setIsMenuItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMenuItem ? "Edit" : "Add"} Menu Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Label *</Label>
              <Input value={menuItemForm.label} onChange={(e) => setMenuItemForm({ ...menuItemForm, label: e.target.value })} />
            </div>
            <div>
              <Label>Route</Label>
              <Input placeholder="/admin/example" value={menuItemForm.route} onChange={(e) => setMenuItemForm({ ...menuItemForm, route: e.target.value })} />
            </div>
            <div>
              <Label>Icon Name (lucide-react)</Label>
              <Input placeholder="LayoutDashboard" value={menuItemForm.iconName} onChange={(e) => setMenuItemForm({ ...menuItemForm, iconName: e.target.value })} />
            </div>
            <div>
              <Label>Parent</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={menuItemForm.parentId}
                onChange={(e) => setMenuItemForm({ ...menuItemForm, parentId: e.target.value })}
              >
                <option value="">— Top level —</option>
                {menuItems
                  .filter((m) => !editingMenuItem || m.id !== editingMenuItem.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
              </select>
            </div>
            <div>
              <Label>Roles *</Label>
              <div className="flex flex-wrap gap-4 mt-1">
                {MENU_ITEM_ROLES.map((role) => (
                  <label key={role} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={menuItemForm.roles.includes(role)}
                      onCheckedChange={() => toggleMenuItemFormValue("roles", role)}
                    />
                    {role}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Plan Tiers *</Label>
              <div className="flex flex-wrap gap-4 mt-1">
                {MENU_ITEM_PLAN_TIERS.map((tier) => (
                  <label key={tier} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={menuItemForm.planTiers.includes(tier)}
                      onCheckedChange={() => toggleMenuItemFormValue("planTiers", tier)}
                    />
                    {tier}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Condition</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={menuItemForm.condition}
                onChange={(e) => setMenuItemForm({ ...menuItemForm, condition: e.target.value })}
              >
                <option value="">None</option>
                <option value="performance_enabled">Performance enabled for org</option>
                <option value="wfh_approved_today">Viewer has approved WFH today</option>
              </select>
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={menuItemForm.sortOrder}
                onChange={(e) => setMenuItemForm({ ...menuItemForm, sortOrder: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={menuItemForm.isActive} onCheckedChange={(v) => setMenuItemForm({ ...menuItemForm, isActive: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMenuItemDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveMenuItem}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
