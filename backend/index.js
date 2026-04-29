const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

// =========================
// MIDDLEWARE
// =========================
app.use(cors({
  origin: "*"
}));
app.use(express.json());

// =========================
// SOCKET.IO
// =========================
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT"]
  }
});

// =========================
// DATA (TEMPORAIRE)
// =========================
let cars = [];

// =========================
// SOCKET CONNECTION
// =========================
io.on("connection", (socket) => {
  console.log("Client connecté");

  // envoyer les données au client
  socket.emit("init", cars);
});

// =========================
// GET ALL CARS (IMPORTANT)
// =========================
app.get("/cars", (req, res) => {
  res.json(cars);
});

// =========================
// ADD CAR
// =========================
app.post("/cars", (req, res) => {
  const exists = cars.find(
    (c) => c.immatriculation === req.body.immatriculation
  );

  if (exists) {
    return res.json(exists);
  }

  const car = {
    id: Date.now(),
    ...req.body,
    status: "En attente"
  };

  cars.push(car);

  io.emit("new-car", car);

  res.json(car);
});

// =========================
// UPDATE CAR STATUS
// =========================
app.put("/cars/:id", (req, res) => {
  const car = cars.find(c => c.id == req.params.id);

  if (!car) {
    return res.status(404).json({ message: "Voiture introuvable" });
  }

  car.status = req.body.status;

  io.emit("update-car", car);

  res.json(car);
});

// =========================
// SERVER START
// =========================
const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log("Backend lancé sur le port " + PORT);
});