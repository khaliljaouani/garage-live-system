import { useState } from "react";

export default function App() {
  const [form, setForm] = useState({
    immatriculation: "",
    modele: "",
    besoin: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    await fetch("https://garMONGO_URIage-live-system-1.onrender.com/cars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    setForm({ immatriculation: "", modele: "", besoin: "" });
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">

      <div className="bg-white w-[400px] p-6 rounded-2xl shadow-2xl">

        <h1 className="text-2xl font-bold text-center mb-6">
          CLINICAR 77
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">

          <input
            className="w-full p-3 border rounded-lg"
            placeholder="Immatriculation"
            value={form.immatriculation}
            onChange={(e) =>
              setForm({ ...form, immatriculation: e.target.value })
            }
          />

          <input
            className="w-full p-3 border rounded-lg"
            placeholder="Modèle"
            value={form.modele}
            onChange={(e) =>
              setForm({ ...form, modele: e.target.value })
            }
          />

          <input
            className="w-full p-3 border rounded-lg"
            placeholder="Besoin"
            value={form.besoin}
            onChange={(e) =>
              setForm({ ...form, besoin: e.target.value })
            }
          />

          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-bold"
          >
            Envoyer
          </button>

        </form>
      </div>
    </div>
  );
}