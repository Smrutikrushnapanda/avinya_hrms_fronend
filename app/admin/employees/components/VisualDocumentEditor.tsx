"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Minus,
  Undo,
  Redo,
  Sparkles,
  Plus,
  HelpCircle,
  Heading1,
  Heading2,
  Type,
  User,
  Clock,
  Building,
  Calendar,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface TemplateVariableItem {
  key: string;
  label: string;
  icon: string;
  description?: string;
}

export interface TemplateVariableCategory {
  category: string;
  icon: any;
  items: TemplateVariableItem[];
}

export const TEMPLATE_CATEGORIES: TemplateVariableCategory[] = [
  {
    category: "Employee Information",
    icon: User,
    items: [
      { key: "{{employee_name}}", label: "Employee Name", icon: "👤", description: "Full name of the employee" },
      { key: "{{employee_id}}", label: "Employee ID", icon: "🆔", description: "Official employee code" },
      { key: "{{designation}}", label: "Designation", icon: "💼", description: "Job title / designation" },
      { key: "{{department}}", label: "Department", icon: "🏢", description: "Assigned department name" },
      { key: "{{email}}", label: "Work Email", icon: "📧", description: "Employee work email" },
      { key: "{{phone}}", label: "Phone Number", icon: "📱", description: "Contact mobile number" },
      { key: "{{joining_date}}", label: "Joining Date", icon: "📅", description: "Official date of joining" },
      { key: "{{last_working_date}}", label: "Last Working Date", icon: "📅", description: "Relieving / exit date" },
      { key: "{{resignation_date}}", label: "Resignation Date", icon: "📅", description: "Date of resignation" },
      { key: "{{reporting_manager}}", label: "Reporting Manager", icon: "👨‍💼", description: "Primary manager name" },
    ],
  },
  {
    category: "Experience",
    icon: Clock,
    items: [
      { key: "{{experience_duration}}", label: "Experience Duration", icon: "⏱", description: "e.g. 3 Years 4 Months 15 Days" },
      { key: "{{experience_years}}", label: "Experience Years", icon: "📅", description: "e.g. 3 Years" },
      { key: "{{experience_months}}", label: "Experience Months", icon: "📅", description: "e.g. 4 Months" },
      { key: "{{experience_days}}", label: "Experience Days", icon: "📅", description: "e.g. 15 Days" },
    ],
  },
  {
    category: "Organization",
    icon: Building,
    items: [
      { key: "{{organization_name}}", label: "Organization Name", icon: "🏢", description: "Company / organization name" },
      { key: "{{organization_address}}", label: "Organization Address", icon: "📍", description: "Registered business address" },
      { key: "{{organization_phone}}", label: "Organization Phone", icon: "📞", description: "Official contact phone" },
      { key: "{{organization_email}}", label: "Organization Email", icon: "📧", description: "Official contact email" },
    ],
  },
  {
    category: "Dates",
    icon: Calendar,
    items: [
      { key: "{{current_date}}", label: "Current Date", icon: "📅", description: "Date when letter is generated" },
      { key: "{{generation_date}}", label: "Generation Date", icon: "📅", description: "Document issue date" },
    ],
  },
  {
    category: "Settlement & Payables",
    icon: DollarSign,
    items: [
      { key: "{{final_settlement_amount}}", label: "Net Settlement Amount", icon: "💰", description: "Net payable after deductions" },
      { key: "{{salary_due}}", label: "Salary Due", icon: "💵", description: "Salary due amount" },
      { key: "{{pending_salary}}", label: "Pending Salary", icon: "💵", description: "Arrears / hold salary" },
      { key: "{{leave_encashment}}", label: "Leave Encashment", icon: "🏖", description: "Leave encashment amount" },
      { key: "{{bonus}}", label: "Bonus / Ex-Gratia", icon: "🎁", description: "Bonus amount" },
      { key: "{{performance_incentive}}", label: "Performance Incentive", icon: "⭐", description: "Incentive amount" },
      { key: "{{total_earnings}}", label: "Total Gross Earnings", icon: "📈", description: "Gross settlement earnings" },
      { key: "{{total_deductions}}", label: "Total Deductions", icon: "📉", description: "Total exit deductions" },
    ],
  },
];

// Helper to find variable item by key
export function findVariableByKey(key: string): TemplateVariableItem | undefined {
  for (const cat of TEMPLATE_CATEGORIES) {
    const item = cat.items.find((i) => i.key === key);
    if (item) return item;
  }
  return undefined;
}

