require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);

// =========================
// CORS CONFIG (FIX PROPRE)
// =========================
const corsOptions = {
  origin: [
    "https://garage-live-system-erun-git-main-khalils-projects-164cc693.vercel.app"
  ],
  methods: ["GET", "POST", "PUT"],
  allowedHeaders: ["Content-Type"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // 🔥 IMPORTANT (preflight)

app.use(express.json());

// =========================
// MONGODB CONNECTION
// =========================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connecté"))
  .catch(err => console.log(err));

// =========================
// MODEL
// =========================
const CarSchema = new mongoose.Schema({
  immatriculation: String,
  modele: String,
  besoin: String,
  status: {
    type: String,
    default: "En attente"
  }
}, { timestamps: true });

const Car = mongoose.model("Car", CarSchema);

// =========================
// SOCKET.IO
// =========================
const io = new Server(server, {
  cors: {
    origin: [
      "https://garage-live-system-erun-git-main-khalils-projects-164cc693.vercel.app"
    ],
    methods: ["GET", "POST", "PUT"]
  }
});

// =========================
// SOCKET CONNECTION
// =========================
io.on("connection", async (socket) => {
  console.log("Client connecté");

  const cars = await Car.find().sort({ createdAt: -1 });

  socket.emit("init", cars);
});

// =========================
// ROUTES
// =========================

// GET ALL CARS
app.get("/cars", async (req, res) => {
  const cars = await Car.find().sort({ createdAt: -1 });
  res.json(cars);
});

// ADD CAR
app.post("/cars", async (req, res) => {
  try {
    const exists = await Car.findOne({
      immatriculation: req.body.immatriculation
    });

    if (exists) return res.json(exists);

    const car = await Car.create(req.body);

    io.emit("new-car", car);

    res.json(car);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// UPDATE CAR
app.put("/cars/:id", async (req, res) => {
  try {
    const car = await Car.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );

    io.emit("update-car", car);

    res.json(car);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// =========================
// SERVER START
// =========================
const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend lancé sur le port ${PORT}`);
});