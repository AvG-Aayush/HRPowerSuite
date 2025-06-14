import { useQuery } from "@tanstack/react-query";
import MetricsCards from "@/components/dashboard/metrics-cards";
import AttendanceChart from "@/components/dashboard/attendance-chart";
import QuickActions from "@/components/dashboard/quick-actions";
import RecentAnnouncements from "@/components/dashboard/recent-activity";
import LeaveRequests from "@/components/dashboard/leave-requests";
import LiveTracker from "@/components/attendance/live-tracker";

export default function Dashboard() {
  // Get dashboard metrics with optimized loading
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/dashboard/metrics'],
    refetchInterval: 60000, // Reduced frequency - every 60 seconds
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  if (metricsLoading) {
    return (
      <div className="content-padding">
        <div className="stats-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card-responsive animate-pulse">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-8 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="content-padding space-y-4 sm:space-y-6">
      {/* Metrics Cards */}
      <MetricsCards metrics={metrics as any} />

      {/* Main Content Grid */}
      <div className="mobile-stack">
        {/* Attendance Chart */}
        <div className="flex-1 lg:flex-[2]">
          <AttendanceChart />
        </div>

        {/* Quick Actions */}
        <div className="flex-1">
          <QuickActions />
        </div>
      </div>

      {/* Announcements and Leave Requests */}
      <div className="mobile-stack">
        <div className="flex-1">
          <RecentAnnouncements />
        </div>
        <div className="flex-1">
          <LeaveRequests />
        </div>
      </div>

      {/* Live Attendance Tracking */}
      <LiveTracker />
    </div>
  );
}
