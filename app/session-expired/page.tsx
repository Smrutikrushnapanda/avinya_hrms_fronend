// app/session-expired/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export default function SessionExpired() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown === 0) {
      router.push("/login"); // redirect to login page after countdown
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl rounded-2xl">
          <CardHeader>
            <div className="flex space-x-2 items-center">
              <AlertTriangle className="h-7 w-7 text-yellow-500 mt-1" />
              <CardTitle className="text-center text-2xl font-bold text-neutral-600">
                Session Expired
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Your session has expired due to inactivity. Please log in again to continue.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to login page in {countdown} second{countdown !== 1 ? "s" : ""}...
            </p>
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 100 }}
            >
              <Button className="w-full" onClick={() => router.push("/login")}>
                Go to Login Now
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
