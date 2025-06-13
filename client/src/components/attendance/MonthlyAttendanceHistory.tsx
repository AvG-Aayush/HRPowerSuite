import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, ChevronLeft, ChevronRight, Clock, User, Printer, Download } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isSameDay } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';

interface AttendanceRecord {
  id: number;
  userId: number;
  date: string;
  checkIn: string;
  checkOut: string;
  workingHours: number;
  overtimeHours: number;
  status: string;
  isAutoCheckout: boolean;
  adminNotes: string;
}

interface ProjectTimeEntry {
  id: number;
  projectId: number;
  projectName: string;
  date: string;
  hoursSpent: number;
  taskType: string;
  status: string;
}

interface Employee {
  id: number;
  fullName: string;
  email: string;
  department: string;
}

export default function MonthlyAttendanceHistory() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  
  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr';
  const displayUserId = selectedEmployee || user?.id;

  // Get all employees for admin/HR users
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['/api/users'],
    enabled: isAdminOrHR,
  });

  // Get attendance records for the selected month
  const { data: attendanceRecords = [], isLoading: attendanceLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance/history', displayUserId, {
      startDate: startOfMonth(selectedMonth).toISOString(),
      endDate: endOfMonth(selectedMonth).toISOString()
    }],
    enabled: !!displayUserId,
  });

  // Get project time entries for the selected month
  const { data: projectTimeEntries = [], isLoading: projectTimeLoading } = useQuery<ProjectTimeEntry[]>({
    queryKey: ['/api/project-time-entries', {
      userId: displayUserId,
      startDate: startOfMonth(selectedMonth).toISOString(),
      endDate: endOfMonth(selectedMonth).toISOString()
    }],
    enabled: !!displayUserId,
  });

  const monthDays = eachDayOfInterval({
    start: startOfMonth(selectedMonth),
    end: endOfMonth(selectedMonth)
  });

  const getAttendanceForDate = (date: Date) => {
    return attendanceRecords.find(record => 
      isSameDay(new Date(record.date), date)
    );
  };

  const getProjectTimeForDate = (date: Date) => {
    return projectTimeEntries.filter(entry => 
      isSameDay(new Date(entry.date), date)
    );
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      present: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      absent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      late: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      early_leave: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      holiday: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      weekend: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    };
    return colors[status as keyof typeof colors] || colors.absent;
  };

  const getTotalStats = () => {
    const totalDays = monthDays.filter(day => !isWeekend(day)).length;
    const presentDays = attendanceRecords.filter(record => record.status === 'present').length;
    const totalWorkingHours = attendanceRecords.reduce((sum, record) => sum + record.workingHours, 0);
    const totalProjectHours = projectTimeEntries.reduce((sum, entry) => sum + entry.hoursSpent, 0);
    
    return {
      totalDays,
      presentDays,
      totalWorkingHours,
      totalProjectHours,
      attendanceRate: totalDays > 0 ? (presentDays / totalDays) * 100 : 0
    };
  };

  const stats = getTotalStats();
  const selectedEmployeeName = employees.find(emp => emp.id === selectedEmployee)?.fullName || user?.fullName;

  const handlePrint = () => {
    const printContent = document.getElementById('monthly-report-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Monthly Attendance Report - ${selectedEmployeeName} - ${format(selectedMonth, 'MMM yyyy')}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
                .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
                .calendar { border-collapse: collapse; width: 100%; }
                .calendar th, .calendar td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                .calendar th { background-color: #f5f5f5; }
                .present { background-color: #dcfce7; }
                .absent { background-color: #fecaca; }
                .late { background-color: #fef3c7; }
                .weekend { background-color: #f3f4f6; }
                @media print { .no-print { display: none; } }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Date', 'Status', 'Check In', 'Check Out', 'Working Hours', 'Project Hours'],
      ...monthDays.map(day => {
        const attendance = getAttendanceForDate(day);
        const projectTime = getProjectTimeForDate(day);
        const totalProjectHours = projectTime.reduce((sum, entry) => sum + entry.hoursSpent, 0);
        
        return [
          format(day, 'yyyy-MM-dd'),
          isWeekend(day) ? 'Weekend' : (attendance?.status || 'Absent'),
          attendance?.checkIn ? format(new Date(attendance.checkIn), 'HH:mm') : '',
          attendance?.checkOut ? format(new Date(attendance.checkOut), 'HH:mm') : '',
          attendance?.workingHours?.toString() || '0',
          totalProjectHours.toString()
        ];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${selectedEmployeeName?.replace(/\s+/g, '-')}-${format(selectedMonth, 'yyyy-MM')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (attendanceLoading || projectTimeLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Loading Monthly Report</h3>
            <p className="text-muted-foreground">Fetching attendance and project data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Monthly Attendance Report</h2>
          <p className="text-muted-foreground">
            Comprehensive view of attendance and project hours
          </p>
        </div>
        
        <div className="flex gap-2 items-center">
          {isAdminOrHR && (
            <Select value={selectedEmployee?.toString() || ""} onValueChange={(value) => setSelectedEmployee(value ? parseInt(value) : null)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Employees</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id.toString()}>
                    {employee.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="px-4 py-2 bg-muted rounded-md font-medium min-w-32 text-center">
            {format(selectedMonth, 'MMM yyyy')}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Working Days</p>
                <p className="text-lg font-semibold">{stats.totalDays}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Present Days</p>
                <p className="text-lg font-semibold">{stats.presentDays}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Working Hours</p>
                <p className="text-lg font-semibold">{stats.totalWorkingHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Project Hours</p>
                <p className="text-lg font-semibold">{stats.totalProjectHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${stats.attendanceRate >= 90 ? 'bg-green-500' : stats.attendanceRate >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`} />
              <div>
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
                <p className="text-lg font-semibold">{stats.attendanceRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Calendar View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {selectedEmployeeName ? `${selectedEmployeeName}'s Monthly Report` : 'Monthly Report'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="min-w-[1000px]">
              {/* Table Header */}
              <div className="grid grid-cols-[120px_repeat(31,50px)_100px] gap-1 mb-2">
                <div className="font-semibold text-sm p-2 bg-muted rounded">Status</div>
                {monthDays.map((day, index) => (
                  <div key={index} className={`text-center p-1 text-xs font-medium rounded ${
                    isWeekend(day) ? 'bg-red-50 text-red-700' : 'bg-muted'
                  }`}>
                    <div>{format(day, 'dd')}</div>
                    <div className="text-[10px] opacity-60">{format(day, 'EEE')}</div>
                  </div>
                ))}
                <div className="font-semibold text-sm p-2 bg-muted rounded text-center">Total</div>
              </div>

              {/* Attendance Status Row */}
              <div className="grid grid-cols-[120px_repeat(31,50px)_100px] gap-1 mb-2">
                <div className="p-2 text-sm font-medium">Attendance</div>
                {monthDays.map((day, index) => {
                  const attendance = getAttendanceForDate(day);
                  const status = isWeekend(day) ? 'weekend' : (attendance?.status || 'absent');
                  return (
                    <div key={index} className="text-center p-1">
                      <Badge className={`text-[10px] px-1 py-0 ${getStatusBadge(status)}`}>
                        {status === 'present' ? 'P' : 
                         status === 'absent' ? 'A' : 
                         status === 'late' ? 'L' : 
                         status === 'early_leave' ? 'EL' :
                         status === 'holiday' ? 'H' :
                         status === 'weekend' ? '-' : 'A'}
                      </Badge>
                    </div>
                  );
                })}
                <div className="text-center p-2 text-sm font-semibold">
                  {stats.presentDays}
                </div>
              </div>

              {/* Check-in Times Row */}
              <div className="grid grid-cols-[120px_repeat(31,50px)_100px] gap-1 mb-2">
                <div className="p-2 text-sm font-medium">Check-in</div>
                {monthDays.map((day, index) => {
                  const attendance = getAttendanceForDate(day);
                  return (
                    <div key={index} className="text-center p-1 text-[10px]">
                      {attendance?.checkIn ? format(new Date(attendance.checkIn), 'HH:mm') : '-'}
                    </div>
                  );
                })}
                <div className="text-center p-2 text-sm">-</div>
              </div>

              {/* Check-out Times Row */}
              <div className="grid grid-cols-[120px_repeat(31,50px)_100px] gap-1 mb-2">
                <div className="p-2 text-sm font-medium">Check-out</div>
                {monthDays.map((day, index) => {
                  const attendance = getAttendanceForDate(day);
                  return (
                    <div key={index} className="text-center p-1 text-[10px]">
                      {attendance?.checkOut ? format(new Date(attendance.checkOut), 'HH:mm') : '-'}
                    </div>
                  );
                })}
                <div className="text-center p-2 text-sm">-</div>
              </div>

              {/* Working Hours Row */}
              <div className="grid grid-cols-[120px_repeat(31,50px)_100px] gap-1 mb-4">
                <div className="p-2 text-sm font-medium">Hours Worked</div>
                {monthDays.map((day, index) => {
                  const attendance = getAttendanceForDate(day);
                  return (
                    <div key={index} className="text-center p-1 text-[10px] font-medium">
                      {attendance?.workingHours ? attendance.workingHours.toFixed(1) : '-'}
                    </div>
                  );
                })}
                <div className="text-center p-2 text-sm font-semibold">
                  {stats.totalWorkingHours.toFixed(1)}h
                </div>
              </div>

              <Separator className="my-4" />

              {/* Project Time Entries - Grouped by Project */}
              {Array.from(new Set(projectTimeEntries.map(entry => entry.projectName))).map((projectName) => (
                <div key={projectName} className="grid grid-cols-[120px_repeat(31,50px)_100px] gap-1 mb-2">
                  <div className="p-2 text-sm font-medium truncate" title={projectName}>
                    {projectName}
                  </div>
                  {monthDays.map((day, index) => {
                    const dayEntries = getProjectTimeForDate(day).filter(entry => entry.projectName === projectName);
                    const totalHours = dayEntries.reduce((sum, entry) => sum + entry.hoursSpent, 0);
                    return (
                      <div key={index} className="text-center p-1 text-[10px]">
                        {totalHours > 0 ? totalHours.toFixed(1) : '-'}
                      </div>
                    );
                  })}
                  <div className="text-center p-2 text-sm font-semibold">
                    {projectTimeEntries
                      .filter(entry => entry.projectName === projectName)
                      .reduce((sum, entry) => sum + entry.hoursSpent, 0)
                      .toFixed(1)}h
                  </div>
                </div>
              ))}

              {/* Total Project Hours Row */}
              <div className="grid grid-cols-[120px_repeat(31,50px)_100px] gap-1 mb-2 border-t pt-2">
                <div className="p-2 text-sm font-semibold">Total Project Hrs</div>
                {monthDays.map((day, index) => {
                  const dayEntries = getProjectTimeForDate(day);
                  const totalHours = dayEntries.reduce((sum, entry) => sum + entry.hoursSpent, 0);
                  return (
                    <div key={index} className="text-center p-1 text-[10px] font-semibold">
                      {totalHours > 0 ? totalHours.toFixed(1) : '-'}
                    </div>
                  );
                })}
                <div className="text-center p-2 text-sm font-bold">
                  {stats.totalProjectHours.toFixed(1)}h
                </div>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}