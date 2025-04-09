"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express_1 = require("express");
const cors_1 = require("cors");
// Initialize Firebase Admin
admin.initializeApp();
// Initialize Express app
const app = (0, express_1.default)();
// Enable CORS
app.use((0, cors_1.default)({ origin: true }));
// Add middleware for security
app.use((req, res, next) => {
    // Add security headers
    res.set("X-Content-Type-Options", "nosniff");
    res.set("X-Frame-Options", "DENY");
    res.set("X-XSS-Protection", "1; mode=block");
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    next();
    return; // Add return statement to ensure all paths return a value
});
// Define routes
app.get("/api/hello", (req, res) => {
    res.status(200).send({ message: "Hello from Firebase Functions!" });
});
// Export the Express app as a Firebase Cloud Function
exports.api = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map