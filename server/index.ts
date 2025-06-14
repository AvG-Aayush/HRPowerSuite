import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { cleanupService } from "./cleanup-service";
import { messagingCleanupService } from "./messaging-cleanup-service";
import { sessionCleanupService } from "./session-cleanup-service";
import { setupDatabase, validateAuthenticationSystem } from "./database-setup";
import { createAppConfig } from "./config";
import { pool } from "./db";
import { attendanceScheduler } from "./attendance-scheduler";
import path from "path";
import { fileURLToPath } from "url";
import http from "http"; // ✅ Added for creating server

// Set environment variable to allow all hosts for Replit compatibility
process.env.VITE_ALLOWED_HOSTS = "all";

// Compute __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const config = createAppConfig();

// Performance middleware
app.use(compression()); // Enable gzip compression
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

// Session configuration with PostgreSQL store
const PgSession = connectPgSimple(session);
app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: config.auth.sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: config.auth.tokenExpiry * 1000,
      sameSite: "lax",
    },
  })
);

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    if (!res.headersSent) {
      capturedJsonResponse = body;
      return originalJson(body);
    }
    return res;
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse)
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`.slice(0, 200);
      log(logLine);
    }
  });

  next();
});

// Server initialization
const initializeServer = async () => {
  try {
    log("Initializing authentication system...");
    const setupResult = await setupDatabase();
    log(setupResult.success ? setupResult.message : `Database setup warning: ${setupResult.message}`);
    if (setupResult.adminUser) log(`Admin user available: ${setupResult.adminUser.username}`);

    const validationResult = await validateAuthenticationSystem();
    log(validationResult.success ? "Authentication system validated" : `Authentication validation failed: ${validationResult.message}`);
  } catch (error) {
    log(`Authentication initialization failed: ${String(error)}`);
    throw error;
  }
};

// Start services and server
const startServer = async () => {
  await initializeServer();

  registerRoutes(app);

  cleanupService.start();
  log("Cleanup service started - runs every hour");

  messagingCleanupService.start();
  log("Messaging cleanup service started - handles message delivery and cleanup");

  sessionCleanupService.start();
  log("Session cleanup service started - removes expired sessions every hour");

  attendanceScheduler.start();
  log("Attendance scheduler started - handles midnight check-outs");

  // Error handling
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    if (!res.headersSent) res.status(status).json({ error: message });
    log(`Server error [${status}]: ${message}`, "error");
  });

  // Create HTTP server
  const server = http.createServer(app);

  // Vite setup or static serving
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Graceful shutdown
  const shutdown = () => {
    log("Received shutdown signal, closing gracefully");
    cleanupService.stop();
    messagingCleanupService.stop();
    attendanceScheduler.stop();
    server.close(() => {
      log("Server closed");
      process.exit(0);
    });
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  const port = Number(process.env.PORT) || 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`Server running on port ${port}`);
  });
};

// Execute
startServer().catch((error) => {
  log(`Server startup failed: ${String(error)}`, "error");
  process.exit(1);
});
