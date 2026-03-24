import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function numberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const normalized = String(value).replace(",", ".");
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [proveedores, setProveedores] = useState([]);
  const [ingredientes, setIngredientes] = useState([]);
  const [inventario, setInventario] = useState([]);

  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filtro, setFiltro] = useState("");

  const [inventarioForm, setInventarioForm] = useState({
    id_prov: "",
    id_ing: "",
    inv_kg: "",
    eur_kg: "",
    calidad: "",
  });

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
      setLoadingAuth(false);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session]);

  async function loadData() {
    setLoadingData(true);
    setError("");

    try {
      const [provRes, ingRes, invRes] = await Promise.all([
        supabase.from("Proveedores").select("id_prov, nombre").order("id_prov"),
        supabase
          .from("Ingredientes")
          .select("id_ing, nombre, congelado, tipo, magro_mj, peso_calidad")
          .order("id_ing"),
        supabase
          .from("Inventario")
          .select(`
            id_prov,
            id_ing,
            eur_kg,
            calidad,
            inv_kg,
            Proveedores ( nombre ),
            Ingredientes ( nombre )
          `),
      ]);

      const firstError = [provRes, ingRes, invRes].find((r) => r.error)?.error;
      if (firstError) throw firstError;

      setProveedores(provRes.data ?? []);
      setIngredientes(ingRes.data ?? []);
      setInventario(invRes.data ?? []);
    } catch (err) {
      setError(err.message || "Error cargando datos.");
    } finally {
      setLoadingData(false);
    }
  }

  async function signIn(e) {
    e.preventDefault();
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) setError(error.message);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function upsertInventario(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (!inventarioForm.id_prov || !inventarioForm.id_ing) {
        throw new Error("Selecciona proveedor e ingrediente.");
      }

      const payload = {
        id_prov: inventarioForm.id_prov,
        id_ing: inventarioForm.id_ing,
        inv_kg: numberOrNull(inventarioForm.inv_kg),
        eur_kg: numberOrNull(inventarioForm.eur_kg),
        calidad: numberOrNull(inventarioForm.calidad),
      };

      const { error } = await supabase
        .from("Inventario")
        .upsert(payload, { onConflict: "id_ing,id_prov" });

      if (error) throw error;

      setInventarioForm({
        id_prov: "",
        id_ing: "",
        inv_kg: "",
        eur_kg: "",
        calidad: "",
      });

      setMessage("Inventario guardado correctamente.");
      await loadData();
    } catch (err) {
      setError(err.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  function cargarFila(row) {
    setInventarioForm({
      id_prov: row.id_prov,
      id_ing: row.id_ing,
      inv_kg: row.inv_kg ?? "",
      eur_kg: row.eur_kg ?? "",
      calidad: row.calidad ?? "",
    });
    setMessage("Fila cargada para editar.");
  }

  const inventarioFiltrado = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return inventario;

    return inventario.filter((row) => {
      const proveedor = row.Proveedores?.nombre?.toLowerCase() ?? "";
      const ingrediente = row.Ingredientes?.nombre?.toLowerCase() ?? "";
      return (
        proveedor.includes(q) ||
        ingrediente.includes(q) ||
        row.id_prov.toLowerCase().includes(q) ||
        row.id_ing.toLowerCase().includes(q)
      );
    });
  }, [inventario, filtro]);

  if (loadingAuth) {
    return <div style={{ padding: 24 }}>Cargando...</div>;
  }

  if (!session) {
    return (
      <div style={{ maxWidth: 420, margin: "40px auto", fontFamily: "sans-serif" }}>
        <h1>Login</h1>
        <form onSubmit={signIn} style={{ display: "grid", gap: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: 10 }}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: 10 }}
          />
          <button type="submit" style={{ padding: 10 }}>
            Entrar
          </button>
        </form>
        {error && <p style={{ color: "red" }}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1>Inventario</h1>
          <p>Gestión básica conectada a Supabase</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={loadData}>{loadingData ? "Recargando..." : "Recargar"}</button>
          <button onClick={signOut}>Salir</button>
        </div>
      </div>

      {message && <p style={{ color: "green" }}>{message}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "360px 1fr",
          gap: 24,
          alignItems: "start",
        }}
      >
        <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8 }}>
          <h2>Alta / edición</h2>

          <form onSubmit={upsertInventario} style={{ display: "grid", gap: 12 }}>
            <div>
              <label>Proveedor</label>
              <select
                value={inventarioForm.id_prov}
                onChange={(e) =>
                  setInventarioForm((f) => ({ ...f, id_prov: e.target.value }))
                }
                style={{ width: "100%", padding: 10, marginTop: 4 }}
              >
                <option value="">Selecciona proveedor</option>
                {proveedores.map((p) => (
                  <option key={p.id_prov} value={p.id_prov}>
                    {p.nombre} ({p.id_prov})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Ingrediente</label>
              <select
                value={inventarioForm.id_ing}
                onChange={(e) =>
                  setInventarioForm((f) => ({ ...f, id_ing: e.target.value }))
                }
                style={{ width: "100%", padding: 10, marginTop: 4 }}
              >
                <option value="">Selecciona ingrediente</option>
                {ingredientes.map((i) => (
                  <option key={i.id_ing} value={i.id_ing}>
                    {i.nombre} ({i.id_ing})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Inventario (kg)</label>
              <input
                value={inventarioForm.inv_kg}
                onChange={(e) =>
                  setInventarioForm((f) => ({ ...f, inv_kg: e.target.value }))
                }
                style={{ width: "100%", padding: 10, marginTop: 4 }}
              />
            </div>

            <div>
              <label>Precio €/kg</label>
              <input
                value={inventarioForm.eur_kg}
                onChange={(e) =>
                  setInventarioForm((f) => ({ ...f, eur_kg: e.target.value }))
                }
                style={{ width: "100%", padding: 10, marginTop: 4 }}
              />
            </div>

            <div>
              <label>Calidad</label>
              <input
                value={inventarioForm.calidad}
                onChange={(e) =>
                  setInventarioForm((f) => ({ ...f, calidad: e.target.value }))
                }
                style={{ width: "100%", padding: 10, marginTop: 4 }}
              />
            </div>

            <button type="submit" style={{ padding: 12 }}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </form>
        </div>

        <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8 }}>
          <h2>Inventario actual</h2>

          <input
            placeholder="Buscar por proveedor o ingrediente"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            style={{ width: "100%", padding: 10, margin: "12px 0 16px" }}
          />

          <table width="100%" cellPadding="10" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #ddd", textAlign: "left" }}>
                <th>Proveedor</th>
                <th>Ingrediente</th>
                <th>Inventario (kg)</th>
                <th>€/kg</th>
                <th>Calidad</th>
              </tr>
            </thead>
            <tbody>
              {inventarioFiltrado.map((row) => (
                <tr
                  key={`${row.id_prov}-${row.id_ing}`}
                  onClick={() => cargarFila(row)}
                  style={{ borderBottom: "1px solid #eee", cursor: "pointer" }}
                >
                  <td>{row.Proveedores?.nombre ?? row.id_prov}</td>
                  <td>{row.Ingredientes?.nombre ?? row.id_ing}</td>
                  <td>{row.inv_kg ?? "—"}</td>
                  <td>{row.eur_kg ?? "—"}</td>
                  <td>{row.calidad ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}