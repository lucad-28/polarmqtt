require("dotenv").config();
const express = require("express");
const http = require("http");
const aedes = require("aedes")();
const net = require("net");
const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert({
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    projectId: process.env.FIREBASE_PROJECT_ID,
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = admin.database();

const mqttServer = net.createServer(aedes.handle);
const mqttPort = process.env.MQTT_PORT || 1883;
mqttServer.listen(mqttPort, () => {
  console.log(`MQTT server listening on port ${mqttPort}`);
});

aedes.on("client", (client) => {
  console.log(`Client connected: ${client.id}`);
});

aedes.on("publish", async (packet, client) => {
  if (client) {
    console.log(`📡 Mensaje de ${client.id}: ${packet.payload.toString()}`);
  }
});

const app = express();
const httpServer = http.createServer(app);
const httpPort = process.env.HTTP_PORT || 3000;

app.get("/", (req, res) => {
  res.send("Mqtt server is running");
});

httpServer.listen(httpPort, () => {
  console.log(`HTTP server listening on port ${httpPort}`);
});
