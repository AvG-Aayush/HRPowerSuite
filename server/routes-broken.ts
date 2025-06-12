import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  insertUserSchema, insertAttendanceSchema, insertLeaveRequestSchema, 
  insertShiftSchema, insertMessageSchema, insertChatGroupSchema,
  insertGroupMembershipSchema, insertAnnouncementSchema, insertAssignmentSchema,
  insertHiringRequestSchema, insertTimeoffSchema, insertExpenseSchema,
  User
} from "@shared/schema";
import { 
  generateAttendanceSummary, generateLeaveAnalysis, 
  generatePerformanceInsights, generateCustomInsight 
} from "./ai";
import { authMiddleware, requireAuth, requireRole, authenticateUser, createUser } from "./auth";

interface AuthenticatedRequest extends Request {
  user?: User;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Apply auth middleware to all routes
  app.use(authMiddleware);

  // Authentication routes
  app.post('/api/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      const user = await authenticateUser(username, password);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const token = Buffer.from(`${username}:${password}`).toString('base64');
      res.json({ user, token });
    } catch (error) {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.post('/api/register', async (req: Request, res: Response) => {
    try {
      const { username, email, password, fullName, role } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      
      const user = await createUser(username, email, password, role || 'employee', fullName);
      const token = Buffer.from(`${username}:${password}`).toString('base64');
      res.status(201).json({ user, token });
    } catch (error) {
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  app.get('/api/user', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json(req.user);
  });

  // Announcements
  app.get('/api/announcements', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const announcements = await storage.getAnnouncements();
      res.json(announcements);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch announcements' });
    }
  });

  app.post('/api/announcements', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = insertAnnouncementSchema.parse({
        ...req.body,
        createdBy: req.user!.id
      });
      const announcement = await storage.createAnnouncement(data);
      res.status(201).json(announcement);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create announcement' });
    }
  });

  // Assignments
  app.get('/api/assignments', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.query;
      const assignments = userId 
        ? await storage.getAssignmentsByUser(parseInt(userId as string))
        : await storage.getAssignments();
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch assignments' });
    }
  });

  app.post('/api/assignments', requireAuth, requireRole(['admin', 'manager']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = insertAssignmentSchema.parse({
        ...req.body,
        assignedBy: req.user!.id
      });
      const assignment = await storage.createAssignment(data);
      res.status(201).json(assignment);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create assignment' });
    }
  });

  app.patch('/api/assignments/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const assignment = await storage.updateAssignment(id, req.body);
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update assignment' });
    }
  });

  // Hiring requests
  app.get('/api/hiring-requests', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const requests = await storage.getHiringRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch hiring requests' });
    }
  });

  app.post('/api/hiring-requests', requireAuth, requireRole(['admin', 'hr', 'manager']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = insertHiringRequestSchema.parse({
        ...req.body,
        requestedBy: req.user!.id
      });
      const request = await storage.createHiringRequest(data);
      res.status(201).json(request);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create hiring request' });
    }
  });

  // Time off requests
  app.get('/api/timeoffs', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.query;
      const timeoffs = userId 
        ? await storage.getTimeoffsByUser(parseInt(userId as string))
        : await storage.getTimeoffs();
      res.json(timeoffs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch time offs' });
    }
  });

  app.post('/api/timeoffs', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = insertTimeoffSchema.parse({
        ...req.body,
        userId: req.user!.id
      });
      const timeoff = await storage.createTimeoff(data);
      res.status(201).json(timeoff);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create time off request' });
    }
  });

  app.patch('/api/timeoffs/:id', requireAuth, requireRole(['admin', 'hr']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const timeoff = await storage.updateTimeoff(id, {
        ...req.body,
        approvedBy: req.user!.id,
        processedAt: new Date()
      });
      res.json(timeoff);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update time off request' });
    }
  });

  // Expense reports
  app.get('/api/expenses', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.query;
      const expenses = userId 
        ? await storage.getExpensesByUser(parseInt(userId as string))
        : await storage.getExpenses();
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch expenses' });
    }
  });

  app.post('/api/expenses', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = insertExpenseSchema.parse({
        ...req.body,
        userId: req.user!.id
      });
      const expense = await storage.createExpense(data);
      res.status(201).json(expense);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create expense report' });
    }
  });

  app.patch('/api/expenses/:id', requireAuth, requireRole(['admin', 'hr', 'manager']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const expense = await storage.updateExpense(id, {
        ...req.body,
        approvedBy: req.user!.id,
        processedAt: new Date()
      });
      res.json(expense);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update expense report' });
    }
  });
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });

  const clients = new Map();

  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId');
    
    if (userId) {
      clients.set(userId, ws);
      console.log(`WebSocket client connected: ${userId}`);
    }

    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
        console.log(`WebSocket client disconnected: ${userId}`);
      }
    });

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        // Handle real-time message broadcasting
        if (message.type === 'chat_message') {
          // Broadcast to recipient or group members
          const targetUsers = message.groupId 
            ? await storage.getGroupMembers(message.groupId)
            : [{ id: message.recipientId }];
          
          targetUsers.forEach((user: any) => {
            const targetWs = clients.get(user.id.toString());
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(JSON.stringify(message));
            }
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
  });

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const sessionId = Math.random().toString(36).substring(7);
      sessions.set(sessionId, user);

      res.json({ 
        user: { ...user, password: undefined }, 
        sessionId 
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", authenticate, (req, res) => {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.json({ message: "Logged out successfully" });
  });

  // User management (Admin only)
  app.post("/api/users", authenticate, requireRole(['admin']), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(400).json({ message: "Failed to create user" });
    }
  });

  app.get("/api/users", authenticate, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users.map(user => ({ ...user, password: undefined })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Users can only view their own profile unless admin/hr
      if (req.user.id !== id && !['admin', 'hr'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.put("/api/users/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;

      // Users can only update their own profile unless admin
      if (req.user.id !== id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 10);
      }

      const user = await storage.updateUser(id, updates);
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(400).json({ message: "Failed to update user" });
    }
  });

  // Attendance routes
  app.post("/api/attendance", authenticate, async (req, res) => {
    try {
      const attendanceData = insertAttendanceSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      
      const attendance = await storage.createAttendance(attendanceData);
      
      // Broadcast real-time update
      const updateMessage = {
        type: 'attendance_update',
        data: attendance
      };
      
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(updateMessage));
        }
      });

      res.json(attendance);
    } catch (error) {
      res.status(400).json({ message: "Failed to record attendance" });
    }
  });

  app.get("/api/attendance/today", authenticate, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const attendance = await storage.getTodayAttendance();
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch today's attendance" });
    }
  });

  app.get("/api/attendance/user/:userId", authenticate, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Users can only view their own attendance unless admin/hr
      if (req.user.id !== userId && !['admin', 'hr'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const attendance = await storage.getAttendanceByUser(userId);
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch attendance" });
    }
  });

  app.put("/api/attendance/:id", authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const attendance = await storage.updateAttendance(id, updates);
      res.json(attendance);
    } catch (error) {
      res.status(400).json({ message: "Failed to update attendance" });
    }
  });

  // Leave request routes
  app.post("/api/leave-requests", authenticate, async (req, res) => {
    try {
      const leaveData = insertLeaveRequestSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      
      const leaveRequest = await storage.createLeaveRequest(leaveData);
      res.json(leaveRequest);
    } catch (error) {
      res.status(400).json({ message: "Failed to create leave request" });
    }
  });

  app.get("/api/leave-requests/pending", authenticate, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const requests = await storage.getPendingLeaveRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending leave requests" });
    }
  });

  app.get("/api/leave-requests/user/:userId", authenticate, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Users can only view their own requests unless admin/hr
      if (req.user.id !== userId && !['admin', 'hr'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const requests = await storage.getLeaveRequestsByUser(userId);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leave requests" });
    }
  });

  app.put("/api/leave-requests/:id", authenticate, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = {
        ...req.body,
        approvedBy: req.user.id,
      };
      
      const request = await storage.updateLeaveRequest(id, updates);
      res.json(request);
    } catch (error) {
      res.status(400).json({ message: "Failed to update leave request" });
    }
  });

  // Shift routes
  app.post("/api/shifts", authenticate, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const shiftData = insertShiftSchema.parse({
        ...req.body,
        createdBy: req.user.id,
      });
      
      const shift = await storage.createShift(shiftData);
      res.json(shift);
    } catch (error) {
      res.status(400).json({ message: "Failed to create shift" });
    }
  });

  app.get("/api/shifts/user/:userId", authenticate, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Users can only view their own shifts unless admin/hr
      if (req.user.id !== userId && !['admin', 'hr'].includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const shifts = await storage.getShiftsByUser(userId);
      res.json(shifts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shifts" });
    }
  });

  app.put("/api/shifts/:id", authenticate, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const shift = await storage.updateShift(id, updates);
      res.json(shift);
    } catch (error) {
      res.status(400).json({ message: "Failed to update shift" });
    }
  });

  app.delete("/api/shifts/:id", authenticate, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteShift(id);
      res.json({ message: "Shift deleted successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to delete shift" });
    }
  });

  // Chat routes
  app.post("/api/messages", authenticate, async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: req.user.id,
      });
      
      const message = await storage.createMessage(messageData);
      res.json(message);
    } catch (error) {
      res.status(400).json({ message: "Failed to send message" });
    }
  });

  app.get("/api/messages/user/:userId", authenticate, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const messages = await storage.getMessagesBetweenUsers(req.user.id, userId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.get("/api/messages/group/:groupId", authenticate, async (req, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const messages = await storage.getGroupMessages(groupId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch group messages" });
    }
  });

  app.put("/api/messages/mark-read", authenticate, async (req, res) => {
    try {
      const { senderId, groupId } = req.body;
      await storage.markMessagesAsRead(req.user.id, senderId, groupId);
      res.json({ message: "Messages marked as read" });
    } catch (error) {
      res.status(400).json({ message: "Failed to mark messages as read" });
    }
  });

  app.get("/api/messages/unread-count", authenticate, async (req, res) => {
    try {
      const count = await storage.getUnreadMessageCount(req.user.id);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to get unread count" });
    }
  });

  // Chat group routes
  app.post("/api/chat-groups", authenticate, async (req, res) => {
    try {
      const groupData = insertChatGroupSchema.parse({
        ...req.body,
        createdBy: req.user.id,
      });
      
      const group = await storage.createChatGroup(groupData);
      
      // Add creator to group
      await storage.addUserToGroup({
        groupId: group.id,
        userId: req.user.id,
        role: 'admin',
      });

      res.json(group);
    } catch (error) {
      res.status(400).json({ message: "Failed to create chat group" });
    }
  });

  app.post("/api/chat-groups/:groupId/members", authenticate, async (req, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const { userId, role = 'member' } = req.body;
      
      const membership = await storage.addUserToGroup({
        groupId,
        userId,
        role,
      });

      res.json(membership);
    } catch (error) {
      res.status(400).json({ message: "Failed to add user to group" });
    }
  });

  app.get("/api/chat-groups/user/:userId", authenticate, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Users can only view their own groups unless admin
      if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const groups = await storage.getUserGroups(userId);
      res.json(groups);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user groups" });
    }
  });

  // AI Insights routes
  app.post("/api/ai/attendance-summary", authenticate, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const attendanceData = await storage.getTodayAttendance();
      const summary = await generateAttendanceSummary(attendanceData);
      
      // Save insight to database
      await storage.createAiInsight({
        type: 'attendance_summary',
        title: 'Daily Attendance Summary',
        content: summary,
        period: 'daily',
        generatedBy: req.user.id,
      });

      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate attendance summary" });
    }
  });

  app.post("/api/ai/leave-analysis", authenticate, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const leaveData = await storage.getPendingLeaveRequests();
      const analysis = await generateLeaveAnalysis(leaveData);
      
      await storage.createAiInsight({
        type: 'leave_analysis',
        title: 'Leave Request Analysis',
        content: analysis,
        period: 'monthly',
        generatedBy: req.user.id,
      });

      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate leave analysis" });
    }
  });

  app.post("/api/ai/performance-insights", authenticate, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const employees = await storage.getUsers();
      const attendance = await storage.getTodayAttendance();
      const insights = await generatePerformanceInsights(employees, attendance);
      
      await storage.createAiInsight({
        type: 'performance_insights',
        title: 'Performance Insights Report',
        content: insights,
        period: 'weekly',
        generatedBy: req.user.id,
      });

      res.json(insights);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate performance insights" });
    }
  });

  app.get("/api/ai/insights", authenticate, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const insights = await storage.getAiInsights();
      res.json(insights);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch AI insights" });
    }
  });

  app.get("/api/ai/insights/:type", authenticate, requireRole(['admin', 'hr']), async (req, res) => {
    try {
      const type = req.params.type;
      const insights = await storage.getAiInsightsByType(type);
      res.json(insights);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch AI insights by type" });
    }
  });

  // Dashboard metrics
  app.get("/api/dashboard/metrics", authenticate, async (req, res) => {
    try {
      const users = await storage.getUsers();
      const todayAttendance = await storage.getTodayAttendance();
      const pendingLeaves = await storage.getPendingLeaveRequests();
      
      const metrics = {
        totalEmployees: users.length,
        presentToday: todayAttendance.filter(a => a.status === 'present').length,
        attendanceRate: todayAttendance.length > 0 ? 
          (todayAttendance.filter(a => a.status === 'present').length / todayAttendance.length) * 100 : 0,
        pendingLeaves: pendingLeaves.length,
        newHires: users.filter(u => {
          const createdDate = new Date(u.createdAt);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - createdDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays <= 30;
        }).length,
      };

      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  return httpServer;
}
