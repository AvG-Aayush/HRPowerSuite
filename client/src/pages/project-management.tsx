import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  FolderOpen, 
  Calendar, 
  Users, 
  MapPin, 
  Clock, 
  DollarSign,
  BarChart3,
  Settings
} from "lucide-react";
import { format } from "date-fns";
import CreateProjectDialog from "@/components/projects/create-project-dialog";
import ProjectDetailsDialog from "@/components/projects/project-details-dialog";
import ProjectTimeTracker from "@/components/projects/project-time-tracker";

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
  projectName: string;
  projectStatus: string;
  projectPriority: string;
}

export default function ProjectManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState("projects");

  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr';

  // Fetch projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['/api/projects'],
    enabled: !!user,
  });

  // Fetch user's project assignments
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['/api/user/project-assignments'],
    enabled: !!user,
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

  const ProjectCard = ({ project }: { project: Project }) => (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => setSelectedProject(project)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">{project.name}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {project.description}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-1 ml-4">
            <Badge className={getStatusBadge(project.status)}>
              {project.status.replace('_', ' ')}
            </Badge>
            <Badge className={getPriorityBadge(project.priority)}>
              {project.priority}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {project.clientName && (
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{project.clientName}</span>
              </div>
            )}
            {project.startDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(project.startDate), 'MMM dd, yyyy')}</span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{project.actualHours || 0}h / {project.estimatedHours || 0}h</span>
            </div>
            {project.budget && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>${project.spentBudget || 0} / ${project.budget}</span>
              </div>
            )}
          </div>

          {project.estimatedHours > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, ((project.actualHours || 0) / project.estimatedHours) * 100)}%`
                }}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const AssignmentCard = ({ assignment }: { assignment: ProjectAssignment }) => (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">{assignment.projectName}</CardTitle>
            <CardDescription className="mt-1">
              Role: {assignment.role.replace('_', ' ')}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-1 ml-4">
            <Badge className={getStatusBadge(assignment.projectStatus)}>
              {assignment.projectStatus.replace('_', ' ')}
            </Badge>
            <Badge className={getPriorityBadge(assignment.projectPriority)}>
              {assignment.projectPriority}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{assignment.actualHours || 0}h / {assignment.assignedHours || 0}h</span>
            </div>
            {assignment.hourlyRate && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>${assignment.hourlyRate}/hr</span>
              </div>
            )}
          </div>

          {assignment.assignedHours > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, ((assignment.actualHours || 0) / assignment.assignedHours) * 100)}%`
                }}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (projectsLoading || assignmentsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading projects...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Project Management</h1>
          <p className="text-muted-foreground mt-1">
            {isAdminOrHR 
              ? "Manage projects, assign team members, and track progress" 
              : "View your assigned projects and track time"
            }
          </p>
        </div>
        {isAdminOrHR && (
          <Button onClick={() => setShowCreateProject(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            {isAdminOrHR ? "All Projects" : "My Projects"}
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            My Assignments
          </TabsTrigger>
          <TabsTrigger value="timetracker" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time Tracker
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
          {projects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Projects Found</h3>
                <p className="text-muted-foreground text-center mb-6">
                  {isAdminOrHR 
                    ? "Get started by creating your first project"
                    : "You haven't been assigned to any projects yet"
                  }
                </p>
                {isAdminOrHR && (
                  <Button onClick={() => setShowCreateProject(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project: Project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          {assignments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Assignments Found</h3>
                <p className="text-muted-foreground text-center">
                  You haven't been assigned to any projects yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {assignments.map((assignment: ProjectAssignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="timetracker" className="space-y-4">
          <ProjectTimeTracker />
        </TabsContent>
      </Tabs>

      {showCreateProject && (
        <CreateProjectDialog
          open={showCreateProject}
          onOpenChange={setShowCreateProject}
        />
      )}

      {selectedProject && (
        <ProjectDetailsDialog
          project={selectedProject}
          open={!!selectedProject}
          onOpenChange={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
}