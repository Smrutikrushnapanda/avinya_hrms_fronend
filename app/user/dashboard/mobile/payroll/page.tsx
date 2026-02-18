"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, ArrowLeft, BadgeDollarSign } from "lucide-react";
import { useRouter } from "next/navigation";
import { getProfile, getPayrollRecords } from "@/app/api/api";
import { Skeleton } from "@/components/ui/skeleton";

interface PayrollRecord {
  id: string;
  month: string;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: string;
}

export default function MobilePayrollPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileRes = await getProfile();
        const userId = profileRes.data.id;

        const payrollRes = await getPayrollRecords({ userId });
        const data = payrollRes.data;
        
        if (Array.isArray(data)) {
          setPayrollRecords(data.slice(0, 6)); // Show last 6 months
        } else if (data?.results) {
          setPayrollRecords(data.results.slice(0, 6));
        }
      } catch (error) {
        console.error("Error fetching payroll:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-[#0077b6] text-white px-4 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/user/dashboard/mobile")}>
            <ArrowLeft className="w-5 h-5 text-white" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">Salary Slips</h2>
          </div>
        </div>
        <Bell className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="p-4 pb-20">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">My Salary Slips</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : payrollRecords.length === 0 ? (
              <p className="text-sm text-gray-500">No salary slips available.</p>
            ) : (
              <div className="space-y-3">
                {payrollRecords.map((record) => (
                  <div key={record.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <p className="font-semibold">{record.month} {record.year}</p>
                        <p className="text-xs text-gray-500">Salary Slip</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-[#0077b6]">
                          {formatCurrency(record.netSalary)}
                        </p>
                        <p className="text-xs text-gray-500">Net Salary</p>
                      </div>
                    </div>
                    <div className="border-t pt-2 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500">Basic</p>
                        <p className="font-medium">{formatCurrency(record.basicSalary)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Allowances</p>
                        <p className="font-medium text-green-600">+{formatCurrency(record.allowances)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Deductions</p>
                        <p className="font-medium text-red-600">-{formatCurrency(record.deductions)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