// Convert {{variable}} to visual chip HTML
export function convertVariablesToVisualChips(rawHtml: string): string {
  if (!rawHtml) return "";
  let result = rawHtml;

  for (const cat of TEMPLATE_CATEGORIES) {
    for (const item of cat.items) {
      const escapedKey = item.key.replace(/([{}])/g, "\\$1");
      const regex = new RegExp(escapedKey, "g");
      const chipHtml = `<span class="variable-token inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 my-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-300 font-sans font-semibold text-xs select-none align-middle shadow-xs" data-variable="${item.key}" contenteditable="false"><span class="text-[11px]">${item.icon}</span><span>${item.label}</span></span>`;
      result = result.replace(regex, chipHtml);
    }
  }
  return result;
}

// Convert visual chips back to {{variable}} HTML
export function convertVisualChipsToVariables(editorHtml: string): string {
  if (!editorHtml) return "";
  if (typeof window === "undefined") return editorHtml;

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = editorHtml;

  const tokens = tempDiv.querySelectorAll(".variable-token");
  tokens.forEach((token) => {
    const varKey = token.getAttribute("data-variable");
    if (varKey) {
      const textNode = document.createTextNode(varKey);
      token.parentNode?.replaceChild(textNode, token);
    }
  });

  return tempDiv.innerHTML;
}

interface VisualDocumentEditorProps {
  initialHtml: string;
  onChange: (htmlWithVariables: string) => void;
  templateType:
    | "EXPERIENCE_LETTER"
    | "RELIEVING_LETTER"
    | "JOINING_LETTER";
}

