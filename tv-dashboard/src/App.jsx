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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  const visibleCars = cars.filter(car => {
    const carDate = new Date(car.createdAt);
    return carDate.toDateString() === selectedDate.toDateString();
  });

  useEffect(() => {
    const socket = io(API_URL, {
      transports: ["polling", "websocket"],
    });

    socket.on("connect", () => console.log("✅ connecté"));

    socket.on("init", (data) => {
      setCars(data);
      setLoading(false);
    });

    socket.on("new-car", (car) => {
      setCars((prev) => {
        if (prev.some((c) => c._id.toString() === car._id.toString())) return prev;
        return [car, ...prev];
      });
      playBip();
      setNewCarId(car._id.toString());
      setTimeout(() => setNewCarId(null), 2000);
    });

    socket.on("update-car", (updatedCar) => {
      setCars((prev) =>
        prev.map((c) =>
          c._id.toString() === updatedCar._id.toString() ? updatedCar : c
        )
      );
    });

    fetch(`${API_URL}/cars`)
      .then(r => r.json())
      .then(data => {
        setCars(data);
        setLoading(false);
      })
      .catch(console.log);

    return () => socket.disconnect();
  }, []);

  const toggleStatus = async (car) => {
    const newStatus = car.status === "Prêt" ? "En cours" : "Prêt";
    await fetch(`${API_URL}/cars/${car._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });
  };

  // Couleur selon le statut
  const getCardColor = (status) => {
    if (status === "Prêt") return "#22c55e";
    return "#fb923c";
  };

  return (
    <div style={{ background: "#0f172a", minHeight: "100vh", color: "white", display: "flex", flexDirection: "column" }}>
      {/* HEADER */}
      <div style={{ padding: "10px 20px", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>

        {/* Logo */}
        <span style={{ color: "#22c55e", fontWeight: "bold", fontSize: "18px" }}>CLINICAR 77</span>

        {/* Navigation jour */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button onClick={prevDay} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "22px", cursor: "pointer", lineHeight: 1 }}>‹</button>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "white", fontWeight: "bold", fontSize: "15px" }}>
              {isToday ? "Aujourd'hui" : selectedDate.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}
            </div>
            <div style={{ color: "#94a3b8", fontSize: "11px" }}>
              {selectedDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })} — {visibleCars.length} véhicule{visibleCars.length !== 1 ? "s" : ""}
            </div>
          </div>
          <button onClick={nextDay} disabled={isToday} style={{ background: "none", border: "none", color: isToday ? "#334155" : "#94a3b8", fontSize: "22px", cursor: isToday ? "default" : "pointer", lineHeight: 1 }}>›</button>
        </div>

        {/* Horloge */}
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "white", fontWeight: "bold", fontSize: "20px", fontVariantNumeric: "tabular-nums" }}>
            {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
          <div style={{ color: "#94a3b8", fontSize: "11px" }}>
            {now.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </div>
        </div>
      </div>

      {/* GRILLE 2 COLONNES */}
      <div style={{
        flex: 1,
        padding: "16px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "16px",
        alignContent: "start"
      }}>
        {loading && <p style={{ gridColumn: "span 2", textAlign: "center", color: "#94a3b8" }}>Chargement...</p>}

        {!loading && visibleCars.length === 0 && (
          <p style={{ gridColumn: "span 2", textAlign: "center", color: "#94a3b8" }}>Aucun véhicule ce jour.</p>
        )}

        {visibleCars.map((car) => (
          <div key={car._id} style={{
            position: "relative",
            borderRadius: "14px",
            padding: "16px 20px",
            background: getCardColor(car.status),
            boxShadow: newCarId === car._id.toString() ? "0 0 0 3px white" : "none",
            width: "95%",
            minWidth: "420px",
            maxWidth: "700px",
            margin: "0 auto"
          }}>
            {newCarId === car._id.toString() && (
              <span style={{
                position: "absolute",
                top: "6px",
                right: "6px",
                background: "white",
                color: "#ea580c",
                fontSize: "10px",
                fontWeight: "bold",
                padding: "2px 8px",
                borderRadius: "999px"
              }}>
                NEW
              </span>
            )}

            {/* Ligne 1 : Immat + Modèle + badge + bouton */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 10 }}>
              <div style={{ display: "flex", gap: "28px" }}>
                <div>
                  <div style={{ fontSize: "10px", opacity: 0.7, textTransform: "uppercase" }}>Immat.</div>
                  <div style={{ fontSize: "18px", fontWeight: "bold" }}>{car.immatriculation}</div>
                </div>
                <div>
                  <div style={{ fontSize: "10px", opacity: 0.7, textTransform: "uppercase" }}>Modèle</div>
                  <div style={{ fontSize: "18px", fontWeight: "bold" }}>{car.modele}</div>
                </div>
              </div>
              <button
                onClick={() => toggleStatus(car)}
                style={{
                  background: car.status === "Prêt" ? "#16a34a" : "white",
                  color: car.status === "Prêt" ? "white" : "#ea580c",
                  border: "none",
                  borderRadius: "999px",
                  padding: "8px 20px",
                  fontWeight: "bold",
                  fontSize: "15px",
                  cursor: "pointer",
                  flexShrink: 0
                }}
              >
                {car.status === "Prêt" ? "✔ Prêt" : "En cours"}
              </button>
            </div>

            {/* Ligne 2 : Travail pleine largeur */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.3)", paddingTop: 10 }}>
              <div style={{ fontSize: "10px", opacity: 0.7, textTransform: "uppercase", marginBottom: 4 }}>Travail</div>
              <div style={{ fontSize: "16px", fontWeight: "bold", wordBreak: "break-word", lineHeight: 1.4 }}>
                {car.besoin}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}