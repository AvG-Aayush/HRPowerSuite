import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Calendar,
  Users,
  MapPin,
  Clock,
  DollarSign,
  User,
  Settings,
  Edit,
  Trash2
} from "lucide-react";
import { format } from "date-fns";

interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  priority: string;
  startDate: string;
  endDate: string;
  estimatedHours: number;
  actualHours: number;
  budget: number;
  spentBudget: number;
  clientName: string;
  projectManagerId: number;
  createdBy: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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
  userName: string;
  userEmail: string;
  userRole: string;
  department: string;
}

interface ProjectLocation {
  id: number;
  projectId: number;
  workLocationId: number;
  isActive: boolean;
  createdAt: string;
  locationName: string;
  locationAddress: string;
  latitude: number;
  longitude: number;
  radius: number;
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
  userName: string;
  userEmail: string;
}

interface ProjectDetailsDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProjectDetailsDialog({ project, open, onOpenChange }: ProjectDetailsDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr';

  // Fetch project assignments
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['/api/projects', project.id, 'assignments'],
    enabled: open && !!project.id,
  });

  // Fetch project locations
  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['/api/projects', project.id, 'locations'],
    enabled: open && !!project.id,
  });

  // Fetch project time entries
  const { data: timeEntries = [], isLoading: timeEntriesLoading } = useQuery({
    queryKey: ['/api/projects', project.id, 'time-entries'],
    enabled: open && !!project.id,
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: (userId: number) => 
      apiRequest(`/api/projects/${project.id}/assignments/${userId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id, 'assignments'] });
      toast({
        title: "Assignment Removed",
        description: "User has been removed from the project.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove assignment.",
        variant: "destructive",
      });
    },
  });

  const removeLocationMutation = useMutation({
    mutationFn: (locationId: number) => 
      apiRequest(`/api/projects/${project.id}/locations/${locationId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id, 'locations'] });
      toast({
        title: "Location Removed",
        description: "Location has been removed from the project.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove location.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusColors = {
      planning: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      on_hold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      completed: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };
    return statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800";
  };

  const getPriorityBadge = (priority: string) => {
    const priorityColors = {
      low: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
      medium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };
    return priorityColors[priority as keyof typeof priorityColors] || "bg-gray-100 text-gray-800";
  };

  const getTaskTypeBadge = (taskType: string) => {
    const taskTypeColors = {
      development: "bg-blue-100 text-blue-800",
      design: "bg-purple-100 text-purple-800",
      testing: "bg-green-100 text-green-800",
      meeting: "bg-yellow-100 text-yellow-800",
      planning: "bg-orange-100 text-orange-800",
      documentation: "bg-gray-100 text-gray-800",
    };
    return taskTypeColors[taskType as keyof typeof taskTypeColors] || "bg-gray-100 text-gray-800";
  };

  const progressPercentage = project.estimatedHours > 0 
    ? Math.min(100, ((project.actualHours || 0) / project.estimatedHours) * 100)
    : 0;

  const budgetPercentage = project.budget > 0 
    ? Math.min(100, ((project.spentBudget || 0) / project.budget) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold">{project.name}</DialogTitle>
              <DialogDescription className="mt-2">
                {project.description}
              </DialogDescription>
            </div>
            <div className="flex flex-col gap-2 ml-4">
              <Badge className={getStatusBadge(project.status)}>
                {project.status.replace('_', ' ')}
              </Badge>
              <Badge className={getPriorityBadge(project.priority)}>
                {project.priority}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{project.actualHours || 0}h / {project.estimatedHours || 0}h</span>
              </div>
              {project.estimatedHours > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {project.budget > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Budget</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">${project.spentBudget || 0} / ${project.budget}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${budgetPercentage}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {project.startDate && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Start Date</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{format(new Date(project.startDate), 'MMM dd, yyyy')}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {project.endDate && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">End Date</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{format(new Date(project.endDate), 'MMM dd, yyyy')}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Tabs defaultValue="assignments" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="assignments">Team Members</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="timeEntries">Time Entries</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="space-y-4">
            {assignmentsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : assignments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Team Members</h3>
                  <p className="text-muted-foreground text-center">
                    No team members have been assigned to this project yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {assignments.map((assignment: ProjectAssignment) => (
                  <Card key={assignment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold">{assignment.userName}</h4>
                            <p className="text-sm text-muted-foreground">{assignment.userEmail}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{assignment.role.replace('_', ' ')}</Badge>
                              <Badge variant="outline">{assignment.userRole}</Badge>
                              {assignment.department && (
                                <Badge variant="outline">{assignment.department}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{assignment.actualHours || 0}h / {assignment.assignedHours || 0}h</span>
                            </div>
                            {assignment.hourlyRate && (
                              <div className="flex items-center gap-2 text-sm mt-1">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <span>${assignment.hourlyRate}/hr</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {isAdminOrHR && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeAssignmentMutation.mutate(assignment.userId)}
                            disabled={removeAssignmentMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="locations" className="space-y-4">
            {locationsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : locations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MapPin className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Locations</h3>
                  <p className="text-muted-foreground text-center">
                    No work locations have been assigned to this project yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {locations.map((location: ProjectLocation) => (
                  <Card key={location.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <h4 className="font-semibold">{location.locationName}</h4>
                            <p className="text-sm text-muted-foreground">{location.locationAddress}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Radius: {location.radius}m
                            </p>
                          </div>
                        </div>
                        {isAdminOrHR && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeLocationMutation.mutate(location.workLocationId)}
                            disabled={removeLocationMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="timeEntries" className="space-y-4">
            {timeEntriesLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : timeEntries.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Time Entries</h3>
                  <p className="text-muted-foreground text-center">
                    No time has been logged for this project yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {timeEntries.map((entry: ProjectTimeEntry) => (
                  <Card key={entry.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{entry.userName}</h4>
                            <Badge className={getTaskTypeBadge(entry.taskType)}>
                              {entry.taskType}
                            </Badge>
                            <Badge variant={entry.status === 'approved' ? 'default' : entry.status === 'pending' ? 'secondary' : 'destructive'}>
                              {entry.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {format(new Date(entry.date), 'MMM dd, yyyy')} • {entry.hoursSpent}h logged
                            {entry.billableHours && ` • ${entry.billableHours}h billable`}
                          </p>
                          {entry.description && (
                            <p className="text-sm">{entry.description}</p>
                          )}
                          {entry.rejectionReason && (
                            <p className="text-sm text-red-600 mt-2">
                              Rejection reason: {entry.rejectionReason}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}