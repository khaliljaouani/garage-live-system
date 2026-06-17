import { useState, useEffect } from "react";
import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "https://garage-live-system.onrender.com";

const STATUS_STYLE = {
  "Prêt":     { card: "bg-green-500", badge: "bg-green-700 text-white" },
  "En cours": { card: "bg-blue-500",  badge: "bg-blue-700 text-white"  },
};
const defaultStyle = STATUS_STYLE["En cours"];

const FILTERS = ["Tous", "En cours", "Prêt"];

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
    + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function CarsList({ onEdit }) {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Tous");

  const loadCars = () => {
    setLoading(true);
    setError(false);
    fetch(`${API_URL}/cars`)
      .then(r => r.json())
      .then(data => { setCars(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => {
    loadCars();

    const socket = io(API_URL, { transports: ["polling", "websocket"] });

    socket.on("new-car", (car) => {
      setCars(prev => prev.some(c => c._id === car._id) ? prev : [car, ...prev]);
    });

    socket.on("update-car", (updated) => {
      setCars(prev => prev.map(c => c._id === updated._id ? updated : c));
    });

    socket.on("delete-car", (id) => {
      setCars(prev => prev.filter(c => c._id !== id));
    });

    return () => socket.disconnect();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce véhicule ?")) return;
    await fetch(`${API_URL}/cars/${id}`, { method: "DELETE" });
    setCars(prev => prev.filter(car => car._id !== id));
  };

  const filtered = cars
    .filter(c => {
      if (filter === "Tous") return true;
      if (filter === "En cours") return c.status === "En cours" || c.status === "En attente";
      return c.status === filter;
    })
    .filter(c => c.immatriculation.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      {/* Barre recherche + refresh */}
      <div className="flex gap-2 mb-3">
        <input
          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
          placeholder="Rechercher une immat..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button
          onClick={loadCars}
          className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-bold transition active:scale-95"
          title="Rafraîchir"
        >
          ↻
        </button>
      </div>

      {/* Filtres statut */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition ${
              filter === f
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading && <p className="text-center text-gray-400 py-8">Chargement...</p>}
      {error   && <p className="text-center text-red-400 py-8">Erreur de chargement.</p>}

      {!loading && !error && filtered.length === 0 && (
        <p className="text-center text-gray-400 py-8">Aucun véhicule trouvé.</p>
      )}

      <div className="flex flex-col gap-3">
        {filtered.map(car => {
          const style = STATUS_STYLE[car.status] || defaultStyle;
          return (
            <div key={car._id} className={`${style.card} text-white rounded-2xl shadow-md p-4`}>

              {/* Ligne 1 : Immat + Modèle + Badge */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg tracking-wide">{car.immatriculation}</span>
                  <span className="text-white/70 text-sm font-medium">· {car.modele}</span>
                </div>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${style.badge}`}>
                  {car.status || "En cours"}
                </span>
              </div>

              {/* Séparateur */}
              <div className="border-t border-white/20 my-2" />

              {/* Ligne 2 : Travail */}
              <p className="text-white/90 text-sm leading-relaxed mb-1">{car.besoin}</p>

              {/* Date */}
              <p className="text-white/50 text-xs mb-4">Ajouté le {formatDate(car.createdAt)}</p>

              {/* Actions centrées */}
              <div className="flex gap-3 justify-center">
                <button
                  className="px-5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold transition active:scale-95"
                  onClick={() => onEdit(car)}
                >
                  ✏️ Modifier
                </button>
                <button
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition active:scale-95"
                  onClick={() => handleDelete(car._id)}
                >
                  🗑️ Supprimer
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EditCarForm({ car, onCancel, onSaved }) {
  const [form, setForm] = useState({ modele: car.modele, besoin: car.besoin });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await fetch(`${API_URL}/cars/${car._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...car, ...form }),
    });
    setLoading(false);
    onSaved();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Immat en lecture seule */}
      <div className="bg-gray-100 rounded-xl px-4 py-3 flex items-center gap-2">
        <span className="text-xs text-gray-400 uppercase font-semibold">Immat.</span>
        <span className="font-bold text-gray-700 tracking-wider">{car.immatriculation}</span>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">Modèle</label>
        <input
          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
          value={form.modele}
          required
          onChange={e => setForm({ ...form, modele: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">Travail à effectuer</label>
        <input
          className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
          value={form.besoin}
          required
          onChange={e => setForm({ ...form, besoin: e.target.value })}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-3 rounded-xl font-bold transition active:scale-95"
        >
          {loading ? "Enregistrement..." : "Enregistrer"}
        </button>
        <button
          type="button"
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-3 rounded-xl font-bold transition active:scale-95"
          onClick={onCancel}
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

export default function App() {
  const [page, setPage] = useState("form");
  const [form, setForm] = useState({ immatriculation: "", modele: "", besoin: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editCar, setEditCar] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${API_URL}/cars`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setForm({ immatriculation: "", modele: "", besoin: "" });
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      console.log("Erreur envoi:", err);
    } finally {
      setLoading(false);
    }
  };

  const activePage = editCar ? "edit" : page;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center px-4 py-6">

      {/* CARTE PRINCIPALE */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-5">

        {/* HEADER */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold">
            <span className="text-green-600">CLINICAR 77</span>
          </h1>
        </div>

        {/* NAVIGATION TABS */}
        {!editCar && (
          <div className="bg-gray-100 rounded-2xl p-1 flex mb-5">
            {[{ key: "form", label: "Ajouter" }, { key: "cars", label: "Véhicules" }].map(tab => (
              <button
                key={tab.key}
                onClick={() => setPage(tab.key)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
                  page === tab.key
                    ? "bg-green-600 text-white shadow"
                    : "text-gray-400 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Titre page edit */}
        {editCar && (
          <h2 className="text-lg font-bold text-green-600 mb-4 text-center">Modifier le véhicule</h2>
        )}

        {/* Formulaire ajout */}
        {activePage === "form" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-center text-gray-400 text-sm mb-2">Enregistrer un nouveau véhicule</p>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">Immatriculation</label>
              <input
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                placeholder="Ex : AB-123-CD"
                value={form.immatriculation}
                required
                onChange={e => setForm({ ...form, immatriculation: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">Modèle</label>
              <input
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                placeholder="Ex : Peugeot 208"
                value={form.modele}
                required
                onChange={e => setForm({ ...form, modele: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 ml-1">Travail à effectuer</label>
              <input
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                placeholder="Ex : vidange, freins..."
                value={form.besoin}
                required
                onChange={e => setForm({ ...form, besoin: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-3 rounded-xl font-bold transition active:scale-95"
            >
              {loading ? "Envoi en cours..." : "Enregistrer le véhicule"}
            </button>

            {sent && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm font-semibold text-center py-2.5 rounded-xl">
                ✅ Véhicule ajouté avec succès !
              </div>
            )}
          </form>
        )}

        {/* Liste */}
        {activePage === "cars" && (
          <CarsList onEdit={(car) => { setEditCar(car); }} />
        )}

        {/* Édition */}
        {activePage === "edit" && (
          <EditCarForm
            car={editCar}
            onCancel={() => { setEditCar(null); setPage("cars"); }}
            onSaved={() => { setEditCar(null); setPage("cars"); }}
          />
        )}
      </div>
    </div>
  );
}
