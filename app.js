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
const dbFs = admin.firestore();

const mqttServer = net.createServer(aedes.handle);
const mqttPort = process.env.MQTT_PORT || 1883;
mqttServer.listen(mqttPort, () => {
  console.log(`MQTT server listening on port ${mqttPort}`);
});

aedes.on("client", (client) => {
  console.log(`Client connected: ${client.id}`);
});

aedes.on("publish", async (packet, client) => {
  let log = `[${new Date().toISOString()}] `;
  if (client) {
    log += ` Mensaje de ${client.id} \n`;
    const message = packet.payload.toString();
    const topic = packet.topic;

    log += `Publicación recibida: ${
      packet.topic
    } ${packet.payload.toString()} \n`;

    if (topic === "devices/data") {
      try {
        const data = JSON.parse(message);
        const { deviceId, cooling, temperature, volume } = data;
        if (deviceId) {
          log += `Actualización de datos de ${deviceId}: ${JSON.stringify(
            data
          )} \n`;
          const deviceRef = db.ref(`devices/${deviceId}`);
          deviceRef.update({ cooling, temperature, volume });

          log += `Datos de ${deviceId} actualizados en Realtime Database \n`;

          const historyRef = dbFs.collection("history").doc();
          historyRef.set({
            deviceId,
            cooling,
            temperature,
            volume,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });

          log += `Datos de ${deviceId} almacenados en Firestore \n`;
        }
      } catch (error) {
        log += `Error al procesar mensaje: ${message} de ${client.id} \n ${error.message} `;
      }
    }
  } else {
    log += `Publicación recibida sin cliente: ${
      packet.topic
    } ${packet.payload.toString()} \n`;
  }
  console.log(log);
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
