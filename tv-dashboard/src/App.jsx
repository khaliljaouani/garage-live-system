import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export default function App() {
  const [cars, setCars] = useState([]);

  useEffect(() => {
    const socket = io("http://localhost:3000");

    socket.on("init", (data) => setCars([...data].reverse()));

    socket.on("new-car", (car) => {
      setCars((prev) => {
        if (prev.some((c) => c.id === car.id)) return prev;
        return [car, ...prev];
      });
    });

    return () => {
      socket.off("init");
      socket.off("new-car");
      socket.disconnect();
    };
  }, []);

  const markReady = async (id) => {
    await fetch(`http://localhost:3000/cars/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Prêt" })
    });

    setCars((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: "Prêt" } : c
      )
    );
  };

  const getColor = (status) => {
    if (status === "Prêt") return "bg-green-500 text-white border-none";
    if (status === "En cours" || status === "En attente") return "bg-orange-400 text-white border-none";
    return "bg-white text-gray-900 border-none";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 lg:p-10">

      <header className="mx-auto max-w-6xl rounded-2xl px-6 py-8 mb-8">
        <h1 className="text-4xl font-bold text-center">
          <span className="text-green-600">CLINICAR 77</span>
        </h1>
        <p className="mt-3 text-center text-gray-500 text-base">
          Suivi en temps réel des véhicules en attente, affichés en liste verticale.
        </p>
      </header>

      <main className="mx-auto mt-10 max-w-6xl space-y-6">
        {cars.map((car) => (
          <div
            key={car.id}
            className={`w-full overflow-hidden rounded-2xl p-6 shadow-lg transition duration-300 hover:scale-[1.01] ${getColor(car.status)}`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                <div>
                  <p className="text-xs uppercase tracking-widest opacity-80">
                    Immatriculation
                  </p>
                  <p className="mt-2 text-xl font-bold">
                    {car.immatriculation}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest opacity-80">
                    Modèle
                  </p>
                  <p className="mt-2 text-xl font-bold">
                    {car.modele}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest opacity-80">
                    À faire
                  </p>
                  <p className="mt-2 text-xl font-bold">
                    {car.besoin}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-start lg:justify-end">
                <button
                  onClick={() => markReady(car.id)}
                  className={`rounded-full px-8 py-4 text-sm font-semibold uppercase tracking-widest shadow-md transition hover:scale-105 ${car.status === "Prêt" ? "bg-white text-green-600 hover:bg-green-100" : "bg-white text-orange-600 hover:bg-orange-100"}`}
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