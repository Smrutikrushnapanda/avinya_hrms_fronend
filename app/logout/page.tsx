// app/logout/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import axiosInstance from "@/app/api/api";
import Bowser from "bowser";

const clearCookies = () => {
  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.split("=")[0].trim();
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  });
};

const LogoutPage = () => {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(true);

  useEffect(() => {
    const logoutUser = async () => {
      let userId: string | null = null;
      let shouldCallLogout = false;

      try {
        // Try to get user profile - if it succeeds, session is valid
        const { data: profileData } = await axiosInstance.get("/auth/profile");
        userId = profileData?.userId;
        shouldCallLogout = !!userId;
      } catch {
        // Session expired or unauthorized
        console.warn("Session expired or unauthorized. Skipping /auth/logout call.");
      }

      // Device and client info
      const parser = Bowser.getParser(window.navigator.userAgent);
      const result = parser.getResult();

      let ip = "Unknown";
      let location = "Unknown";

      try {
        const geoRes = await fetch("https://ipapi.co/json/");
        if (!geoRes.ok) throw new Error("ipapi.co failed");
        const geoData = await geoRes.json();
        ip = geoData.ip;
        location = `${geoData.city}, ${geoData.region}, ${geoData.country_name}`;
      } catch (geoError) {
        console.error("ipapi.co failed:", geoError);
        try {
          const fallbackRes = await fetch("https://ipwhois.pro/json/?key=HNUNKTZyjaSrTh");
          if (!fallbackRes.ok) throw new Error("ipwho.is failed");
          const fallbackData = await fallbackRes.json();
          ip = fallbackData.ip;
          location = `${fallbackData.city}, ${fallbackData.region}, ${fallbackData.country}`;
        } catch (fallbackError) {
          console.error("Both IP lookups failed:", fallbackError);
        }
      }

      const clientInfo = {
        ip,
        location,
        browser: result.browser.name,
        browserVersion: result.browser.version,
        os: result.os.name,
        deviceType: result.platform.type,
        userAgent: window.navigator.userAgent,
      };

      try {
        // Clear cookies and storage
        clearCookies();
        localStorage.clear();
        sessionStorage.clear();

        // Call logout API if user is logged in
        if (shouldCallLogout) {
          await axiosInstance.post("/auth/logout", {
            userId,
            clientInfo,
          });
        }

        // Animate and redirect to login
        setTimeout(() => {
          setIsLoggingOut(false);
          setTimeout(() => {
            router.push("/signin");
          }, 2000);
        }, 1500);
      } catch (error) {
        console.error("Error during logout flow:", error);
        setIsLoggingOut(false);
      }
    };

    logoutUser();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="p-6 md:p-8 shadow-lg max-w-md text-center">
          <CardContent className="flex flex-col gap-4 items-center">
            {isLoggingOut ? (
              <>
                <Loader2 className="animate-spin text-muted-foreground w-10 h-10" />
                <p className="text-lg font-medium text-gray-700">
                  Logging you out...
                </p>
              </>
            ) : (
              <>
                <LogOut className="text-green-600 w-10 h-10" />
                <p className="text-lg font-semibold text-gray-700">
                  You’ve been logged out.
                </p>
                <p className="text-sm text-muted-foreground">
                  Redirecting to login page...
                </p>
                <Button variant="secondary" onClick={() => router.push("/signin")}>
                  Go to Login Now
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default LogoutPage;
