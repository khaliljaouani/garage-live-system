const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: { origin: "*" }
});

let cars = [];

io.on("connection", (socket) => {
  socket.emit("init", cars);
});

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

app.post("/cars", (req, res) => {
  const car = {
    id: Date.now(),
    ...req.body,
    status: "En attente"
  };

  cars.push(car);
  io.emit("new-car", car);

  res.json(car);
});

server.listen(3000, () => {
  console.log("Backend lancé sur http://localhost:3000");
});