import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Attendance } from "@shared/schema";

export default function AttendanceChart() {
  const [timeRange, setTimeRange] = useState("7");

  // Get attendance data for the selected time range
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['/api/admin/employees-attendance', timeRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(timeRange));
      
      params.append('startDate', startDate.toISOString().split('T')[0]);
      params.append('endDate', endDate.toISOString().split('T')[0]);
      
      const response = await fetch(`/api/admin/employees-attendance?${params}`);
      if (!response.ok) throw new Error('Failed to fetch attendance data');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  // Process real attendance data for chart visualization
  const processAttendanceData = (data: any[]) => {
    if (!data || data.length === 0) {
      return [];
    }

    // Group attendance by date and count unique users per day
    const attendanceByDate = data.reduce((acc: any, record: any) => {
      const date = new Date(record.date || record.createdAt).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { userIds: new Set(), presentUserIds: new Set() };
      }
      
      // Track unique users for each day
      acc[date].userIds.add(record.userId);
      
      // Count as present if they have a check-in or status is present/completed
      if (record.checkIn || record.status === 'present' || record.status === 'completed') {
        acc[date].presentUserIds.add(record.userId);
      }
      
      return acc;
    }, {});

    // Create chart data for the selected time range
    const chartData = [];
    for (let i = parseInt(timeRange) - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = attendanceByDate[dateStr] || { userIds: new Set(), presentUserIds: new Set() };
      
      const totalUsers = dayData.userIds.size || 1; // Avoid division by zero
      const presentUsers = dayData.presentUserIds.size;
      const attendanceRate = Math.round((presentUsers / totalUsers) * 100);
      
      chartData.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: dateStr,
        rate: attendanceRate,
        height: attendanceRate,
        present: presentUsers,
        total: totalUsers
      });
    }

    return chartData;
  };

  const chartData = processAttendanceData(attendanceData?.data || []);
  const averageAttendance = chartData.length > 0 
    ? chartData.reduce((sum, item) => sum + item.rate, 0) / chartData.length 
    : 0;

  // Calculate dynamic trend
  const calculateTrend = () => {
    if (chartData.length < 2) return { value: '0.0', direction: 'neutral', icon: TrendingUp };
    
    const recentData = chartData.slice(-Math.min(3, chartData.length));
    const olderData = chartData.slice(0, Math.min(3, chartData.length));
    
    const recentAvg = recentData.reduce((sum, day) => sum + day.rate, 0) / recentData.length;
    const olderAvg = olderData.reduce((sum, day) => sum + day.rate, 0) / olderData.length;
    
    const difference = recentAvg - olderAvg;
    
    return {
      value: Math.abs(difference).toFixed(1),
      direction: difference > 0 ? 'up' : difference < 0 ? 'down' : 'neutral',
      icon: difference > 0 ? TrendingUp : difference < 0 ? TrendingUp : TrendingUp
    };
  };

  const trend = calculateTrend();

  return (
    <Card className="bg-card border border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Attendance Trends</span>
            </CardTitle>
            <CardDescription>
              Employee attendance patterns over time
            </CardDescription>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 bg-muted rounded-lg animate-pulse"></div>
        ) : (
          <div className="space-y-4">
            {/* Chart Area */}
            <div className="h-64 bg-muted rounded-lg flex items-end justify-around p-4 space-x-2">
              {chartData.map((item, index) => (
                <div key={item.day} className="flex flex-col items-center flex-1">
                  <div 
                    className={`w-full rounded-t transition-all duration-300 ${
                      item.rate >= 90 ? 'bg-primary-500' : 
                      item.rate >= 80 ? 'bg-primary-400' : 
                      item.rate >= 50 ? 'bg-yellow-500' : 'bg-gray-300'
                    }`}
                    style={{ height: `${item.height}%` }}
                    title={`${item.day}: ${item.rate}%`}
                  ></div>
                  <span className="text-xs text-muted-foreground mt-2 font-medium">
                    {item.day}
                  </span>
                </div>
              ))}
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Average Attendance</p>
                <p className="text-xl font-bold text-primary-600">
                  {Math.round(averageAttendance)}%
                </p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Highest Day</p>
                <p className="text-xl font-bold text-green-600">
                  {chartData.length > 0 ? Math.max(...chartData.map(d => d.rate)) : 0}%
                </p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Trend</p>
                <div className="flex items-center justify-center space-x-1">
                  <trend.icon className={`h-4 w-4 ${
                    trend.direction === 'up' ? 'text-green-600' : 
                    trend.direction === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`} />
                  <span className={`text-xl font-bold ${
                    trend.direction === 'up' ? 'text-green-600' : 
                    trend.direction === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}{trend.value}%
                  </span>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 justify-center">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-primary-500 rounded"></div>
                <span className="text-sm text-muted-foreground">Excellent (90%+)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-primary-400 rounded"></div>
                <span className="text-sm text-muted-foreground">Good (80-89%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span className="text-sm text-muted-foreground">Fair (50-79%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-300 rounded"></div>
                <span className="text-sm text-muted-foreground">Low (&lt;50%)</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
