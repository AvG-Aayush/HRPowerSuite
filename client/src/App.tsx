import { Switch, Route } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/theme-context";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { WebSocketProvider } from "@/contexts/websocket-context";
import Layout from "@/components/layout/sidebar";

// Lazy load pages for better performance
const NotFound = lazy(() => import("@/pages/not-found"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Updates = lazy(() => import("@/pages/updates"));
const Onboarding = lazy(() => import("@/pages/onboarding"));
const AttendancePage = lazy(() => import("@/pages/attendance"));
const RealtimeAttendance = lazy(() => import("@/pages/realtime-attendance"));
const AttendanceNew = lazy(() => import("@/pages/attendance-new"));
const HighTechAttendance = lazy(() => import("@/pages/high-tech-attendance"));
const ShiftScheduling = lazy(() => import("@/pages/shift-scheduling"));
const Messages = lazy(() => import("@/pages/messages"));
const AIInsights = lazy(() => import("@/pages/ai-insights"));
const RoleManagement = lazy(() => import("@/pages/role-management"));
const HRForms = lazy(() => import("@/pages/hr-forms"));
const RequestForms = lazy(() => import("@/pages/request-forms"));
const AdminRequests = lazy(() => import("@/pages/admin-requests"));
const SimpleProfile = lazy(() => import("@/pages/simple-profile"));
const AttendanceHistory = lazy(() => import("@/pages/attendance-history"));
const AdminAttendancePage = lazy(() => import("@/pages/admin-attendance"));
const Employees = lazy(() => import("@/pages/employees"));
const PersonalRoutine = lazy(() => import("@/pages/personal-routine"));
const AdminCalendar = lazy(() => import("@/pages/admin-calendar"));
const SimpleLoginPage = lazy(() => import("@/pages/simple-login"));
const AddCalendarEvent = lazy(() => import("@/pages/add-calendar-event"));
const AddShift = lazy(() => import("@/pages/add-shift"));
const AddRoutine = lazy(() => import("@/pages/add-routine"));
const ProjectManagement = lazy(() => import("@/pages/project-management"));

// Loading component for lazy-loaded pages
function PageLoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <Suspense fallback={<PageLoadingSpinner />}>
        <SimpleLoginPage />
      </Suspense>
    );
  }
  
  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <Component />
    </Suspense>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login">
        <Suspense fallback={<PageLoadingSpinner />}>
          <SimpleLoginPage />
        </Suspense>
      </Route>
      <Route path="/updates">
        <ProtectedRoute component={() => (
          <Layout>
            <Updates />
          </Layout>
        )} />
      </Route>

      <Route path="/onboarding">
        <ProtectedRoute component={() => (
          <Layout>
            <Onboarding />
          </Layout>
        )} />
      </Route>
      <Route path="/attendance">
        <ProtectedRoute component={() => (
          <Layout>
            <AttendancePage />
          </Layout>
        )} />
      </Route>
      
      <Route path="/realtime-attendance">
        <ProtectedRoute component={() => (
          <Layout>
            <RealtimeAttendance />
          </Layout>
        )} />
      </Route>
      
      <Route path="/attendance-new">
        <ProtectedRoute component={() => (
          <Layout>
            <AttendanceNew />
          </Layout>
        )} />
      </Route>
      
      <Route path="/high-tech-attendance">
        <ProtectedRoute component={() => (
          <Layout>
            <HighTechAttendance />
          </Layout>
        )} />
      </Route>

      <Route path="/shift-scheduling">
        <ProtectedRoute component={() => (
          <Layout>
            <ShiftScheduling />
          </Layout>
        )} />
      </Route>

      <Route path="/messages">
        <ProtectedRoute component={() => (
          <Layout>
            <Messages />
          </Layout>
        )} />
      </Route>
      <Route path="/ai-insights">
        <ProtectedRoute component={() => (
          <Layout>
            <AIInsights />
          </Layout>
        )} />
      </Route>
      <Route path="/role-management">
        <ProtectedRoute component={() => (
          <Layout>
            <RoleManagement />
          </Layout>
        )} />
      </Route>
      <Route path="/hr-forms">
        <ProtectedRoute component={() => (
          <Layout>
            <HRForms />
          </Layout>
        )} />
      </Route>
      <Route path="/request-forms">
        <ProtectedRoute component={() => (
          <Layout>
            <RequestForms />
          </Layout>
        )} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={() => (
          <Layout>
            <SimpleProfile />
          </Layout>
        )} />
      </Route>
      <Route path="/attendance-history">
        <ProtectedRoute component={() => (
          <Layout>
            <AttendanceHistory />
          </Layout>
        )} />
      </Route>
      
      <Route path="/admin-attendance">
        <ProtectedRoute component={() => (
          <Layout>
            <AdminAttendancePage />
          </Layout>
        )} />
      </Route>

      <Route path="/employees">
        <ProtectedRoute component={() => (
          <Layout>
            <Employees />
          </Layout>
        )} />
      </Route>
      <Route path="/personal-routine">
        <ProtectedRoute component={() => (
          <Layout>
            <PersonalRoutine />
          </Layout>
        )} />
      </Route>
      <Route path="/admin-calendar">
        <ProtectedRoute component={() => (
          <Layout>
            <AdminCalendar />
          </Layout>
        )} />
      </Route>

      <Route path="/add-calendar-event">
        <ProtectedRoute component={() => (
          <Layout>
            <AddCalendarEvent />
          </Layout>
        )} />
      </Route>

      <Route path="/add-shift">
        <ProtectedRoute component={() => (
          <Layout>
            <AddShift />
          </Layout>
        )} />
      </Route>

      <Route path="/add-routine">
        <ProtectedRoute component={() => (
          <Layout>
            <AddRoutine />
          </Layout>
        )} />
      </Route>

      <Route path="/admin-requests">
        <ProtectedRoute component={() => (
          <Layout>
            <AdminRequests />
          </Layout>
        )} />
      </Route>
      <Route path="/project-management">
        <ProtectedRoute component={() => (
          <Layout>
            <ProjectManagement />
          </Layout>
        )} />
      </Route>
      <Route path="/">
        <ProtectedRoute component={() => (
          <Layout>
            <Dashboard />
          </Layout>
        )} />
      </Route>
      <Route>
        <Suspense fallback={<PageLoadingSpinner />}>
          <NotFound />
        </Suspense>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <WebSocketProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </WebSocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
