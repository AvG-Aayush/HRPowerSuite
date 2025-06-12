import { Users, UserCheck, Calendar, UserPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MetricsCardsProps {
  metrics?: {
    totalEmployees: number;
    presentToday: number;
    attendanceRate: number;
    pendingLeaves: number;
    newHires: number;
  };
}

export default function MetricsCards({ metrics }: MetricsCardsProps) {
  const cards = [
    {
      title: "Total Employees",
      value: metrics?.totalEmployees || 0,
      trend: "+5.2% from last month",
      icon: Users,
      iconBg: "bg-blue-100 dark:bg-blue-900",
      iconColor: "text-blue-600 dark:text-blue-400",
      trendColor: "text-green-600 dark:text-green-400",
    },
    {
      title: "Present Today",
      value: metrics?.presentToday || 0,
      trend: `${Math.round(metrics?.attendanceRate || 0)}% attendance rate`,
      icon: UserCheck,
      iconBg: "bg-green-100 dark:bg-green-900",
      iconColor: "text-green-600 dark:text-green-400",
      trendColor: "text-green-600 dark:text-green-400",
    },
    {
      title: "Pending Leaves",
      value: metrics?.pendingLeaves || 0,
      trend: "Requires approval",
      icon: Calendar,
      iconBg: "bg-orange-100 dark:bg-orange-900",
      iconColor: "text-orange-600 dark:text-orange-400",
      trendColor: "text-orange-600 dark:text-orange-400",
    },
    {
      title: "New Hires",
      value: metrics?.newHires || 0,
      trend: "This month",
      icon: UserPlus,
      iconBg: "bg-purple-100 dark:bg-purple-900",
      iconColor: "text-purple-600 dark:text-purple-400",
      trendColor: "text-blue-600 dark:text-blue-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="bg-card border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <p className="text-3xl font-bold charcoal-text">
                    {card.value.toLocaleString()}
                  </p>
                  <p className={`text-sm mt-1 ${card.trendColor}`}>
                    {card.trend}
                  </p>
                </div>
                <div className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`${card.iconColor} text-xl`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
