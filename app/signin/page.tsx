"use client";

import Image from "next/image";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { login } from "../api/api";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await login({
        password: password,
        userName: userId,
      });

      const { user: responseUser, access_token } = response.data;

      console.log("Full response:", JSON.stringify(response.data, null, 2));

      let roleNames: string[] = [];
      
      if (Array.isArray(responseUser.roles)) {
        roleNames = responseUser.roles.map((r: any) => {
          if (typeof r === 'string') return r;
          if (r.roleName) return r.roleName;
          if (r.name) return r.name;
          if (r.role) return r.role;
          return '';
        }).filter(Boolean);
      }
      
      if (responseUser.role) {
        if (typeof responseUser.role === 'string') {
          roleNames.push(responseUser.role);
        } else if (responseUser.role.roleName) {
          roleNames.push(responseUser.role.roleName);
        }
      }
      
      if (responseUser.roleName) {
        roleNames.push(responseUser.roleName);
      }

      if (responseUser.userType) {
        roleNames.push(responseUser.userType.toUpperCase());
      }
      if (responseUser.type) {
        roleNames.push(responseUser.type.toUpperCase());
      }

      console.log("Extracted roles:", roleNames);

      const hasAdminRole = roleNames.includes("ADMIN");
      const hasEmployeeRole = roleNames.includes("EMPLOYEE");
      
      let redirectToAdmin = false;
      
      if (hasAdminRole && !hasEmployeeRole) {
        redirectToAdmin = true;
      } else if (hasEmployeeRole && !hasAdminRole) {
        redirectToAdmin = false;
      } else if (hasAdminRole && hasEmployeeRole) {
        redirectToAdmin = false;
      } else {
        setError("Access denied. Only admin and employee users can log in here.");
        setLoading(false);
        return;
      }

      console.log("Redirect to admin:", redirectToAdmin);

      localStorage.setItem("access_token", access_token);
      localStorage.setItem("user", JSON.stringify(responseUser));
      localStorage.setItem("user_role", redirectToAdmin ? "ADMIN" : "EMPLOYEE");

      // Set cookies for middleware authentication
      document.cookie = `user=${encodeURIComponent(JSON.stringify(responseUser))}; path=/; max-age=86400`;
      document.cookie = `user_role=${redirectToAdmin ? "ADMIN" : "EMPLOYEE"}; path=/; max-age=86400`;

      toast.success("Login successful! 🎉");
      
      // Small delay to ensure cookies are set before redirect
      setTimeout(() => {
        if (redirectToAdmin) {
          router.push("/admin/dashboard");
        } else {
          router.push("/user/dashboard");
        }
      }, 100);
    } catch (error: any) {
      setError(error.response?.data?.message || error.message || "Login failed");
      setLoading(false);
    }
  };

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
              <form className="space-y-4" onSubmit={handleLogin}>
                {/* User ID Field */}
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    htmlFor="userid"
                  >
                    User ID
                  </label>
                  <Input
                    id="userid"
                    type="text"
                    placeholder="User ID"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                  />
                </div>

                {/* Password Field with Eye Toggle */}
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    htmlFor="password"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full text-base mt-2"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              {/* Register Link */}
              <div className="text-center mt-4 text-sm text-muted-foreground">
                Don't have an account?{" "}
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
