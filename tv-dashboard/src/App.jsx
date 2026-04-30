import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "https://garage-live-system.onrender.com";

let audioCtx = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  document.removeEventListener("click", initAudio);
};

document.addEventListener("click", initAudio);

const playBip = () => {
  if (!audioCtx || audioCtx.state !== "running") return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.type = "sine";
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.3);
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
      playBip();
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