require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");

// INIT APP
const app = express();
const server = http.createServer(app);

// MIDDLEWARE (CORS EN PREMIER)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));
app.use(express.json());

// MONGODB CONNECTION
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB connecté");
    const result = await Car.updateMany({ status: "En attente" }, { status: "En cours" });
    if (result.modifiedCount > 0)
      console.log(`🔄 ${result.modifiedCount} voiture(s) "En attente" → "En cours"`);
  })
  .catch((err) => console.error("❌ MongoDB erreur:", err));

// MODEL
const CarSchema = new mongoose.Schema(
  {
    immatriculation: { type: String, required: true, trim: true },
    modele: String,
    besoin: String,
    status: {
      type: String,
      enum: ["En cours", "Prêt"],
      default: "En cours",
    },
  },
  { timestamps: true }
);
CarSchema.index({ immatriculation: 1, status: 1 });
const Car = mongoose.model("Car", CarSchema);

// SOCKET.IO
const io = new Server(server, {
  cors: { origin: "*" },
  transports: ["polling", "websocket"],
});

// SOCKET CONNECTION
io.on("connection", async (socket) => {
  console.log("🔌 Client connecté :", socket.id);
  try {
    const cars = await Car.find().sort({ createdAt: -1 });
    socket.emit("init", cars);
  } catch (err) {
    console.error("❌ Erreur init:", err);
  }
  socket.on("disconnect", () => {
    console.log("❌ Client déconnecté :", socket.id);
  });
});

// ROUTES

// HEALTH CHECK
app.get("/", (req, res) => {
  res.json({ message: "🚗 Backend garage PRO OK" });
});

// GET ALL CARS
app.get("/cars", async (req, res) => {
  try {
    const cars = await Car.find().sort({ createdAt: -1 });
    res.json(cars);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ADD CAR
app.post("/cars", async (req, res) => {
  try {
    const { immatriculation, modele, besoin } = req.body;
    if (!immatriculation) {
      return res.status(400).json({ error: "Immatriculation requise" });
    }
    const exists = await Car.findOne({
      immatriculation,
      status: { $ne: "Prêt" },
    });
    if (exists) {
      return res.json(exists);
    }
    const car = await Car.create({ immatriculation, modele, besoin });
    io.emit("new-car", car);
    res.json(car);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// UPDATE CAR (status + champs)
app.put("/cars/:id", async (req, res) => {
  try {
    const { status, modele, besoin } = req.body;
    const update = {};

    if (status !== undefined) {
      if (!["En cours", "Prêt"].includes(status)) {
        return res.status(400).json({ error: "Statut invalide" });
      }
      update.status = status;
    }
    if (modele !== undefined) update.modele = modele;
    if (besoin  !== undefined) update.besoin  = besoin;

    const car = await Car.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!car) return res.status(404).json({ error: "Voiture non trouvée" });

    io.emit("update-car", car);
    res.json(car);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE CAR
app.delete("/cars/:id", async (req, res) => {
  try {
    await Car.findByIdAndDelete(req.params.id);
    io.emit("delete-car", req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// SERVER START
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend lancé sur le port ${PORT}`);
});