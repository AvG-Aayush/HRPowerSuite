import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { CalendarIcon, X, Plus, MapPin } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const createProjectFormSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  status: z.enum(["planning", "active", "on_hold", "completed", "cancelled"]).default("planning"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  budget: z.number().min(0).optional(),
  clientName: z.string().optional(),
  projectManagerId: z.number().optional(),
  locationsInput: z.string().optional(),
});

const createProjectSchema = createProjectFormSchema.transform((data) => {
  // Transform comma-separated locations into array
  const locations = data.locationsInput 
    ? data.locationsInput.split(',').map(loc => loc.trim()).filter(loc => loc.length > 0)
    : [];
  
  const { locationsInput, ...rest } = data;
  return {
    ...rest,
    locations,
  };
});

type CreateProjectFormData = z.infer<typeof createProjectFormSchema>;
type CreateProjectData = z.infer<typeof createProjectSchema>;

interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
  department: string;
}

interface WorkLocation {
  id: number;
  name: string;
  address: string;
}

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<number[]>([]);

  const form = useForm<CreateProjectFormData>({
    resolver: zodResolver(createProjectFormSchema),
    defaultValues: {
      status: "planning",
      priority: "medium",
    },
  });

  // Fetch users for project manager and employee assignment
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: open,
  });

  // Fetch work locations
  const { data: workLocations = [] } = useQuery<WorkLocation[]>({
    queryKey: ['/api/work-locations'],
    enabled: open,
  });

  const createProjectMutation = useMutation({
    mutationFn: (data: CreateProjectFormData) => {
      console.log('Form data received:', data);
      try {
        // Transform form data using the schema
        const transformedData = createProjectSchema.parse(data);
        console.log('Transformed data:', transformedData);
        const projectData = {
          ...transformedData,
          createdBy: user?.id,
        };
        console.log('Final project data:', projectData);
        return apiRequest('POST', '/api/projects', projectData);
      } catch (error) {
        console.error('Schema validation error:', error);
        throw error;
      }
    },
    onSuccess: async (project: any) => {
      // Assign selected employees to the project
      if (selectedEmployees.length > 0) {
        await Promise.all(
          selectedEmployees.map(userId =>
            apiRequest('POST', `/api/projects/${project.id}/assignments`, {
              userId,
              role: 'team_member',
              assignedBy: user?.id,
            })
          )
        );
      }

      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Project Created",
        description: "The project has been created successfully.",
      });
      onOpenChange(false);
      form.reset();
      setSelectedEmployees([]);
      setSelectedLocations([]);
    },
    onError: (error: any) => {
      console.error('Project creation error:', error);
      const errorMessage = error?.response?.data?.details || error?.message || "Failed to create project. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateProjectFormData) => {
    createProjectMutation.mutate(data);
  };

  const toggleEmployee = (userId: number) => {
    setSelectedEmployees(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleLocation = (locationId: number) => {
    setSelectedLocations(prev =>
      prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  const getSelectedEmployeeNames = () => {
    return users
      .filter((user) => selectedEmployees.includes(user.id))
      .map((user) => user.fullName);
  };

  const getSelectedLocationNames = () => {
    return workLocations
      .filter((location) => selectedLocations.includes(location.id))
      .map((location) => location.name);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Create a new project and assign team members and locations.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter project name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter client name" {...field} />
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
                      placeholder="Describe the project objectives and scope"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
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
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="locationsInput"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Locations</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter locations separated by commas (e.g., New York, London, Tokyo)"
                      value={field.value || ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  </FormControl>
                  <p className="text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 inline mr-1" />
                    Separate multiple locations with commas
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
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
                name="projectManagerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Manager</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select manager" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users
                          .filter((user: User) => ['admin', 'hr', 'manager'].includes(user.role))
                          .map((user: User) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.fullName} ({user.role})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Team Assignment */}
            <div className="space-y-3">
              <FormLabel>Assign Team Members</FormLabel>
              <div className="border rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {users.map((user: User) => (
                    <div
                      key={user.id}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-md border cursor-pointer transition-colors",
                        selectedEmployees.includes(user.id)
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted"
                      )}
                      onClick={() => toggleEmployee(user.id)}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{user.fullName}</p>
                        <p className="text-xs text-muted-foreground">{user.role} • {user.department}</p>
                      </div>
                      {selectedEmployees.includes(user.id) && (
                        <Badge variant="secondary" className="ml-2">
                          Selected
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
                
                {selectedEmployees.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    {getSelectedEmployeeNames().map((name, index) => (
                      <Badge key={index} variant="outline">
                        {name}
                        <X
                          className="h-3 w-3 ml-1 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleEmployee(selectedEmployees[index]);
                          }}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Location Assignment */}
            <div className="space-y-3">
              <FormLabel>Assign Work Locations</FormLabel>
              <div className="border rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {workLocations.map((location: WorkLocation) => (
                    <div
                      key={location.id}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-md border cursor-pointer transition-colors",
                        selectedLocations.includes(location.id)
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-muted"
                      )}
                      onClick={() => toggleLocation(location.id)}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{location.name}</p>
                          <p className="text-xs text-muted-foreground">{location.address}</p>
                        </div>
                      </div>
                      {selectedLocations.includes(location.id) && (
                        <Badge variant="secondary" className="ml-2">
                          Selected
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
                
                {selectedLocations.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    {getSelectedLocationNames().map((name, index) => (
                      <Badge key={index} variant="outline">
                        <MapPin className="h-3 w-3 mr-1" />
                        {name}
                        <X
                          className="h-3 w-3 ml-1 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLocation(selectedLocations[index]);
                          }}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createProjectMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createProjectMutation.isPending}
              >
                {createProjectMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}