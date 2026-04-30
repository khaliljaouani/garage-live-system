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
    socket.on("init", (data) => { setCars(data.slice().reverse()); setLoading(false); });
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
      setCars((prev) => prev.map((c) => (c._id === updatedCar._id ? updatedCar : c)));
    });
    fetch(`${API_URL}/cars`)
      .then((res) => res.json())
      .then((data) => { setCars(data.slice().reverse()); setLoading(false); })
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
    } catch (err) { console.log("Erreur PUT:", err); }
  };

  const getColor = (status) => {
    if (status === "Prêt") return "bg-green-500 text-white";
    if (status === "En cours" || status === "En attente") return "bg-orange-400 text-white";
    return "bg-gray-200 text-gray-900";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">

      {/* HEADER COMPACT */}
      <header className="px-4 py-2 flex items-center justify-between border-b border-slate-800">
        <h1 className="text-xl font-bold">
          <span className="text-green-500">CLINICAR 77</span>
        </h1>
        <span className="text-slate-400 text-xs">
          {cars.length} véhicule{cars.length !== 1 ? "s" : ""} en cours
        </span>
      </header>

      {loading && (
        <p className="text-center text-gray-400 text-sm mt-6">Chargement...</p>
      )}

      {/* GRILLE 2 COLONNES — cartes petites, beaucoup tiennent à l'écran */}
      <main className="flex-1 p-2 grid grid-cols-2 gap-2 content-start">

        {!loading && cars.length === 0 && (
          <p className="col-span-2 text-center text-gray-400 text-sm mt-6">
            Aucun véhicule pour le moment...
          </p>
        )}

        {cars.map((car) => (
          <div
            key={car._id}
            className={`relative rounded-lg px-3 py-2 shadow transition-all duration-300
              ${getColor(car.status)}
              ${newCarId === car._id ? "ring-2 ring-white brightness-125" : ""}
            `}
          >
            {/* BADGE NOUVEAU */}
            {newCarId === car._id && (
              <span className="absolute top-1.5 right-2 bg-white text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                NEW
              </span>
            )}

            {/* LIGNE PRINCIPALE */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-3 flex-1 min-w-0">
                <div className="min-w-0">
                  <p className="text-xs opacity-60 uppercase leading-none">Immat.</p>
                  <p className="text-sm font-bold truncate">{car.immatriculation}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs opacity-60 uppercase leading-none">Modèle</p>
                  <p className="text-sm font-bold truncate">{car.modele}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs opacity-60 uppercase leading-none">Travail</p>
                  <p className="text-sm font-bold truncate">{car.besoin}</p>
                </div>
              </div>

              <button
                onClick={() => markReady(car._id)}
                className={`shrink-0 px-2 py-1 rounded-full text-xs font-bold transition hover:scale-105 ${
                  car.status === "Prêt" ? "bg-white text-green-600" : "bg-white text-orange-600"
                }`}
              >
                ✔ Prêt
              </button>
            </div>

            <p className="text-xs opacity-60 mt-1">{car.status}</p>
          </div>
        ))}
      </main>
    </div>
  );
}
