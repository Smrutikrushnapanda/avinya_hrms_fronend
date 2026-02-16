import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

const colorMap: Record<string, { bg: string; border: string; icon: string; darkBg: string; darkBorder: string; darkIcon: string }> = {
  blue: { 
    bg: "bg-blue-50", 
    border: "border-l-blue-500", 
    icon: "text-blue-600",
    darkBg: "dark:bg-blue-950/30", 
    darkBorder: "dark:border-blue-800", 
    darkIcon: "dark:text-blue-400" 
  },
  green: { 
    bg: "bg-emerald-50", 
    border: "border-l-emerald-500", 
    icon: "text-emerald-600",
    darkBg: "dark:bg-emerald-950/30", 
    darkBorder: "dark:border-emerald-800", 
    darkIcon: "dark:text-emerald-400" 
  },
  orange: { 
    bg: "bg-amber-50", 
    border: "border-l-amber-500", 
    icon: "text-amber-600",
    darkBg: "dark:bg-amber-950/30", 
    darkBorder: "dark:border-amber-800", 
    darkIcon: "dark:text-amber-400" 
  },
  red: { 
    bg: "bg-red-50", 
    border: "border-l-red-500", 
    icon: "text-red-600",
    darkBg: "dark:bg-red-950/30", 
    darkBorder: "dark:border-red-800", 
    darkIcon: "dark:text-red-400" 
  },
  purple: { 
    bg: "bg-violet-50", 
    border: "border-l-violet-500", 
    icon: "text-violet-600",
    darkBg: "dark:bg-violet-950/30", 
    darkBorder: "dark:border-violet-800", 
    darkIcon: "dark:text-violet-400" 
  },
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, color = "blue" }: {
  title: string;
  value: number | string;
  subtitle: string;
  icon?: any;
  trend?: number;
  color?: string;
}) {
  const colors = colorMap[color] || colorMap.blue;

  return (
    <Card className={`h-full transition-all hover:shadow-md border-l-4 ${colors.bg} ${colors.darkBg} ${colors.border} ${colors.darkBorder}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {Icon && <Icon className={`h-6 w-6 ${colors.icon} ${colors.darkIcon} opacity-80`} />}
        </div>
        <CardDescription className="text-xs opacity-70">{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div className="text-3xl font-bold">{value}</div>
          {trend !== undefined && (
            <div className={`flex items-center text-sm ${trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              <TrendingUp className={`h-4 w-4 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
              {Math.abs(trend)}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function WidgetCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <Card className={`transition-all hover:shadow-md ${className}`}>
      {children}
    </Card>
  );
}
