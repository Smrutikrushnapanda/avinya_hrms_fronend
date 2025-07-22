"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex flex-col justify-between bg-gradient-to-b from-white to-slate-100 dark:from-slate-900 dark:to-black">
      {/* Hero Section */}
      <main className="flex-1 w-full px-6 sm:px-12 py-20 flex flex-col items-center text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-center">
          <span className="bg-gradient-to-r from-[#184a8c] to-[#00b4db] bg-clip-text text-transparent">
            Avinya HRMS
          </span>
        </h1>
        <p className="text-sm sm:text-md bg-gradient-to-r from-[#184a8c] to-[#00b4db] bg-clip-text text-transparent text-muted-foreground text-center mb-6">
          Reinventing the Way You Work
        </p>

        <p className="text-muted-foreground max-w-xl text-base sm:text-lg mb-8">
          Empower your workforce with our modern, scalable, and intuitive Human
          Resource Management System.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            className="px-6 py-2 text-base"
            size="lg"
            onClick={() => router.push("/signin")}
          >
            Sign In
          </Button>
          <Button variant="outline" className="px-6 py-2 text-base" size="lg">
            Learn More
          </Button>
        </div>
      </main>

      {/* Feature Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 px-6 sm:px-20">
        <Card className="rounded-2xl shadow-lg">
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-semibold mb-2">Employee Directory</h2>
            <p className="text-sm text-muted-foreground">
              Manage employee records, contact info, and departments
              effortlessly.
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-lg">
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-semibold mb-2">Leave Management</h2>
            <p className="text-sm text-muted-foreground">
              Streamline leave applications, approvals, and tracking with ease.
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-lg">
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-semibold mb-2">Payroll & Attendance</h2>
            <p className="text-sm text-muted-foreground">
              Integrated payroll with attendance for accurate, on-time payouts.
            </p>
          </CardContent>
        </Card>
      </section>
      <section className="h-20"></section>

      {/* Footer */}
      <footer className="bg-white dark:bg-black w-full fixed bottom-0 border-t py-3 px-6 sm:px-20 text-sm text-muted-foreground flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>&copy; 2025 Avinya HRMS. All rights reserved.</div>
        <div className="flex gap-4">
          <a href="/privacy" className="hover:underline underline-offset-4">
            Privacy
          </a>
          <a href="/terms" className="hover:underline underline-offset-4">
            Terms
          </a>
          <a href="/support" className="hover:underline underline-offset-4">
            Support
          </a>
        </div>
      </footer>
    </div>
  );
}
