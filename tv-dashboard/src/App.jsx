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
    socket.on("init", (data) => { setCars(data.slice().reverse()); setLoading(false); });
    socket.on("new-car", (car) => {
      setCars((prev) => prev.some((c) => c._id === car._id) ? prev : [car, ...prev]);
      playBip();
      setNewCarId(car._id);
      setTimeout(() => setNewCarId(null), 2000);
    });
    socket.on("update-car", (updatedCar) => {
      setCars((prev) => prev.map((c) => c._id === updatedCar._id ? updatedCar : c));
    });
    fetch(`${API_URL}/cars`).then(r => r.json()).then(data => { setCars(data.slice().reverse()); setLoading(false); }).catch(console.log);
    return () => socket.disconnect();
  }, []);

  const markReady = async (id) => {
    await fetch(`${API_URL}/cars/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Prêt" }) });
  };

  const getColor = (status) => {
    if (status === "Prêt") return "bg-green-500 text-white";
    if (status === "En attente" || status === "En cours") return "bg-orange-400 text-white";
    return "bg-gray-200 text-gray-900";
  };

  return (
    <div style={{ background: "#0f172a", minHeight: "100vh", color: "white", display: "flex", flexDirection: "column" }}>

      {/* HEADER MINI */}
      <div style={{ padding: "8px 16px", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#22c55e", fontWeight: "bold", fontSize: "18px" }}>CLINICAR 77</span>
        <span style={{ color: "#94a3b8", fontSize: "12px" }}>{cars.length} véhicule{cars.length !== 1 ? "s" : ""}</span>
      </div>

      {/* GRILLE 2 COLONNES */}
      <div style={{ flex: 1, padding: "8px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", alignContent: "start" }}>

        {loading && <p style={{ gridColumn: "span 2", textAlign: "center", color: "#94a3b8" }}>Chargement...</p>}

        {!loading && cars.length === 0 && (
          <p style={{ gridColumn: "span 2", textAlign: "center", color: "#94a3b8" }}>Aucun véhicule...</p>
        )}

        {cars.map((car) => (
          <div key={car._id} style={{
            position: "relative",
            borderRadius: "10px",
            padding: "10px 14px",
            background: car.status === "Prêt" ? "#22c55e" : "#fb923c",
            boxShadow: newCarId === car._id ? "0 0 0 3px white" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px"
          }}>

            {newCarId === car._id && (
              <span style={{ position: "absolute", top: "6px", right: "6px", background: "white", color: "#ea580c", fontSize: "10px", fontWeight: "bold", padding: "2px 8px", borderRadius: "999px" }}>
                NEW
              </span>
            )}

            <div style={{ display: "flex", gap: "20px", flex: 1, overflow: "hidden" }}>
              <div>
                <div style={{ fontSize: "10px", opacity: 0.7, textTransform: "uppercase" }}>Immat.</div>
                <div style={{ fontSize: "15px", fontWeight: "bold" }}>{car.immatriculation}</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", opacity: 0.7, textTransform: "uppercase" }}>Modèle</div>
                <div style={{ fontSize: "15px", fontWeight: "bold" }}>{car.modele}</div>
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: "10px", opacity: 0.7, textTransform: "uppercase" }}>Travail</div>
                <div style={{ fontSize: "15px", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{car.besoin}</div>
              </div>
            </div>

            <button
              onClick={() => markReady(car._id)}
              style={{ background: "white", color: car.status === "Prêt" ? "#16a34a" : "#ea580c", border: "none", borderRadius: "999px", padding: "6px 14px", fontWeight: "bold", fontSize: "13px", cursor: "pointer", flexShrink: 0 }}
            >
              ✔ Prêt
            </button>
          </div>
        ))}
      </div>

      {/* LISTE EN COLONNE CENTRÉE */}
      <div style={{
        flex: 1,
        padding: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        alignItems: "center"
      }}>
        {loading && <p style={{ textAlign: "center", color: "#94a3b8" }}>Chargement...</p>}

        {!loading && cars.length === 0 && (
          <p style={{ textAlign: "center", color: "#94a3b8" }}>Aucun véhicule...</p>
        )}

        {cars.map((car) => (
          <div key={car._id} style={{
            position: "relative",
            borderRadius: "10px",
            padding: "10px 14px",
            background: car.status === "Prêt" ? "#22c55e" : "#fb923c",
            boxShadow: newCarId === car._id ? "0 0 0 3px white" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            width: "fit-content", // <-- largeur auto selon le contenu
            minWidth: "320px",    // <-- largeur mini pour garder un look propre
            maxWidth: "90vw",     // <-- évite de dépasser l'écran
          }}>
            {newCarId === car._id && (
              <span style={{ position: "absolute", top: "6px", right: "6px", background: "white", color: "#ea580c", fontSize: "10px", fontWeight: "bold", padding: "2px 8px", borderRadius: "999px" }}>
                NEW
              </span>
            )}

            <div style={{ display: "flex", gap: "20px", flex: 1, overflow: "hidden" }}>
              <div>
                <div style={{ fontSize: "10px", opacity: 0.7, textTransform: "uppercase" }}>Immat.</div>
                <div style={{ fontSize: "15px", fontWeight: "bold" }}>{car.immatriculation}</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", opacity: 0.7, textTransform: "uppercase" }}>Modèle</div>
                <div style={{ fontSize: "15px", fontWeight: "bold" }}>{car.modele}</div>
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: "10px", opacity: 0.7, textTransform: "uppercase" }}>Travail</div>
                <div style={{ fontSize: "15px", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{car.besoin}</div>
              </div>
            </div>

            <button
              onClick={() => markReady(car._id)}
              style={{ background: "white", color: car.status === "Prêt" ? "#16a34a" : "#ea580c", border: "none", borderRadius: "999px", padding: "6px 14px", fontWeight: "bold", fontSize: "13px", cursor: "pointer", flexShrink: 0 }}
            >
              ✔ Prêt
            </button>
          </div>
        ))}
      </div>

      {/* GRILLE 2 COLONNES (VERSION 2) */}
      <div
        style={{
          flex: 1,
          padding: "16px",
          display: "grid",
          gridTemplateColumns: "repeat(2, 420px)", // 2 colonnes de largeur fixe
          gap: "16px",
          justifyContent: "center", // centre la grille
          alignItems: "stretch",     // force la même hauteur pour chaque ligne
        }}
      >
        {cars.map((car) => (
          <div
            key={car._id}
            style={{
              position: "relative",
              borderRadius: "10px",
              padding: "16px",
              background: car.status === "Prêt" ? "#22c55e" : "#fb923c",
              boxShadow: newCarId === car._id ? "0 0 0 3px white" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              width: "100%",           // 
              height: "auto",          // 
              minHeight: "60px",       // 
              fontSize: "16px",
            }}
          >
            {/* ... contenu de la carte ... */}
            <div style={{ display: "flex", gap: "20px", flex: 1, overflow: "hidden" }}>
              <div>
                <div style={{ fontSize: "10px", opacity: 0.7, textTransform: "uppercase" }}>Immat.</div>
                <div style={{ fontSize: "15px", fontWeight: "bold" }}>{car.immatriculation}</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", opacity: 0.7, textTransform: "uppercase" }}>Modèle</div>
                <div style={{ fontSize: "15px", fontWeight: "bold" }}>{car.modele}</div>
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: "10px", opacity: 0.7, textTransform: "uppercase" }}>Travail</div>
                <div style={{ fontSize: "15px", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{car.besoin}</div>
              </div>
            </div>
            <button
              onClick={() => markReady(car._id)}
              style={{
                background: "white",
                color: car.status === "Prêt" ? "#16a34a" : "#ea580c",
                border: "none",
                borderRadius: "999px",
                padding: "6px 14px",
                fontWeight: "bold",
                fontSize: "13px",
                cursor: "pointer",
                flexShrink: 0,
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