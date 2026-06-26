import "dotenv/config";
import express, { Response, NextFunction } from 'express';
import type { Request } from 'express';
import cors from "cors";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "node:http";
import { initDeepSeekKey } from "./deepseek";
import { storage } from "./storage";

const app = express();
const httpServer = createServer(app);

if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

function allowedOrigins(): string[] {
  const configured = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const publicUrl = process.env.PUBLIC_URL ? [process.env.PUBLIC_URL] : [];
  const domainUrl = process.env.DOMAIN ? [`https://${process.env.DOMAIN}`] : [];
  const devOrigins = process.env.NODE_ENV === "production"
    ? []
    : ["http://localhost:5000", "http://localhost:5173", "http://127.0.0.1:5000", "http://127.0.0.1:5173"];

  return Array.from(new Set([...configured, ...publicUrl, ...domainUrl, ...devOrigins]));
}

app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === "production"
    ? {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          fontSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
        },
      }
    : false,
  hsts: process.env.NODE_ENV === "production"
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
}));

const corsOrigins = allowedOrigins();
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || corsOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
}));

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  // Load DeepSeek key from env → encrypt → store in DB (idempotent)
  initDeepSeekKey();

  storage.deleteExpiredOrRevokedRefreshTokens();
  setInterval(() => {
    storage.deleteExpiredOrRevokedRefreshTokens();
  }, 60 * 60 * 1000);

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
