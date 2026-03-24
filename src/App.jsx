import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function numberOrNull(value) {
  if (!value) return null;
  const parsed = Number(String(value).replace(",", "."));
  return isNaN(parsed) ? null : parsed;
}

const styles = {
  page: {
    padding: 24,
    fontFamily: "Arial, sans-serif",
    background: "#f8f8fb",
    minHeight: "100vh",
  },

  layout: {
    display: "grid",
    gridTemplateColumns: "360px 1fr",
    gap: 24,
  },

  card: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: 10,
    padding: 16,
  },

  form: {
    display: "grid",
    gap: 12,
  },

  input: {
    width: "100%",
    padding: 10,
    borderRadius: 6,
    border: "1px solid #ccc",
    boxSizing: "border-box",
  },

  select: {
    width: "100%",
    padding: 10,
    borderRadius: 6,
    border: "1px solid #ccc",
    boxSizing: "border-box",
  },

  button: {
    padding: 12,
    background: "#1677ff",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
  },

  th: {
    textAlign: "left",
    padding: 10,
    borderBottom: "1px solid #ddd",
  },

  thRight: {
    textAlign: "right",
    padding: 10,
    borderBottom: "1px solid #ddd",
  },

  td: {
    textAlign: "left",
    padding: 10,
    borderBottom: "1px solid #eee",
  },

  tdRight: {
    textAlign: "right",
    padding: 10,
    borderBottom: "1px solid #eee",
  },

  row: {
    cursor: "pointer",
  },
};

export default function App() {
  const [session, setSession] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [proveedores, setProveedores] = useState([]);
  const [ingredientes, setIngredientes] = useState([]);
  const [inventario, setInventario] = useState([]);

  const [filtro, setFiltro] = useState("");

  const [form, setForm] = useState({
    id_prov: "",
    id_ing: "",
    inv_kg: "",
    eur_kg: "",
    calidad: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    supabase.auth.onAuthStateChange((_e, s) => setSession(s));
  }, []);

  useEffect(() => {
    if (session) loadData();
  }, [session]);

  async function loadData() {
    const [p, i, inv] = await Promise.all([
      supabase.from("Proveedores").select("*"),
      supabase.from("Ingredientes").select("*"),
      supabase.from("Inventario").select(`
        *,
        Proveedores(nombre),
        Ingredientes(nombre)
      `),
    ]);

    setProveedores(p.data || []);
    setIngredientes(i.data || []);
    setInventario(inv.data || []);
  }

  async function signIn(e) {
    e.preventDefault();
    await supabase.auth.signInWithPassword({ email, password });
  }

  async function save(e) {
    e.preventDefault();

    await supabase.from("Inventario").upsert(
      {
        id_prov: form.id_prov,
        id_ing: form.id_ing,
        inv_kg: numberOrNull(form.inv_kg),
        eur_kg: numberOrNull(form.eur_kg),
        calidad: numberOrNull(form.calidad),
      },
      { onConflict: "id_ing,id_prov" }
    );

    loadData();
  }

  const data = useMemo(() => {
    return inventario.filter((r) =>
      (r.Proveedores?.nombre || "").toLowerCase().includes(filtro.toLowerCase())
    );
  }, [inventario, filtro]);

  if (!session) {
    return (
      <form onSubmit={signIn} style={{ padding: 40 }}>
        <input
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          placeholder="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button>Login</button>
      </form>
    );
  }

  return (
    <div style={styles.page}>
      <h1>Inventario</h1>

      <div style={styles.layout}>
        <div style={styles.card}>
          <form onSubmit={save} style={styles.form}>
            <select
              style={styles.select}
              value={form.id_prov}
              onChange={(e) =>
                setForm({ ...form, id_prov: e.target.value })
              }
            >
              <option>Proveedor</option>
              {proveedores.map((p) => (
                <option key={p.id_prov} value={p.id_prov}>
                  {p.nombre}
                </option>
              ))}
            </select>

            <select
              style={styles.select}
              value={form.id_ing}
              onChange={(e) =>
                setForm({ ...form, id_ing: e.target.value })
              }
            >
              <option>Ingrediente</option>
              {ingredientes.map((i) => (
                <option key={i.id_ing} value={i.id_ing}>
                  {i.nombre}
                </option>
              ))}
            </select>

            <input
              style={styles.input}
              placeholder="Inventario kg"
              value={form.inv_kg}
              onChange={(e) =>
                setForm({ ...form, inv_kg: e.target.value })
              }
            />

            <input
              style={styles.input}
              placeholder="€/kg"
              value={form.eur_kg}
              onChange={(e) =>
                setForm({ ...form, eur_kg: e.target.value })
              }
            />

            <input
              style={styles.input}
              placeholder="Calidad"
              value={form.calidad}
              onChange={(e) =>
                setForm({ ...form, calidad: e.target.value })
              }
            />

            <button style={styles.button}>Guardar</button>
          </form>
        </div>

        <div style={styles.card}>
          <input
            placeholder="Buscar"
            style={styles.input}
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Proveedor</th>
                <th style={styles.th}>Ingrediente</th>
                <th style={styles.thRight}>Inventario (kg)</th>
                <th style={styles.thRight}>€/kg</th>
                <th style={styles.thRight}>Calidad</th>
              </tr>
            </thead>

            <tbody>
              {data.map((r) => (
                <tr key={r.id_prov + r.id_ing} style={styles.row}>
                  <td style={styles.td}>{r.Proveedores?.nombre}</td>
                  <td style={styles.td}>{r.Ingredientes?.nombre}</td>
                  <td style={styles.tdRight}>{r.inv_kg ?? "-"}</td>
                  <td style={styles.tdRight}>{r.eur_kg ?? "-"}</td>
                  <td style={styles.tdRight}>{r.calidad ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}