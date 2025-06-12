import { useState } from "react";
import { Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

const pageTitle: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Dashboard Overview",
    description: "Welcome back! Here's what's happening at your company today.",
  },
  "/onboarding": {
    title: "Employee Onboarding",
    description: "Manage new employee registration and setup processes.",
  },
  "/attendance": {
    title: "Attendance Tracking",
    description: "Monitor employee attendance with GPS and biometric verification.",
  },
  "/leave-management": {
    title: "Leave Management",
    description: "Review and manage employee leave requests and approvals.",
  },
  "/shift-scheduling": {
    title: "Shift Scheduling",
    description: "Create and manage employee work schedules and assignments.",
  },
  "/chat": {
    title: "Internal Chat",
    description: "Secure communication platform for team collaboration.",
  },
  "/ai-insights": {
    title: "AI Insights",
    description: "Smart analytics and automated reports for HR decision making.",
  },
  "/role-management": {
    title: "Role Management",
    description: "Configure user roles and permission levels across the platform.",
  },
};

export default function Header() {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
  const currentPage = pageTitle[location] || {
    title: "Campaign Nepal",
    description: "Human Resources Management System",
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Implement search functionality
      console.log("Searching for:", searchQuery);
      // You could navigate to a search results page or filter current data
    }
  };

  return (
    <header className="bg-card shadow-sm border-b border-border px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between">
        {/* Page title and description */}
        <div className="flex-1 min-w-0 mr-4 lg:mr-6">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold charcoal-text truncate">
            {currentPage.title}
          </h2>
          <p className="text-muted-foreground mt-1 truncate text-xs sm:text-sm lg:text-base hidden sm:block">
            {currentPage.description}
          </p>
        </div>

        {/* Search and notifications */}
        {/* <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0"> */}
          {/* Search */}
          {/* <form onSubmit={handleSearch} className="relative hidden md:block"> */}
            {/* <div className="relative"> */}
              {/* <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" /> */}
              {/* <Input */}
                {/* type="search" */}
                {/* placeholder="Search employees, reports..." */}
                {/* className="pl-10 pr-4 w-64 lg:w-80 max-w-full" */}
                {/* value={searchQuery} */}
                {/* onChange={(e) => setSearchQuery(e.target.value)} */}
              {/* /> */}
            {/* </div> */}
          {/* </form> */}

          {/* Mobile search button */}
          {/* <Button variant="ghost" size="sm" className="md:hidden"> */}
            {/* <Search className="w-4 h-4" /> */}
          {/* </Button> */}

          {/* Notifications */}
          {/* <div className="relative"> */}
            {/* <Button variant="ghost" size="sm" className="relative"> */}
              {/* <Bell className="w-4 h-4 sm:w-5 sm:h-5" /> */}
              {/* <Badge  */}
                {/* variant="destructive"  */}
                {/* className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center text-xs p-0" */}
              {/* > */}
                {/* 5 */}
              {/* </Badge> */}
            {/* </Button> */}
          {/* </div> */}
        {/* </div> */}
      </div>

      {/* Mobile search bar */}
      {/* <div className="sm:hidden mt-4">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="search"
              placeholder="Search employees, reports..."
              className="pl-10 pr-4 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>
      </div> */}
    </header>
  );
}
