require("dotenv").config(); // Load environment variables
const admin = require("firebase-admin");
const express = require("express");

const app = express();
app.use(express.json());

// Initialize Firebase Admin using environment variables
admin.initializeApp({
  credential: admin.credential.cert({
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"), // Fix newline issue
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});

const messaging = admin.messaging();

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.post("/notify", async (req, res) => {
  const message = {
    notification: {
      title: req.body.title || "New Notification",
      body: req.body.body || "This is a notification",
    },
    topic: "all",
  };

  try {
    await messaging.send(message);
    res.json({ success: true, message: "Notification sent successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/subscribe", async (req, res) => {
  const { token, topic } = req.body;

  try {
    await messaging.subscribeToTopic(token, topic);
    res.json({ success: true, message: `Subscribed to topic: ${topic}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3000, "0.0.0.0", () => console.log("Server running on port 3000"));
