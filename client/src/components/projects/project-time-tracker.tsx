import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  CalendarIcon,
  Clock,
  Plus,
  Edit,
  Trash2,
  Save,
  X
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const timeEntrySchema = z.object({
  projectId: z.number().min(1, "Please select a project"),
  date: z.date(),
  hoursSpent: z.number().min(0.1, "Hours must be at least 0.1").max(24, "Hours cannot exceed 24"),
  description: z.string().optional(),
  taskType: z.enum(["development", "design", "testing", "meeting", "planning", "documentation"]).default("development"),
  billableHours: z.number().min(0).max(24).optional(),
});

type TimeEntryData = z.infer<typeof timeEntrySchema>;

interface ProjectAssignment {
  id: number;
  projectId: number;
  userId: number;
  role: string;
  assignedHours: number;
  actualHours: number;
  hourlyRate: number;
  isActive: boolean;
  assignedBy: number;
  assignedAt: string;
  removedAt: string;
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
  approvedBy: number;
  approvedAt: string;
  rejectionReason: string;
  createdAt: string;
  updatedAt: string;
  projectName: string;
  projectStatus: string;
}

export default function ProjectTimeTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editingEntry, setEditingEntry] = useState<ProjectTimeEntry | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const form = useForm<TimeEntryData>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      date: new Date(),
      taskType: "development",
    },
  });

  // Fetch user's project assignments
  const { data: assignments = [], isLoading: assignmentsLoading, error: assignmentsError } = useQuery({
    queryKey: ['/api/user/project-assignments'],
    enabled: !!user,
  });

  // Fetch daily time entries
  const { data: dailyTimeEntries = [], isLoading: timeEntriesLoading, error: timeEntriesError } = useQuery({
    queryKey: ['/api/user/daily-project-time', format(selectedDate, 'yyyy-MM-dd')],
    enabled: !!user,
  });

  // Fetch attendance for the day to get total working hours
  const { data: attendance, isLoading: attendanceLoading, error: attendanceError } = useQuery({
    queryKey: ['/api/attendance/today'],
    enabled: !!user,
  });

  const createTimeEntryMutation = useMutation({
    mutationFn: (data: TimeEntryData) => apiRequest('/api/project-time-entries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/user/daily-project-time', format(selectedDate, 'yyyy-MM-dd')] 
      });
      toast({
        title: "Time Entry Added",
        description: "Your project time has been logged successfully.",
      });
      form.reset({
        date: selectedDate,
        taskType: "development",
      });
      setShowAddForm(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add time entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateTimeEntryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProjectTimeEntry> }) => 
      apiRequest(`/api/project-time-entries/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/user/daily-project-time', format(selectedDate, 'yyyy-MM-dd')] 
      });
      toast({
        title: "Time Entry Updated",
        description: "Your project time has been updated successfully.",
      });
      setEditingEntry(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update time entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteTimeEntryMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/project-time-entries/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/user/daily-project-time', format(selectedDate, 'yyyy-MM-dd')] 
      });
      toast({
        title: "Time Entry Deleted",
        description: "The time entry has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete time entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TimeEntryData) => {
    createTimeEntryMutation.mutate(data);
  };

  const getTotalLoggedHours = () => {
    return dailyTimeEntries.reduce((total: number, entry: ProjectTimeEntry) => 
      total + entry.hoursSpent, 0
    );
  };

  const getTotalWorkingHours = () => {
    if (!attendance || !Array.isArray(attendance)) return 0;
    const todayAttendance = attendance.find((att: any) => {
      const attDate = new Date(att.date);
      return attDate.toDateString() === selectedDate.toDateString();
    });
    return todayAttendance?.workingHours || 0;
  };

  const getRemainingHours = () => {
    const totalWorking = getTotalWorkingHours();
    const totalLogged = getTotalLoggedHours();
    return Math.max(0, totalWorking - totalLogged);
  };

  const getTaskTypeBadge = (taskType: string) => {
    const taskTypeColors = {
      development: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      design: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      testing: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      meeting: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      planning: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      documentation: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    };
    return taskTypeColors[taskType as keyof typeof taskTypeColors] || "bg-gray-100 text-gray-800";
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };
    return statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800";
  };

  useEffect(() => {
    form.setValue('date', selectedDate);
  }, [selectedDate, form]);

  const totalWorkingHours = getTotalWorkingHours();
  const totalLoggedHours = getTotalLoggedHours();
  const remainingHours = getRemainingHours();

  return (
    <div className="space-y-6">
      {/* Date Picker and Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full pl-3 text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  {selectedDate ? (
                    format(selectedDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Working Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold">{totalWorkingHours.toFixed(1)}h</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Logged Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-lg font-semibold text-blue-600">{totalLoggedHours.toFixed(1)}h</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Remaining Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-lg font-semibold text-orange-600">{remainingHours.toFixed(1)}h</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      {totalWorkingHours > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Project Time Allocation</span>
                <span>{totalLoggedHours.toFixed(1)}h / {totalWorkingHours.toFixed(1)}h</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (totalLoggedHours / totalWorkingHours) * 100)}%`
                  }}
                />
              </div>
              {totalLoggedHours > totalWorkingHours && (
                <p className="text-sm text-red-600">
                  Warning: Logged hours exceed total working hours
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Time Entry Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Add Time Entry</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project *</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {assignments.map((assignment: ProjectAssignment) => (
                              <SelectItem key={assignment.projectId} value={assignment.projectId.toString()}>
                                {assignment.projectName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="taskType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select task type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="development">Development</SelectItem>
                            <SelectItem value="design">Design</SelectItem>
                            <SelectItem value="testing">Testing</SelectItem>
                            <SelectItem value="meeting">Meeting</SelectItem>
                            <SelectItem value="planning">Planning</SelectItem>
                            <SelectItem value="documentation">Documentation</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="hoursSpent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hours Spent *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0.1"
                            max="24"
                            step="0.1"
                            placeholder="0.0"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="billableHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billable Hours</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="24"
                            step="0.1"
                            placeholder="0.0"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what you worked on..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createTimeEntryMutation.isPending}
                  >
                    {createTimeEntryMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Add Entry
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Time Entries List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Time Entries for {format(selectedDate, 'MMMM dd, yyyy')}
          </h3>
          {!showAddForm && assignments.length > 0 && (
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Time Entry
            </Button>
          )}
        </div>

        {timeEntriesLoading ? (
          <Card>
            <CardContent className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </CardContent>
          </Card>
        ) : dailyTimeEntries.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Time Entries</h3>
              <p className="text-muted-foreground text-center mb-4">
                You haven't logged any project time for this date yet.
              </p>
              {assignments.length > 0 && !showAddForm && (
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Entry
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {dailyTimeEntries.map((entry: ProjectTimeEntry) => (
              <Card key={entry.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{entry.projectName}</h4>
                        <Badge className={getTaskTypeBadge(entry.taskType)}>
                          {entry.taskType}
                        </Badge>
                        <Badge className={getStatusBadge(entry.status)}>
                          {entry.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <span>{entry.hoursSpent}h logged</span>
                        {entry.billableHours && <span>{entry.billableHours}h billable</span>}
                        <span>Created: {format(new Date(entry.createdAt), 'HH:mm')}</span>
                      </div>
                      {entry.description && (
                        <p className="text-sm mb-2">{entry.description}</p>
                      )}
                      {entry.rejectionReason && (
                        <p className="text-sm text-red-600">
                          Rejection reason: {entry.rejectionReason}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingEntry(entry)}
                        disabled={entry.status === 'approved'}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteTimeEntryMutation.mutate(entry.id)}
                        disabled={deleteTimeEntryMutation.isPending || entry.status === 'approved'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {assignments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Project Assignments</h3>
            <p className="text-muted-foreground text-center">
              You haven't been assigned to any projects yet. Contact your manager to get assigned to projects.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}