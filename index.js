require("dotenv").config();
const express = require("express");
const { Expo } = require("expo-server-sdk");
const admin = require("firebase-admin");

const app = express();
app.use(express.json());

const expo = new Expo();

// ✅ Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = admin.database();
const tokensRef = db.ref("expoPushTokens");

// ✅ Store Expo Push Tokens
app.post("/store-expo-token", (req, res) => {
  console.log("📥 Received request to store Expo token");

  const { token } = req.body;
  if (!token) {
    console.error("❌ No token provided in request!");
    return res.status(400).json({ error: "Token is required" });
  }

  if (!Expo.isExpoPushToken(token)) {
    console.error("❌ Invalid Expo push token received:", token);
    return res.status(400).json({ error: "Invalid Expo Push Token" });
  }

  tokensRef.once("value", (snapshot) => {
    const tokens = snapshot.val() || [];
    if (!tokens.includes(token)) {
      tokens.push(token);
      tokensRef.set(tokens);
      console.log("✅ New Expo push token stored:", token);
    } else {
      console.log("ℹ️ Token already exists, skipping:", token);
    }
  });

  res.json({ success: true, message: "Expo Push Token stored successfully" });
});

// ✅ Send Push Notification to All Stored Tokens
app.get("/send-notification", async (req, res) => {
  console.log("📤 Received request to send notification");

  // const { title, body, type } = req.body;
  // take the title, body and type from the request params
  const title = req.query.title;
  const body = req.query.body;
  const type = req.query.type;
  if (!title || !body) {
    console.error("❌ Missing title or body in request");
    return res.status(400).send("Title and body are required");
  }

  tokensRef.once("value", async (snapshot) => {
    const expoPushTokens = snapshot.val() || [];
    if (expoPushTokens.length === 0) {
      console.warn("⚠️ No Expo push tokens available.");
      return res.send("No Expo push tokens available");
    }

    console.log("📨 Sending notifications with type:", type);
    let channelId = "default";
    if (type === "warning") channelId = "warning";
    if (type === "success") channelId = "success";

    let messages = expoPushTokens.map((token) => ({
      to: token,
      sound: "default",
      title: title,
      body: body,
      data: { type },
      channelId,
    }));

    try {
      let chunks = expo.chunkPushNotifications(messages);
      let tickets = [];

      for (let chunk of chunks) {
        console.log("📦 Sending notification chunk:", chunk);
        let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        console.log("✅ Ticket response:", ticketChunk);
      }

      console.log("📩 All notifications sent successfully.");
      return res.status(200).send("All notifications sent successfully");
    } catch (error) {
      console.error("❌ Error sending notifications:", error);
      res.status(500).send("Error sending notifications");
    }
  });
});

// ✅ Check stored tokens
app.get("/tokens", (req, res) => {
  tokensRef.once("value", (snapshot) => {
    console.log("📜 Stored Expo tokens:", snapshot.val());
    res.json({ tokens: snapshot.val() || [] });
  });
});

// ✅ Root route
app.get("/", (req, res) => {
  console.log("👋 Hello from the Expo Notification Server!");
  res.send("Hello from Expo Notification Server!");
});

// ✅ Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
