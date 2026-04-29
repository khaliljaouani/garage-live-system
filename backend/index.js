require('dotenv').config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);

// =========================
// MIDDLEWARE (CORS EN PREMIER !)
// =========================
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  credentials: true
}));
app.options('*', cors()); // Gère les requêtes préflight

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
// MIDDLEWARE
// =========================
app.use(cors({ origin: "*" }));
app.options('*', cors({ origin: '*' }));
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
// SOCKET CONNECTION
// =========================
io.on("connection", async (socket) => {
  console.log("Client connecté");

  const cars = await Car.find().sort({ createdAt: -1 });

  socket.emit("init", cars);
});

// =========================
// GET ALL CARS
// =========================
app.get("/cars", async (req, res) => {
  const cars = await Car.find().sort({ createdAt: -1 });
  res.json(cars);
});

// =========================
// ADD CAR
// =========================
app.post("/cars", async (req, res) => {
  const exists = await Car.findOne({
    immatriculation: req.body.immatriculation
  });

  if (exists) return res.json(exists);

  const car = await Car.create(req.body);

  io.emit("new-car", car);

  res.json(car);
});

// =========================
// UPDATE CAR STATUS
// =========================
app.put("/cars/:id", async (req, res) => {
  const car = await Car.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );

  io.emit("update-car", car);

  res.json(car);
});

// =========================
// SERVER START
// =========================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Backend lancé sur le port ${PORT}`);
});