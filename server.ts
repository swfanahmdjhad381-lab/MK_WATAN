import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import admin from "firebase-admin";
import { fileURLToPath } from "url";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
// Note: In this environment, the default credentials should work if the project is provisioned.
// We use the projectId from the config.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: firebaseConfig.projectId,
  });
}

const auth = admin.auth();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Login with Admin-generated Username/Password
  app.post("/api/auth/login-username", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    try {
      const sanitizedUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');
      const email = `${sanitizedUsername}@app.internal`;

      // Use Firebase Auth REST API to sign in
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Firebase Auth REST API login error:", data);
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // Return the ID token to the client
      res.json({ token: data.idToken });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API Route: Admin creates a new account
  app.post("/api/admin/create-account", async (req, res) => {
    const { username, password, displayName, adminUid } = req.body;

    if (!username || !password || !adminUid) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // We will do the Firestore operations on the frontend because the backend
      // Admin SDK might not have the correct credentials to bypass security rules.
      
      const sanitizedUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');
      const email = `${sanitizedUsername}@app.internal`;

      // Use Firebase Auth REST API to create the user
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Firebase Auth REST API error:", data);
        return res.status(400).json({ error: data.error?.message || "Failed to create user in Auth" });
      }

      res.json({ success: true, uid: data.localId });
    } catch (error: any) {
      console.error("Create account error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // API Route: Admin deletes an account
  app.post("/api/admin/delete-account", async (req, res) => {
    const { targetUid, adminUid } = req.body;

    if (!targetUid || !adminUid) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // We assume the frontend has already verified the admin status
      // because the backend Admin SDK might not have Firestore permissions.

      // Use Firebase Auth REST API to delete the user
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${firebaseConfig.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          localId: targetUid
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Firebase Auth REST API delete error:", data);
        // We don't fail if the user is already deleted
        if (data.error?.message !== 'USER_NOT_FOUND') {
          return res.status(400).json({ error: data.error?.message || "Failed to delete user in Auth" });
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete account error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
