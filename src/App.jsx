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

const styles = {
  page: {
    padding: 24,
    fontFamily: "Arial, sans-serif",
    background: "#f8f8fb",
    minHeight: "100vh",
    boxSizing: "border-box",
  },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 24,
  },
  title: {
    margin: 0,
    fontSize: 56,
    lineHeight: 1,
  },
  subtitle: {
    marginTop: 12,
    color: "#666",
    fontSize: 18,
  },
  actions: {
    display: "flex",
    gap: 10,
  },
  button: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #d0d0d7",
    background: "#fff",
    cursor: "pointer",
  },
  primaryButton: {
    padding: "12px 14px",
    borderRadius: 8,
    border: "1px solid #1677ff",
    background: "#1677ff",
    color: "#fff",
    cursor: "pointer",
    width: "100%",
    fontWeight: 600,
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "360px minmax(0, 1fr)",
    gap: 24,
    alignItems: "start",
  },
  card: {
    background: "#fff",
    border: "1px solid #e3e3ea",
    borderRadius: 12,
    padding: 16,
    boxSizing: "border-box",
    width: "100%",
  },
  sectionTitle: {
    textAlign: "center",
    margin: "0 0 16px 0",
    fontSize: 24,
  },
  form: {
    display: "grid",
    gap: 14,
  },
  field: {
    display: "grid",
    gap: 6,
    width: "100%",
    boxSizing: "border-box",
  },
  label: {
    textAlign: "center",
    fontSize: 18,
    color: "#666",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d8d8df",
    fontSize: 14,
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d8d8df",
    fontSize: 14,
    background: "#fff",
    boxSizing: "border-box",
  },
  search: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d8d8df",
    marginBottom: 16,
    boxSizing: "border-box",
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
  },
  thRight: {
    textAlign: "right",
    padding: "10px 12px",
    borderBottom: "1px solid #e5e5ee",
    color: "#666",
    fontSize: 16,
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  },
  tdRight: {
    textAlign: "right",
    padding: "10px 12px",
    borderBottom: "1px solid #f0f0f5",
    fontSize: 14,
    verticalAlign: "middle",
  },
  row: {
    cursor: "pointer",
  },
  ok: {
    color: "green",
    marginBottom: 12,
  },
  err: {
    color: "crimson",
    marginBottom: 12,
  },
};

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
    if (session) loadData();
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
    return <div style={styles.page}>Cargando...</div>;
  }

  if (!session) {
    return (
      <div style={styles.page}>
        <div style={{ maxWidth: 420, margin: "40px auto", ...styles.card }}>
          <h1 style={{ marginTop: 0 }}>Login</h1>
          <form onSubmit={signIn} style={styles.form}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
            <button type="submit" style={styles.primaryButton}>
              Entrar
            </button>
          </form>
          {error && <p style={styles.err}>{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <div>
          <h1 style={styles.title}>Inventario</h1>
          <div style={styles.subtitle}>Gestión básica conectada a Supabase</div>
        </div>

        <div style={styles.actions}>
          <button style={styles.button} onClick={loadData}>
            {loadingData ? "Recargando..." : "Recargar"}
          </button>
          <button style={styles.button} onClick={signOut}>
            Salir
          </button>
        </div>
      </div>

      {message && <div style={styles.ok}>{message}</div>}
      {error && <div style={styles.err}>{error}</div>}

      <div style={styles.layout}>
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Alta / edición</h2>

          <form onSubmit={upsertInventario} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Proveedor</label>
              <select
                value={inventarioForm.id_prov}
                onChange={(e) =>
                  setInventarioForm((f) => ({ ...f, id_prov: e.target.value }))
                }
                style={styles.select}
              >
                <option value="">Selecciona proveedor</option>
                {proveedores.map((p) => (
                  <option key={p.id_prov} value={p.id_prov}>
                    {p.nombre} ({p.id_prov})
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Ingrediente</label>
              <select
                value={inventarioForm.id_ing}
                onChange={(e) =>
                  setInventarioForm((f) => ({ ...f, id_ing: e.target.value }))
                }
                style={styles.select}
              >
                <option value="">Selecciona ingrediente</option>
                {ingredientes.map((i) => (
                  <option key={i.id_ing} value={i.id_ing}>
                    {i.nombre} ({i.id_ing})
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Inventario (kg)</label>
              <input
                value={inventarioForm.inv_kg}
                onChange={(e) =>
                  setInventarioForm((f) => ({ ...f, inv_kg: e.target.value }))
                }
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Precio €/kg</label>
              <input
                value={inventarioForm.eur_kg}
                onChange={(e) =>
                  setInventarioForm((f) => ({ ...f, eur_kg: e.target.value }))
                }
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Calidad</label>
              <input
                value={inventarioForm.calidad}
                onChange={(e) =>
                  setInventarioForm((f) => ({ ...f, calidad: e.target.value }))
                }
                style={styles.input}
              />
            </div>

            <button type="submit" style={styles.primaryButton}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </form>
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Inventario actual</h2>

          <input
            placeholder="Buscar por proveedor o ingrediente"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            style={styles.search}
          />

          <div style={styles.tableWrap}>
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
                {inventarioFiltrado.map((row) => (
                  <tr
                    key={`${row.id_prov}-${row.id_ing}`}
                    onClick={() => cargarFila(row)}
                    style={styles.row}
                  >
                    <td style={styles.td}>{row.Proveedores?.nombre ?? row.id_prov}</td>
                    <td style={styles.td}>{row.Ingredientes?.nombre ?? row.id_ing}</td>
                    <td style={styles.tdRight}>{row.inv_kg ?? "—"}</td>
                    <td style={styles.tdRight}>{row.eur_kg ?? "—"}</td>
                    <td style={styles.tdRight}>{row.calidad ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}