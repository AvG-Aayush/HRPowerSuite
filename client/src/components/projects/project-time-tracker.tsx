import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  Clock,
  Plus,
  Edit3,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { format, parseISO, addDays, subDays } from "date-fns";

interface AttendanceRecord {
  id: number;
  userId: number;
  checkInTime: string;
  checkOutTime: string | null;
  date: string;
  totalHours: number;
  status: string;
}

interface ProjectAssignment {
  id: number;
  projectId: number;
  userId: number;
  role: string;
  isActive: boolean;
  projectName: string;
  projectStatus: string;
  projectPriority: string;
}

interface ProjectTimeEntry {
  id: number;
  projectId: number;
  userId: number;
  attendanceId: number;
  date: string;
  hoursSpent: number;
  description: string;
  taskType: string;
  billableHours: number;
  status: string;
  projectName: string;
  projectStatus: string;
}

interface TimeAllocation {
  projectId: number;
  projectName: string;
  hours: number;
  description: string;
  taskType: string;
  billableHours: number;
}

export default function ProjectTimeTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [timeAllocations, setTimeAllocations] = useState<TimeAllocation[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch user's project assignments
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<ProjectAssignment[]>({
    queryKey: ['/api/user/project-assignments'],
    enabled: !!user,
  });

  // Fetch attendance record for selected date
  const { data: attendanceRecord, isLoading: attendanceLoading } = useQuery<AttendanceRecord>({
    queryKey: ['/api/attendance/date', format(selectedDate, 'yyyy-MM-dd')],
    enabled: !!user,
  });

  // Fetch existing time entries for selected date
  const { data: existingTimeEntries = [], isLoading: timeEntriesLoading } = useQuery<ProjectTimeEntry[]>({
    queryKey: ['/api/user/daily-project-time', format(selectedDate, 'yyyy-MM-dd')],
    enabled: !!user,
  });

  // Initialize time allocations when data loads
  useEffect(() => {
    if (existingTimeEntries.length > 0) {
      const allocations = existingTimeEntries.map(entry => ({
        projectId: entry.projectId,
        projectName: entry.projectName,
        hours: entry.hoursSpent,
        description: entry.description || '',
        taskType: entry.taskType,
        billableHours: entry.billableHours || 0,
      }));
      setTimeAllocations(allocations);
    } else {
      setTimeAllocations([]);
    }
  }, [existingTimeEntries]);

  // Save time allocations mutation
  const saveTimeAllocationsMutation = useMutation({
    mutationFn: async (allocations: TimeAllocation[]) => {
      const timeEntries = allocations.map(allocation => ({
        projectId: allocation.projectId,
        userId: user?.id,
        attendanceId: attendanceRecord?.id,
        date: selectedDate.toISOString(),
        hoursSpent: allocation.hours,
        description: allocation.description,
        taskType: allocation.taskType,
        billableHours: allocation.billableHours,
        status: 'pending',
      }));

      // Delete existing entries for this date first
      if (existingTimeEntries.length > 0) {
        await apiRequest(`/api/project-time-entries/bulk-delete`, 'POST', {
          userId: user?.id,
          date: format(selectedDate, 'yyyy-MM-dd')
        });
      }

      // Create new entries
      return apiRequest('/api/project-time-entries/bulk-create', 'POST', timeEntries);
    },
    onSuccess: () => {
      toast({ title: "Time allocations saved successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/user/daily-project-time'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setIsEditing(false);
    },
    onError: () => {
      toast({ 
        title: "Failed to save time allocations",
        variant: "destructive" 
      });
    },
  });

  const addProjectAllocation = () => {
    if (assignments.length === 0) {
      toast({ 
        title: "No projects assigned",
        description: "You need to be assigned to projects before tracking time",
        variant: "destructive" 
      });
      return;
    }

    const availableProjects = assignments.filter(
      assignment => !timeAllocations.some(alloc => alloc.projectId === assignment.projectId)
    );

    if (availableProjects.length === 0) {
      toast({ 
        title: "All assigned projects already allocated",
        variant: "destructive" 
      });
      return;
    }

    const firstAvailable = availableProjects[0];
    setTimeAllocations([...timeAllocations, {
      projectId: firstAvailable.projectId,
      projectName: firstAvailable.projectName,
      hours: 0,
      description: '',
      taskType: 'development',
      billableHours: 0,
    }]);
  };

  const updateAllocation = (index: number, field: keyof TimeAllocation, value: any) => {
    const updated = [...timeAllocations];
    if (field === 'projectId') {
      const project = assignments.find(a => a.projectId === value);
      updated[index] = {
        ...updated[index],
        projectId: value,
        projectName: project?.projectName || '',
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setTimeAllocations(updated);
  };

  const removeAllocation = (index: number) => {
    setTimeAllocations(timeAllocations.filter((_, i) => i !== index));
  };

  const saveAllocations = () => {
    const totalAllocated = timeAllocations.reduce((sum, alloc) => sum + alloc.hours, 0);
    const availableHours = attendanceRecord?.totalHours || 0;

    if (totalAllocated > availableHours) {
      toast({ 
        title: "Total allocated hours exceed available working hours",
        description: `Available: ${availableHours}h, Allocated: ${totalAllocated}h`,
        variant: "destructive" 
      });
      return;
    }

    if (timeAllocations.some(alloc => alloc.hours <= 0)) {
      toast({ 
        title: "All allocations must have hours greater than 0",
        variant: "destructive" 
      });
      return;
    }

    saveTimeAllocationsMutation.mutate(timeAllocations);
  };

  const totalAllocatedHours = timeAllocations.reduce((sum, alloc) => sum + alloc.hours, 0);
  const availableHours = attendanceRecord?.totalHours || 0;
  const remainingHours = availableHours - totalAllocatedHours;

  if (assignmentsLoading || attendanceLoading || timeEntriesLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Time Tracking
              </CardTitle>
              <CardDescription>
                Allocate your daily working hours to assigned projects
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Badge variant="outline" className="px-3 py-1">
                {format(selectedDate, 'MMM dd, yyyy')}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                disabled={selectedDate >= new Date()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
              >
                Today
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {attendanceRecord ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Available Working Hours</p>
                  <p className="text-2xl font-bold">{availableHours.toFixed(1)}h</p>
                  <p className="text-xs text-muted-foreground">
                    {attendanceRecord.checkInTime && format(parseISO(attendanceRecord.checkInTime), 'HH:mm')} - 
                    {attendanceRecord.checkOutTime && format(parseISO(attendanceRecord.checkOutTime), 'HH:mm')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">Allocated Hours</p>
                  <p className="text-2xl font-bold text-blue-600">{totalAllocatedHours.toFixed(1)}h</p>
                  <p className="text-xs text-muted-foreground">
                    Remaining: {remainingHours.toFixed(1)}h
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Allocation Progress</span>
                  <span>{((totalAllocatedHours / availableHours) * 100).toFixed(1)}%</span>
                </div>
                <Progress 
                  value={(totalAllocatedHours / availableHours) * 100} 
                  className={totalAllocatedHours > availableHours ? "bg-red-100" : ""}
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Attendance Record</h3>
              <p className="text-sm text-muted-foreground">
                No attendance record found for {format(selectedDate, 'MMM dd, yyyy')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Allocations */}
      {attendanceRecord && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Project Time Allocation</CardTitle>
              <div className="flex gap-2">
                {!isEditing ? (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        // Reset to existing entries
                        if (existingTimeEntries.length > 0) {
                          const allocations = existingTimeEntries.map(entry => ({
                            projectId: entry.projectId,
                            projectName: entry.projectName,
                            hours: entry.hoursSpent,
                            description: entry.description || '',
                            taskType: entry.taskType,
                            billableHours: entry.billableHours || 0,
                          }));
                          setTimeAllocations(allocations);
                        }
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={saveAllocations}
                      disabled={saveTimeAllocationsMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timeAllocations.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No Time Allocated</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start tracking time by allocating hours to your assigned projects
                  </p>
                  {isEditing && (
                    <Button onClick={addProjectAllocation}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Project
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {timeAllocations.map((allocation, index) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">
                              Project
                            </Label>
                            {isEditing ? (
                              <Select
                                value={allocation.projectId.toString()}
                                onValueChange={(value) => updateAllocation(index, 'projectId', parseInt(value))}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {assignments.map((assignment) => (
                                    <SelectItem 
                                      key={assignment.projectId} 
                                      value={assignment.projectId.toString()}
                                      disabled={timeAllocations.some((alloc, i) => 
                                        i !== index && alloc.projectId === assignment.projectId
                                      )}
                                    >
                                      {assignment.projectName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <p className="font-medium">{allocation.projectName}</p>
                            )}
                          </div>

                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">
                              Hours
                            </Label>
                            {isEditing ? (
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max={availableHours}
                                value={allocation.hours}
                                onChange={(e) => updateAllocation(index, 'hours', parseFloat(e.target.value) || 0)}
                                className="mt-1"
                              />
                            ) : (
                              <p className="font-medium">{allocation.hours}h</p>
                            )}
                          </div>

                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">
                              Task Type
                            </Label>
                            {isEditing ? (
                              <Select
                                value={allocation.taskType}
                                onValueChange={(value) => updateAllocation(index, 'taskType', value)}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="development">Development</SelectItem>
                                  <SelectItem value="design">Design</SelectItem>
                                  <SelectItem value="testing">Testing</SelectItem>
                                  <SelectItem value="meeting">Meeting</SelectItem>
                                  <SelectItem value="planning">Planning</SelectItem>
                                  <SelectItem value="documentation">Documentation</SelectItem>
                                  <SelectItem value="research">Research</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <p className="font-medium capitalize">{allocation.taskType}</p>
                            )}
                          </div>

                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">
                              Billable Hours
                            </Label>
                            {isEditing ? (
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max={allocation.hours}
                                value={allocation.billableHours}
                                onChange={(e) => updateAllocation(index, 'billableHours', parseFloat(e.target.value) || 0)}
                                className="mt-1"
                              />
                            ) : (
                              <p className="font-medium">{allocation.billableHours}h</p>
                            )}
                          </div>

                          <div className="md:col-span-2 lg:col-span-4">
                            <Label className="text-xs font-medium text-muted-foreground">
                              Description
                            </Label>
                            {isEditing ? (
                              <div className="flex gap-2 mt-1">
                                <Textarea
                                  placeholder="Describe what you worked on..."
                                  value={allocation.description}
                                  onChange={(e) => updateAllocation(index, 'description', e.target.value)}
                                  rows={2}
                                  className="flex-1"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeAllocation(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground mt-1">
                                {allocation.description || 'No description provided'}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {isEditing && (
                    <Button
                      variant="outline"
                      onClick={addProjectAllocation}
                      className="w-full"
                      disabled={assignments.length === timeAllocations.length}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Another Project
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}