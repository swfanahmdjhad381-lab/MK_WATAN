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
    projectId: firebaseConfig.projectId,
  });
}

const db = admin.firestore();
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
      const snapshot = await db.collection("admin_accounts")
        .where("username", "==", username.toLowerCase())
        .limit(1)
        .get();

      if (snapshot.empty) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      const accountDoc = snapshot.docs[0];
      const accountData = accountDoc.data();

      if (accountData.password !== password) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // Create a custom token for the user
      const customToken = await auth.createCustomToken(accountData.uid);
      res.json({ token: customToken });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API Route: Admin creates a new account (Requires Admin check in production, but here we assume the client checks)
  // In a real app, you'd verify the requester's ID token here.
  app.post("/api/admin/create-account", async (req, res) => {
    const { username, password, displayName, adminUid } = req.body;

    if (!username || !password || !adminUid) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // 1. Verify the requester is an admin
      const adminSnap = await db.collection("users").doc(adminUid).get();
      if (!adminSnap.exists || adminSnap.data()?.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // 2. Check if username exists
      const existing = await db.collection("admin_accounts")
        .where("username", "==", username.toLowerCase())
        .get();
      
      if (!existing.empty) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // 3. Create a new user in Firebase Auth (or use a dummy UID)
      // We'll create a real user so they have a profile.
      const userRecord = await auth.createUser({
        displayName: displayName || username,
        email: `${username.toLowerCase()}@app.internal`,
      });

      // 4. Store the mapping
      await db.collection("admin_accounts").doc(userRecord.uid).set({
        username: username.toLowerCase(),
        password: password,
        uid: userRecord.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 5. Create the user profile in Firestore
      await db.collection("users").doc(userRecord.uid).set({
        uid: userRecord.uid,
        displayName: displayName || username,
        username: username.toLowerCase(),
        email: `${username.toLowerCase()}@app.internal`,
        role: "user",
        isPremium: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "offline",
      });

      res.json({ success: true, uid: userRecord.uid });
    } catch (error) {
      console.error("Create account error:", error);
      res.status(500).json({ error: "Internal server error" });
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