export default function VisualDocumentEditor({
  initialHtml,
  onChange,
  templateType,
}: VisualDocumentEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Initialize editor content with visual chips
  useEffect(() => {
    if (editorRef.current) {
      const currentHtmlWithVars = convertVisualChipsToVariables(editorRef.current.innerHTML);
      if (currentHtmlWithVars !== initialHtml) {
        editorRef.current.innerHTML = convertVariablesToVisualChips(initialHtml);
      }
    }
  }, [initialHtml]);

  // Save selection before dropdown or button click
  const saveSelection = () => {
    if (typeof window === "undefined") return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  // Restore selection before inserting
  const restoreSelection = (): boolean => {
    if (typeof window === "undefined") return false;
    const sel = window.getSelection();
    if (sel && savedSelectionRef.current && editorRef.current) {
      if (editorRef.current.contains(savedSelectionRef.current.commonAncestorContainer)) {
        sel.removeAllRanges();
        sel.addRange(savedSelectionRef.current);
        return true;
      }
    }
    return false;
  };

  const notifyChange = useCallback(() => {
    if (editorRef.current) {
      const cleanHtml = convertVisualChipsToVariables(editorRef.current.innerHTML);
      onChange(cleanHtml);
    }
  }, [onChange]);

  // Execute formatting command
  const executeCommand = (command: string, value: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();
    document.execCommand(command, false, value);
    notifyChange();
  };

  // Insert variable token chip at current cursor position
  const insertVariableToken = (item: TemplateVariableItem) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const chipHtml = `<span class="variable-token inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 my-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-300 font-sans font-semibold text-xs select-none align-middle shadow-xs" data-variable="${item.key}" contenteditable="false"><span class="text-[11px]">${item.icon}</span><span>${item.label}</span></span>&nbsp;`;

    const hasSelection = restoreSelection();
    if (hasSelection && document.queryCommandSupported("insertHTML")) {
      document.execCommand("insertHTML", false, chipHtml);
    } else {
      // Append at end if no active selection inside editor
      editorRef.current.innerHTML += chipHtml;
    }

    notifyChange();
  };

  return (
    <div className="flex flex-col border rounded-xl bg-card shadow-sm overflow-hidden">
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 p-2 bg-muted/40 border-b">
        <div className="flex flex-wrap items-center gap-1">
          {/* Undo / Redo */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => executeCommand("undo")}
                >
                  <Undo className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Undo (Ctrl+Z)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => executeCommand("redo")}
                >
                  <Redo className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Redo (Ctrl+Y)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="h-5 w-px bg-border mx-1" />

          {/* Heading / Paragraph Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs font-medium gap-1"
                onMouseDown={saveSelection}
              >
                <Type className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Text Style</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="text-xs">
              <DropdownMenuItem onClick={() => executeCommand("formatBlock", "<p>")}>
                Normal Paragraph
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => executeCommand("formatBlock", "<h1>")}>
                <Heading1 className="h-3.5 w-3.5 mr-1" /> Heading 1 (Large Title)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => executeCommand("formatBlock", "<h2>")}>
                <Heading2 className="h-3.5 w-3.5 mr-1" /> Heading 2 (Sub Title)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => executeCommand("formatBlock", "<h3>")}>
                Heading 3 (Section)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-5 w-px bg-border mx-1" />

          {/* Text Formatting: Bold, Italic, Underline */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground font-bold"
                  onClick={() => executeCommand("bold")}
                >
                  <Bold className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Bold (Ctrl+B)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground italic"
                  onClick={() => executeCommand("italic")}
                >
                  <Italic className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Italic (Ctrl+I)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground underline"
                  onClick={() => executeCommand("underline")}
                >
                  <Underline className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Underline (Ctrl+U)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="h-5 w-px bg-border mx-1" />

          {/* Alignment */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => executeCommand("justifyLeft")}
                >
                  <AlignLeft className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Align Left</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => executeCommand("justifyCenter")}
                >
                  <AlignCenter className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Align Center</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => executeCommand("justifyRight")}
                >
                  <AlignRight className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Align Right</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => executeCommand("justifyFull")}
                >
                  <AlignJustify className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Justify</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="h-5 w-px bg-border mx-1" />

          {/* Lists & Divider */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => executeCommand("insertUnorderedList")}
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Bullet List</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => executeCommand("insertOrderedList")}
                >
                  <ListOrdered className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Numbered List</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => executeCommand("insertHorizontalRule")}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Horizontal Divider</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Dynamic Variable Insertion Dropdown & Help */}
        <div className="flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="default"
                className="h-8 px-3 text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                onMouseDown={saveSelection}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Insert Employee Field</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 max-h-[380px] overflow-y-auto p-1.5 text-xs">
              {TEMPLATE_CATEGORIES.map((categoryGroup, index) => {
                const CatIcon = categoryGroup.icon;
                return (
                  <DropdownMenuGroup key={categoryGroup.category}>
                    {index > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuLabel className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-1 px-2">
                      <CatIcon className="h-3 w-3 text-primary" />
                      {categoryGroup.category}
                    </DropdownMenuLabel>
                    {categoryGroup.items.map((item) => (
                      <DropdownMenuItem
                        key={item.key}
                        onClick={() => insertVariableToken(item)}
                        className="flex items-center justify-between py-1.5 px-2 cursor-pointer rounded-md hover:bg-primary/10"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{item.icon}</span>
                          <span className="font-medium text-foreground">{item.label}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                          Insert
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setShowHelp(!showHelp)}
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Help Banner */}
      {showHelp && (
        <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border-b text-xs text-blue-900 dark:text-blue-200 flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="font-bold flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              How Template Fields Work:
            </p>
            <p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-300">
              Type your letter naturally just like in Microsoft Word or Google Docs. To include employee details (such as Name, Designation, Joining Date, or Experience Duration), click <strong>+ Insert Employee Field</strong>. Visual tokens like <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold text-[10px]">👤 Employee Name</span> will automatically fill with real employee information when generating the letter.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px] text-blue-800 dark:text-blue-200"
            onClick={() => setShowHelp(false)}
          >
            Got it
          </Button>
        </div>
      )}

      {/* Quick Insert Tokens Bar */}
      <div className="px-3 py-2 bg-muted/20 border-b flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-[11px] font-semibold text-muted-foreground mr-1">
          Quick Fields:
        </span>
        {[
          { key: "{{employee_name}}", label: "Employee Name", icon: "👤" },
          { key: "{{designation}}", label: "Designation", icon: "💼" },
          { key: "{{department}}", label: "Department", icon: "🏢" },
          { key: "{{joining_date}}", label: "Joining Date", icon: "📅" },
          { key: "{{last_working_date}}", label: "Last Working Date", icon: "📅" },
          { key: "{{experience_duration}}", label: "Experience Duration", icon: "⏱" },
          { key: "{{organization_name}}", label: "Organization Name", icon: "🏢" },
          { key: "{{current_date}}", label: "Current Date", icon: "📅" },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => insertVariableToken(item)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background border hover:bg-primary/10 hover:border-primary/40 text-[11px] font-medium transition-colors"
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Document Sheet Canvas */}
      <div className="p-6 md:p-8 bg-muted/10 min-h-[420px] flex justify-center overflow-y-auto">
        <div className="w-full max-w-4xl bg-background border rounded-lg shadow-sm p-8 md:p-12 space-y-4">
          <div
            ref={editorRef}
            contentEditable
            onInput={notifyChange}
            onKeyUp={saveSelection}
            onMouseUp={saveSelection}
            onBlur={saveSelection}
            className="outline-none min-h-[350px] font-serif text-sm leading-relaxed text-foreground prose prose-sm dark:prose-invert max-w-none focus:ring-0"
            style={{ minHeight: "350px", wordBreak: "break-word" }}
          />
        </div>
      </div>
    </div>
  );
}
