import { useEffect, useState } from "react";
import { io } from "socket.io-client";

// ✅ URL du backend Railway — change cette valeur quand tu as ton URL Railway
const API_URL = import.meta.env.VITE_API_URL || "https://garage-live-system.onrender.com";

export default function App() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ✅ Connexion Socket.IO
    const socket = io(API_URL);

    socket.on("connect", () => {
      console.log("Socket connecté");
    });

    // INIT : données au démarrage
    socket.on("init", (data) => {
      console.log("INIT:", data);
      setCars(data.slice().reverse());
      setLoading(false);
    });

    // NOUVELLE VOITURE ajoutée
    socket.on("new-car", (car) => {
      setCars((prev) => {
        // ✅ FIX : utilise _id (MongoDB) et pas id
        if (prev.some((c) => c._id === car._id)) return prev;
        return [car, ...prev];
      });
    });

    // VOITURE MISE À JOUR (statut changé)
    socket.on("update-car", (updatedCar) => {
      // ✅ FIX : utilise _id (MongoDB) et pas id
      setCars((prev) =>
        prev.map((c) => (c._id === updatedCar._id ? updatedCar : c))
      );
    });

    // FALLBACK fetch si socket lent
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

        {/* ✅ FIX : key={car._id} au lieu de car.id */}
        {cars.map((car) => (
          <div
            key={car._id}
            className={`w-full rounded-2xl p-6 shadow-lg transition hover:scale-[1.01] ${getColor(car.status)}`}
          >
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
              {/* ✅ FIX : markReady(car._id) au lieu de car.id */}
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
