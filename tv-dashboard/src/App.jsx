import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "https://garage-live-system.onrender.com";

// =========================
// SON MÉCANIQUE — Web Audio API
// Pas besoin de fichier audio, généré en code pur
// =========================
const playGarageSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const playTone = (freq, startTime, duration, type = "sawtooth", gain = 0.3) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + startTime + duration);
      gainNode.gain.setValueAtTime(gain, ctx.currentTime + startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    // Impact mécanique : clé à molette + résonance métal
    playTone(120, 0.00, 0.15, "sawtooth", 0.4);
    playTone(80,  0.10, 0.20, "square",   0.3);
    playTone(200, 0.20, 0.10, "sawtooth", 0.25);
    playTone(60,  0.25, 0.30, "sawtooth", 0.2);
    playTone(300, 0.30, 0.08, "square",   0.15);
    playTone(150, 0.35, 0.20, "sawtooth", 0.1);

  } catch (e) {
    console.log("Audio non supporté:", e);
  }
};

export default function App() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCarId, setNewCarId] = useState(null); // pour l'animation flash

  useEffect(() => {
    const socket = io(API_URL);

    socket.on("connect", () => {
      console.log("Socket connecté");
    });

    // INIT : données au démarrage (pas de son)
    socket.on("init", (data) => {
      setCars(data.slice().reverse());
      setLoading(false);
    });

    // NOUVELLE VOITURE → son + flash
    socket.on("new-car", (car) => {
      setCars((prev) => {
        if (prev.some((c) => c._id === car._id)) return prev;
        return [car, ...prev];
      });

      // 🔊 Joue le son mécanique
      playGarageSound();

      // 💡 Flash visuel sur la carte pendant 2s
      setNewCarId(car._id);
      setTimeout(() => setNewCarId(null), 2000);
    });

    // VOITURE MISE À JOUR
    socket.on("update-car", (updatedCar) => {
      setCars((prev) =>
        prev.map((c) => (c._id === updatedCar._id ? updatedCar : c))
      );
    });

    // FALLBACK fetch
    fetch(`${API_URL}/cars`)
      .then((res) => res.json())
      .then((data) => {
        setCars(data.slice().reverse());
        setLoading(false);
      })
      .catch((err) => {
        console.log("Erreur fetch:", err);
        setLoading(false);
      });

    return () => socket.disconnect();
  }, []);

  // =========================
  // MARQUER COMME PRÊT
  // =========================
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

  // =========================
  // COULEURS PAR STATUT
  // =========================
  const getColor = (status) => {
    if (status === "Prêt") return "bg-green-500 text-white";
    if (status === "En cours" || status === "En attente")
      return "bg-orange-400 text-white";
    return "bg-gray-200 text-gray-900";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 lg:p-10">

      {/* HEADER */}
      <header className="mx-auto max-w-6xl rounded-2xl px-6 py-8 mb-8">
        <h1 className="text-4xl font-bold text-center">
          <span className="text-green-500">CLINICAR 77</span>
        </h1>
        <p className="mt-3 text-center text-gray-400">
          Dashboard temps réel des véhicules
        </p>
      </header>

      {/* LOADING */}
      {loading && (
        <p className="text-center text-gray-400 text-xl">
          Chargement des véhicules...
        </p>
      )}

      {/* LISTE DES VOITURES */}
      <main className="mx-auto mt-10 max-w-6xl space-y-6">

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
            {/* BADGE NOUVEAU */}
            {newCarId === car._id && (
              <span className="absolute top-3 right-4 bg-white text-orange-600 text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                🚗 NOUVEAU
              </span>
            )}

            <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">

              {/* INFOS VOITURE */}
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

              {/* BOUTON PRÊT */}
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
