"use client";

import Image from "next/image";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <>
      {/* Mobile Topbar Logo */}
      <div className="md:hidden w-full px-5 py-5 dark:bg-background-top border-b">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-[#184a8c] to-[#00b4db] bg-clip-text text-transparent">
            Avinya HRMS
          </span>
        </h1>
      </div>

      <div className="h-[calc(100vh-1%)] md:min-h-screen flex">
        {/* Left Side - Hero */}
        <div className="hidden md:flex flex-col justify-center items-center w-1/2 bg-gradient-to-b from-white to-slate-100 dark:from-slate-900 dark:to-black px-8 py-16">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-center">
            <span className="bg-gradient-to-r from-[#184a8c] to-[#00b4db] bg-clip-text text-transparent">
              Avinya HRMS
            </span>
          </h1>
          <p className="text-sm sm:text-md bg-gradient-to-r from-[#184a8c] to-[#00b4db] bg-clip-text text-transparent text-muted-foreground text-center mb-6">
            Reinventing the Way You Work
          </p>
          <p className="text-muted-foreground text-center max-w-lg text-base">
            Empower your workforce with our modern, scalable, and intuitive
            Human Resource Management System.
          </p>
        </div>

        {/* Right Side - Login */}
        <div className="flex-col md:flex w-full md:w-1/2 items-center justify-center px-6 sm:px-12 py-16 bg-white dark:bg-black">
          <Card className="w-full max-w-md shadow-lg rounded-2xl">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-2xl font-semibold text-center mb-6">
                Sign in to your account
              </h2>
              <form className="space-y-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    htmlFor="email"
                  >
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    htmlFor="password"
                  >
                    Password
                  </label>
                  <Input id="password" type="password" placeholder="••••••••" />
                </div>
                <Button type="submit" className="w-full text-base mt-2">
                  Sign In
                </Button>
              </form>
              <div className="text-center mt-4 text-sm text-muted-foreground">
                Don’t have an account?{" "}
                <Link
                  href="/register"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Register
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
    </>
  );
}
