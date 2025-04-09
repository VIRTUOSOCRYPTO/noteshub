import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Express app
const app = express();

// Enable CORS
app.use(cors({ origin: true }));

// Add middleware for security
app.use((req, res, next) => {
  // Add security headers
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("X-XSS-Protection", "1; mode=block");
  res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
  // Add return statement to ensure all paths return a value
  return;
});

// Define routes
app.get("/api/hello", (req, res) => {
  res.status(200).send({ message: "Hello from Firebase Functions!" });
});

// Export the Express app as a Firebase Cloud Function
export const api = functions.https.onRequest(app);