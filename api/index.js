require("dotenv").config();
const express = require("express");
const { Expo } = require("expo-server-sdk");

const app = express();
app.use(express.json());

const expo = new Expo();

// ✅ In-memory storage for Expo push tokens
let expoPushTokens = [];

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

  if (!expoPushTokens.includes(token)) {
    expoPushTokens.push(token);
    console.log("✅ New Expo push token stored:", token);
  } else {
    console.log("ℹ️ Token already exists, skipping:", token);
  }

  res.json({ success: true, message: "Expo Push Token stored successfully" });
});

// ✅ Send Push Notification to All Stored Tokens
app.post("/send-notification", async (req, res) => {
  console.log("📤 Received request to send notification");

  const { title, body, type } = req.body; // "warning" | "success" | "info"

  if (!title || !body) {
    console.error("❌ Missing title or body in request");
    return res.status(400).send("Title and body are required");
  }

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
    channelId, // Assigning the channel
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

// ✅ Check stored tokens
app.get("/tokens", (req, res) => {
  console.log("📜 Stored Expo tokens:", expoPushTokens);
  res.json({ tokens: expoPushTokens });
});

// ✅ Root route
app.get("/", (req, res) => {
  console.log("👋 Hello from the Expo Notification Server!");
  res.send("Hello from Expo Notification Server!");
});

// ✅ Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
