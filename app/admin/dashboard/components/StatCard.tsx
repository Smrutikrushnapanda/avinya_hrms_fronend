import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export function StatCard({ title, value, subtitle, icon: Icon, trend, color = "blue" }: {
  title: string;
  value: number | string;
  subtitle: string;
  icon?: any;
  trend?: number;
  color?: string;
}) {
  return (
    <Card className="h-full transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {Icon && <Icon className="h-6 w-6 opacity-60" />}
        </div>
        <CardDescription className="text-xs opacity-70">{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div className="text-3xl font-bold">{value}</div>
          {trend !== undefined && (
            <div className={`flex items-center text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
