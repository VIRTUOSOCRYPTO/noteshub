import type { Express, Request, Response } from "express";

// Basic placeholder for routes that will be implemented later
export function registerRoutes(app: Express): void {
  app.get("/api/test", (req: Request, res: Response) => {
    res.status(200).json({ message: "API is working" });
  });
}