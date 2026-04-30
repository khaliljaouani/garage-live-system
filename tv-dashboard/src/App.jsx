import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "https://garage-live-system.onrender.com";

let audioCtx = null;
const initAudio = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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

    socket.on("connect", () => console.log("✅ connecté"));

    // ✅ INIT (PAS de reverse)
    socket.on("init", (data) => {
      setCars(data);
      setLoading(false);
    });

    // ✅ NOUVELLE VOITURE EN HAUT
    socket.on("new-car", (car) => {
      setCars((prev) =>
        prev.some((c) => c._id === car._id)
          ? prev
          : [car, ...prev]
      );

      playBip();
      setNewCarId(car._id);
      setTimeout(() => setNewCarId(null), 2000);
    });

    socket.on("update-car", (updatedCar) => {
      setCars((prev) =>
        prev.map((c) =>
          c._id === updatedCar._id ? updatedCar : c
        )
      );
    });

    return () => socket.disconnect();
  }, []);

  const markReady = async (id) => {
    await fetch(`${API_URL}/cars/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Prêt" })
    });
  };

  return (
    <div style={{ background: "#0f172a", minHeight: "100vh", color: "white", display: "flex", flexDirection: "column" }}>

      {/* HEADER */}
      <div style={{ padding: "8px 16px", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#22c55e", fontWeight: "bold" }}>CLINICAR 77</span>
        <span style={{ color: "#94a3b8" }}>{cars.length} véhicules</span>
      </div>

      {/* LISTE */}
      <div style={{ flex: 1, padding: "8px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>

        {loading && <p style={{ gridColumn: "span 2" }}>Chargement...</p>}

        {cars.map((car) => (
          <div key={car._id} style={{
            borderRadius: "10px",
            padding: "10px",
            background: car.status === "Prêt" ? "#22c55e" : "#fb923c",
            boxShadow: newCarId === car._id ? "0 0 0 3px white" : "none",
            display: "flex",
            justifyContent: "space-between"
          }}>

            <div>
              <div><b>{car.immatriculation}</b></div>
              <div>{car.modele}</div>
              <div>{car.besoin}</div>
            </div>

            <button
              onClick={() => markReady(car._id)}
              style={{
                background: "white",
                borderRadius: "20px",
                padding: "5px 10px"
              }}
            >
              ✔ Prêt
            </button>

          </div>
        ))}

      </div>
    </div>
  );
}