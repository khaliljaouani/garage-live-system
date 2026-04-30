import { useState } from "react";

// ✅ URL du backend Railway — change cette valeur quand tu as ton URL Railway
const API_URL = import.meta.env.VITE_API_URL || "https://garage-live-system-1.onrender.com";

export default function App() {
  const [form, setForm] = useState({
    immatriculation: "",
    modele: "",
    besoin: "",
  });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-[420px] p-6 rounded-2xl shadow-2xl">

        <h1 className="text-2xl font-bold text-center mb-1">
          <span className="text-green-600">CLINICAR 77</span>
        </h1>
        <p className="text-center text-gray-400 text-sm mb-6">
          Ajouter un véhicule
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">

          <input
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Immatriculation"
            value={form.immatriculation}
            required
            onChange={(e) =>
              setForm({ ...form, immatriculation: e.target.value })
            }
          />

          <input
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Modèle"
            value={form.modele}
            required
            onChange={(e) => setForm({ ...form, modele: e.target.value })}
          />

          <input
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Besoin (ex: vidange, freins...)"
            value={form.besoin}
            required
            onChange={(e) => setForm({ ...form, besoin: e.target.value })}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white p-3 rounded-lg font-bold transition"
          >
            {loading ? "Envoi..." : "Envoyer"}
          </button>

          {sent && (
            <p className="text-center text-green-600 font-semibold">
              ✅ Véhicule ajouté avec succès !
            </p>
          )}

        </form>
      </div>
    </div>
  );
}
