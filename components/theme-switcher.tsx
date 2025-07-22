"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const isDark = theme === "dark";
  const nextTheme = isDark ? "light" : "dark";

  const toggleTheme = () => {
    setTheme(nextTheme);
  };

  return (
    <div className="fixed top-5 right-5 z-50">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="cursor-pointer rounded-md text-foreground hover:bg-muted hover:text-foreground transition"
            >
              <Moon className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Sun className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle Theme</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Switch to {nextTheme.charAt(0).toUpperCase() + nextTheme.slice(1)} Mode</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export function UserThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const isDark = theme === "dark";
  const nextTheme = isDark ? "light" : "dark";

  const toggleTheme = () => {
    setTheme(nextTheme);
  };

  return (
    <div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="cursor-pointer rounded-md text-foreground hover:bg-muted hover:text-foreground transition"
            >
              <Moon className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Sun className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle Theme</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Switch to {nextTheme.charAt(0).toUpperCase() + nextTheme.slice(1)} Mode</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}