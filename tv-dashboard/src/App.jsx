import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "https://garage-live-system.onrender.com";

// AudioContext global
let audioCtx = null;

// Initialise l'audio au premier clic sur la page
const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  // Retire le listener après le premier clic — plus besoin
  document.removeEventListener("click", initAudio);
};

// Écoute le premier clic n'importe où sur la page
document.addEventListener("click", initAudio);

const playGarageSound = () => {
  if (!audioCtx || audioCtx.state !== "running") return;

  const playTone = (freq, startTime, duration, type, gain) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + startTime);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(freq * 0.4, 20),
      audioCtx.currentTime + startTime + duration
    );
    g.gain.setValueAtTime(gain, audioCtx.currentTime + startTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + startTime + duration);
    osc.start(audioCtx.currentTime + startTime);
    osc.stop(audioCtx.currentTime + startTime + duration + 0.01);
  };

  playTone(120, 0.00, 0.15, "sawtooth", 0.5);
  playTone(80,  0.10, 0.20, "square",   0.4);
  playTone(200, 0.20, 0.10, "sawtooth", 0.3);
  playTone(60,  0.25, 0.30, "sawtooth", 0.25);
  playTone(300, 0.30, 0.08, "square",   0.2);
  playTone(150, 0.35, 0.20, "sawtooth", 0.15);
};

export default function App() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCarId, setNewCarId] = useState(null);

  useEffect(() => {
    const socket = io(API_URL);

    socket.on("connect", () => console.log("✅ Socket connecté"));

    socket.on("init", (data) => {
      setCars(data.slice().reverse());
      setLoading(false);
    });

    socket.on("new-car", (car) => {
      setCars((prev) => {
        if (prev.some((c) => c._id === car._id)) return prev;
        return [car, ...prev];
      });

      playGarageSound();

      setNewCarId(car._id);
      setTimeout(() => setNewCarId(null), 2000);
    });

    socket.on("update-car", (updatedCar) => {
      setCars((prev) =>
        prev.map((c) => (c._id === updatedCar._id ? updatedCar : c))
      );
    });

    fetch(`${API_URL}/cars`)
      .then((res) => res.json())
      .then((data) => {
        setCars(data.slice().reverse());
        setLoading(false);
      })
      .catch((err) => console.log("Erreur fetch:", err));

    return () => socket.disconnect();
  }, []);

  const markReady = async (id) => {
    try {
      await fetch(`${API_URL}/cars/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Prêt" }),
      });
    } catch (err) {
      console.log("Erreur PUT:", err);
    }
  };

  const getColor = (status) => {
    if (status === "Prêt") return "bg-green-500 text-white";
    if (status === "En cours" || status === "En attente") return "bg-orange-400 text-white";
    return "bg-gray-200 text-gray-900";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 lg:p-10">

      {/* HEADER */}
      <header className="mx-auto max-w-6xl px-6 py-8 mb-4 text-center">
        <h1 className="text-4xl font-bold">
          <span className="text-green-500">CLINICAR 77</span>
        </h1>
        <p className="mt-3 text-gray-400">Dashboard temps réel des véhicules</p>
      </header>

      {loading && (
        <p className="text-center text-gray-400 text-xl mt-10">
          Chargement des véhicules...
        </p>
      )}

      <main className="mx-auto mt-6 max-w-6xl space-y-6">

        {!loading && cars.length === 0 && (
          <p className="text-center text-gray-400 text-xl">
            Aucun véhicule pour le moment...
          </p>
        )}

        {cars.map((car) => (
          <div
            key={car._id}
            className={`relative w-full rounded-2xl p-6 shadow-lg transition-all duration-300 hover:scale-[1.01]
              ${getColor(car.status)}
              ${newCarId === car._id ? "ring-4 ring-white scale-[1.02] brightness-125" : ""}
            `}
          >
            {newCarId === car._id && (
              <span className="absolute top-3 right-4 bg-white text-orange-600 text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                🚗 NOUVEAU
              </span>
            )}

            <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase opacity-70">Immatriculation</p>
                  <p className="text-xl font-bold">{car.immatriculation}</p>
                </div>
                <div>
                  <p className="text-xs uppercase opacity-70">Modèle</p>
                  <p className="text-xl font-bold">{car.modele}</p>
                </div>
                <div>
                  <p className="text-xs uppercase opacity-70">Travail</p>
                  <p className="text-xl font-bold">{car.besoin}</p>
                </div>
              </div>

              <div>
                <button
                  onClick={() => markReady(car._id)}
                  className={`px-6 py-3 rounded-full font-bold transition hover:scale-105 ${
                    car.status === "Prêt"
                      ? "bg-white text-green-600"
                      : "bg-white text-orange-600"
                  }`}
                >
                  ✔ Prêt
                </button>
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
