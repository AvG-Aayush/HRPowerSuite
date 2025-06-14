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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Timer,
  Briefcase,
  Target,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { format, parseISO, addDays, subDays, isToday } from "date-fns";

interface Project {
  id: number;
  name: string;
  status: string;
  priority: string;
  startDate: string | null;
  endDate: string | null;
  description: string;
  budget: number | null;
  actualHours: number;
}

interface AttendanceRecord {
  id: number;
  userId: number;
  checkIn: string;
  checkOut: string | null;
  date: string;
  workingHours: number;
  status: string;
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
  isNew?: boolean;
}

const taskTypes = [
  { value: 'development', label: 'Development' },
  { value: 'design', label: 'Design' },
  { value: 'testing', label: 'Testing' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'planning', label: 'Planning' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'review', label: 'Code Review' },
  { value: 'research', label: 'Research' },
];

export default function EnhancedTimeTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [timeAllocations, setTimeAllocations] = useState<TimeAllocation[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [totalWorkHours, setTotalWorkHours] = useState<number>(8);

  // Fetch user's assigned projects
  const { data: userProjects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['/api/user/projects'],
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

  // Filter projects available for the selected date
  const getAvailableProjects = () => {
    return userProjects.filter(project => {
      const projectStartDate = project.startDate ? new Date(project.startDate) : null;
      const projectEndDate = project.endDate ? new Date(project.endDate) : null;
      
      const isAfterStart = !projectStartDate || selectedDate >= projectStartDate;
      const isBeforeEnd = !projectEndDate || selectedDate <= projectEndDate;
      
      return isAfterStart && isBeforeEnd && project.status !== 'completed';
    });
  };

  const availableProjects = getAvailableProjects();

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
        isNew: false,
      }));
      setTimeAllocations(allocations);
    } else {
      setTimeAllocations([]);
    }
  }, [existingTimeEntries]);

  // Update total work hours when attendance record changes
  useEffect(() => {
    if (attendanceRecord?.workingHours) {
      setTotalWorkHours(attendanceRecord.workingHours);
    } else {
      setTotalWorkHours(8); // Default 8 hours
    }
  }, [attendanceRecord]);

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
    const unallocatedProjects = availableProjects.filter(
      project => !timeAllocations.some(alloc => alloc.projectId === project.id)
    );

    if (unallocatedProjects.length === 0) {
      toast({ 
        title: "All available projects already allocated",
        variant: "destructive" 
      });
      return;
    }

    const firstAvailable = unallocatedProjects[0];
    setTimeAllocations([...timeAllocations, {
      projectId: firstAvailable.id,
      projectName: firstAvailable.name,
      hours: 0,
      description: '',
      taskType: 'development',
      billableHours: 0,
      isNew: true,
    }]);
  };

  const updateAllocation = (index: number, field: keyof TimeAllocation, value: any) => {
    const updated = [...timeAllocations];
    if (field === 'projectId') {
      const project = availableProjects.find(p => p.id === value);
      updated[index] = {
        ...updated[index],
        projectId: value,
        projectName: project?.name || '',
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setTimeAllocations(updated);
  };

  const removeAllocation = (index: number) => {
    setTimeAllocations(timeAllocations.filter((_, i) => i !== index));
  };

  const autoDistributeHours = () => {
    if (timeAllocations.length === 0) return;
    
    const hoursPerProject = totalWorkHours / timeAllocations.length;
    const updated = timeAllocations.map(allocation => ({
      ...allocation,
      hours: parseFloat(hoursPerProject.toFixed(1)),
    }));
    setTimeAllocations(updated);
  };

  const saveAllocations = () => {
    const totalAllocated = timeAllocations.reduce((sum, alloc) => sum + alloc.hours, 0);

    if (totalAllocated > totalWorkHours) {
      toast({ 
        title: "Total allocated hours exceed available working hours",
        description: `Available: ${totalWorkHours}h, Allocated: ${totalAllocated}h`,
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

    if (timeAllocations.some(alloc => !alloc.description.trim())) {
      toast({ 
        title: "Please provide description for all time entries",
        variant: "destructive" 
      });
      return;
    }

    saveTimeAllocationsMutation.mutate(timeAllocations);
  };

  const totalAllocatedHours = timeAllocations.reduce((sum, alloc) => sum + alloc.hours, 0);
  const remainingHours = totalWorkHours - totalAllocatedHours;
  const allocationPercentage = (totalAllocatedHours / totalWorkHours) * 100;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium': return <Target className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Timer className="h-4 w-4 text-gray-500" />;
    }
  };

  if (projectsLoading || attendanceLoading || timeEntriesLoading) {
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
      {/* Header with Date Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Project Time Tracker
              </CardTitle>
              <CardDescription>
                Allocate your daily working hours across assigned projects
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="px-3 py-1 h-auto min-w-[140px]">
                    <Calendar className="h-4 w-4 mr-2" />
                    {format(selectedDate, 'MMM dd, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        setIsEditing(false);
                      }
                    }}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                disabled={selectedDate >= new Date()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {!isToday(selectedDate) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(new Date())}
                >
                  Today
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Work Hours Summary */}
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Available Hours</p>
              <p className="text-2xl font-bold text-blue-600">{totalWorkHours.toFixed(1)}h</p>
              {attendanceRecord && (
                <p className="text-xs text-blue-600 dark:text-blue-300">
                  {attendanceRecord.checkIn && format(parseISO(attendanceRecord.checkIn), 'HH:mm')} - 
                  {attendanceRecord.checkOut ? format(parseISO(attendanceRecord.checkOut), 'HH:mm') : 'In Progress'}
                </p>
              )}
            </div>

            {/* Allocated Hours */}
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <Timer className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-800 dark:text-green-200">Allocated Hours</p>
              <p className="text-2xl font-bold text-green-600">{totalAllocatedHours.toFixed(1)}h</p>
              <p className="text-xs text-green-600 dark:text-green-300">
                {allocationPercentage.toFixed(1)}% allocated
              </p>
            </div>

            {/* Remaining Hours */}
            <div className={`text-center p-4 rounded-lg ${remainingHours < 0 ? 'bg-red-50 dark:bg-red-950' : 'bg-gray-50 dark:bg-gray-900'}`}>
              <Briefcase className={`h-8 w-8 mx-auto mb-2 ${remainingHours < 0 ? 'text-red-600' : 'text-gray-600'}`} />
              <p className={`text-sm font-medium ${remainingHours < 0 ? 'text-red-800 dark:text-red-200' : 'text-gray-800 dark:text-gray-200'}`}>
                Remaining Hours
              </p>
              <p className={`text-2xl font-bold ${remainingHours < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                {remainingHours.toFixed(1)}h
              </p>
              <p className={`text-xs ${remainingHours < 0 ? 'text-red-600 dark:text-red-300' : 'text-gray-600 dark:text-gray-300'}`}>
                {remainingHours < 0 ? 'Over-allocated!' : 'Available'}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Allocation Progress</span>
              <span>{allocationPercentage.toFixed(1)}%</span>
            </div>
            <Progress 
              value={Math.min(allocationPercentage, 100)} 
              className={`${allocationPercentage > 100 ? "bg-red-100" : ""}`}
            />
            {allocationPercentage > 100 && (
              <p className="text-red-600 text-xs">Warning: Total allocation exceeds available hours</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Available Projects Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Available Projects ({availableProjects.length})
          </CardTitle>
          <CardDescription>
            Projects you can work on for {format(selectedDate, 'MMM dd, yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableProjects.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Projects Available</h3>
              <p className="text-sm text-muted-foreground">
                No active projects assigned for the selected date
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableProjects.map((project) => (
                <div key={project.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-sm">{project.name}</h4>
                    {getPriorityIcon(project.priority)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getStatusColor(project.status)}>
                      {project.status.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline">
                      {project.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {project.description || 'No description available'}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    Total logged: {project.actualHours || 0}h
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Allocation Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Time Allocation</CardTitle>
              <CardDescription>
                Distribute your {totalWorkHours}h across projects for {format(selectedDate, 'MMM dd, yyyy')}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {!isEditing ? (
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  disabled={availableProjects.length === 0}
                >
                  <Timer className="h-4 w-4 mr-2" />
                  {timeAllocations.length > 0 ? 'Edit Allocation' : 'Start Tracking'}
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
                          isNew: false,
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
                    disabled={saveTimeAllocationsMutation.isPending || timeAllocations.length === 0}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveTimeAllocationsMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {timeAllocations.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Time Allocated</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {isEditing 
                  ? "Add projects to start tracking your time" 
                  : "Click 'Start Tracking' to begin allocating time to projects"
                }
              </p>
              {isEditing && availableProjects.length > 0 && (
                <Button onClick={addProjectAllocation}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Project
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {isEditing && (
                <div className="flex flex-wrap gap-2 p-4 bg-muted rounded-lg">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addProjectAllocation}
                    disabled={availableProjects.length === timeAllocations.length}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Project
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={autoDistributeHours}
                    disabled={timeAllocations.length === 0}
                  >
                    <Timer className="h-4 w-4 mr-1" />
                    Auto Distribute
                  </Button>
                </div>
              )}

              {timeAllocations.map((allocation, index) => (
                <Card key={index} className={`border-l-4 ${allocation.isNew ? 'border-l-blue-500' : 'border-l-green-500'}`}>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor={`project-${index}`}>Project</Label>
                          {isEditing ? (
                            <Select
                              value={allocation.projectId.toString()}
                              onValueChange={(value) => updateAllocation(index, 'projectId', parseInt(value))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {availableProjects.map((project) => (
                                  <SelectItem key={project.id} value={project.id.toString()}>
                                    {project.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="p-3 border rounded-md bg-muted">
                              {allocation.projectName}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor={`hours-${index}`}>Hours</Label>
                            {isEditing ? (
                              <Input
                                id={`hours-${index}`}
                                type="number"
                                step="0.5"
                                min="0"
                                max={totalWorkHours}
                                value={allocation.hours}
                                onChange={(e) => updateAllocation(index, 'hours', parseFloat(e.target.value) || 0)}
                              />
                            ) : (
                              <div className="p-3 border rounded-md bg-muted">
                                {allocation.hours}h
                              </div>
                            )}
                          </div>
                          <div>
                            <Label htmlFor={`billable-${index}`}>Billable Hours</Label>
                            {isEditing ? (
                              <Input
                                id={`billable-${index}`}
                                type="number"
                                step="0.5"
                                min="0"
                                max={allocation.hours}
                                value={allocation.billableHours}
                                onChange={(e) => updateAllocation(index, 'billableHours', parseFloat(e.target.value) || 0)}
                              />
                            ) : (
                              <div className="p-3 border rounded-md bg-muted">
                                {allocation.billableHours}h
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <Label htmlFor={`task-type-${index}`}>Task Type</Label>
                          {isEditing ? (
                            <Select
                              value={allocation.taskType}
                              onValueChange={(value) => updateAllocation(index, 'taskType', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {taskTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="p-3 border rounded-md bg-muted">
                              {taskTypes.find(t => t.value === allocation.taskType)?.label || allocation.taskType}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor={`description-${index}`}>Work Description</Label>
                          {isEditing ? (
                            <Textarea
                              id={`description-${index}`}
                              placeholder="Describe what you worked on..."
                              value={allocation.description}
                              onChange={(e) => updateAllocation(index, 'description', e.target.value)}
                              rows={4}
                            />
                          ) : (
                            <div className="p-3 border rounded-md bg-muted min-h-[100px]">
                              {allocation.description || 'No description provided'}
                            </div>
                          )}
                        </div>

                        {isEditing && (
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeAllocation(index)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}