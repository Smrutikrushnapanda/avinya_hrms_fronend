export type PayrollAmountFieldKey =
  | "basic"
  | "hra"
  | "conveyance"
  | "otherAllowances"
  | "pf"
  | "tds";

export type PayrollAmountSection = "earnings" | "deductions";

export interface PayrollAmountFieldConfig {
  key: PayrollAmountFieldKey;
  label: string;
  section: PayrollAmountSection;
  placeholder: string;
}

export interface PayrollTableColumnConfig {
  key: "employee" | "code" | "period" | "netPay" | "status";
  label: string;
}

export interface PayrollStatutoryFieldConfig {
  key:
    | "cinNumber"
    | "panNumber"
    | "tanNumber"
    | "gstinNumber"
    | "pfRegistrationNumber"
    | "esiRegistrationNumber";
  label: string;
  placeholder: string;
}

export const payrollLayoutConfig = {
  moduleTitle: "Payroll Workspace",
  moduleDescription: "Keka-style payroll structure with configurable components and slips.",
  filterSectionTitle: "Run Payroll",
  filterSectionDescription: "Search, filter and process monthly or custom-period payroll.",
  settingsTitle: "Payroll Configuration",
  settingsDescription: "Manage branding and payroll structure used in salary slips.",
  statutoryFields: [
    { key: "cinNumber", label: "Company CIN", placeholder: "L12345MH2020PLC123456" },
    { key: "panNumber", label: "Company PAN", placeholder: "ABCDE1234F" },
    { key: "tanNumber", label: "Company TAN", placeholder: "BLRA12345B" },
    { key: "gstinNumber", label: "GSTIN", placeholder: "22ABCDE1234F1Z5" },
    { key: "pfRegistrationNumber", label: "PF Registration No.", placeholder: "KN12345" },
    { key: "esiRegistrationNumber", label: "ESI Registration No.", placeholder: "31-12345-101" },
  ] as PayrollStatutoryFieldConfig[],
  tableColumns: [
    { key: "employee", label: "Employee" },
    { key: "code", label: "Employee Code" },
    { key: "period", label: "Pay Period" },
    { key: "netPay", label: "Net Pay" },
    { key: "status", label: "Status" },
  ] as PayrollTableColumnConfig[],
  amountFields: [
    { key: "basic", label: "Basic Pay", section: "earnings", placeholder: "0.00" },
    { key: "hra", label: "House Rent Allowance (HRA)", section: "earnings", placeholder: "0.00" },
    { key: "conveyance", label: "Conveyance Allowance", section: "earnings", placeholder: "0.00" },
    { key: "otherAllowances", label: "Special Allowance", section: "earnings", placeholder: "0.00" },
    { key: "pf", label: "Provident Fund (PF)", section: "deductions", placeholder: "0.00" },
    { key: "tds", label: "TDS", section: "deductions", placeholder: "0.00" },
  ] as PayrollAmountFieldConfig[],
};

export const earningFieldKeys = payrollLayoutConfig.amountFields
  .filter((field) => field.section === "earnings")
  .map((field) => field.key);

export const deductionFieldKeys = payrollLayoutConfig.amountFields
  .filter((field) => field.section === "deductions")
  .map((field) => field.key);
