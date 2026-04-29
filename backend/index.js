const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT"]
  }
});

let cars = [];

// 🔌 Connexion Socket.IO
io.on("connection", (socket) => {
  console.log("Client connecté");

  // envoie les données initiales
  socket.emit("init", cars);
});

// ➕ Ajouter une voiture
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

// ✏️ Mettre à jour statut (PRÊT)
app.put("/cars/:id", (req, res) => {
  const { id } = req.params;

  const car = cars.find((c) => c.id == id);

  if (!car) {
    return res.status(404).json({ message: "Voiture introuvable" });
  }

  car.status = req.body.status;

  io.emit("update-car", car);

  res.json(car);
});

// 🚀 PORT Railway obligatoire
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Backend lancé sur le port ${PORT}`);
});