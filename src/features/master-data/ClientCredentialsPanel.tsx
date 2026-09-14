import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
type Credential = {
  id: string;
  platform_name: string;
  platform_url: string | null;
  username: string;
  password: string;
  version_count: number;
  updated_at: string;
};
type History = {
  version_id: string;
  password: string;
  valid_from: string;
  valid_until: string | null;
  changed_by: string;
};
const empty = () => ({
  id: "",
  platform_name: "",
  platform_url: "",
  username: "",
  password: "",
});
export function ClientCredentialsPanel({
  clientId,
  readOnly,
}: {
  clientId: string;
  readOnly: boolean;
}) {
  const [dirty,setDirty]=useState(false);
  const [items, setItems] = useState<Credential[]>([]),
    [editing, setEditing] = useState(empty),
    [open, setOpen] = useState(false),
    [history, setHistory] = useState<Record<string, History[]>>({}),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const result = await supabase.rpc("list_client_platform_credentials", {
      p_client_id: clientId,
    });
    if (result.error) {
      if (result.error.code !== "PGRST202") setError(result.error.message);
      setItems([]);
    } else setItems((result.data ?? []) as Credential[]);
    setLoading(false);
  }, [clientId]);
  useEffect(() => {
    void load();
  }, [load]);
  async function save() {
    if (!supabase) return;
    if(!editing.platform_name.trim()||!editing.password){setError("Indique o nome da plataforma e a palavra-passe.");return}
    if(editing.platform_url&&!/^https:\/\//i.test(editing.platform_url)){setError("A ligação da plataforma deve começar por https://.");return}
    setSaving(true);
    setError("");
    const result = await supabase.rpc("save_client_platform_credential", {
      p_client_id: clientId,
      p_credential_id: editing.id || null,
      p_platform_name: editing.platform_name,
      p_platform_url: editing.platform_url || null,
      p_username: editing.username,
      p_password: editing.password,
    });
    if (result.error) setError(result.error.message);
    else {
      setOpen(false);
      setEditing(empty());
      await load();
    }
    setSaving(false);
  }
  async function remove(item: Credential) {
    if (
      !supabase ||
      !window.confirm(
        `Eliminar a credencial de ${item.platform_name} e todo o seu histórico?`,
      )
    )
      return;
    const result = await supabase.rpc("delete_client_platform_credential", {
      p_credential_id: item.id,
    });
    if (result.error) setError(result.error.message);
    else await load();
  }
  async function toggleHistory(item: Credential) {
    if (history[item.id]) {
      setHistory((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      return;
    }
    if (!supabase) return;
    const result = await supabase.rpc(
      "list_client_platform_credential_history",
      { p_credential_id: item.id },
    );
    if (result.error) setError(result.error.message);
    else
      setHistory((current) => ({
        ...current,
        [item.id]: (result.data ?? []) as History[],
      }));
  }
  return (
    <section
      className="mt-6 rounded-xl border border-border p-4"
      aria-labelledby="credentials-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            id="credentials-title"
            className="font-display text-lg font-semibold"
          >
            Credenciais de plataformas
          </h3>
          <p className="mt-1 text-xs text-text-secondary">
            As palavras-passe ficam visíveis nesta ficha, cifradas na base de
            dados e com histórico de versões.
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => {
              setEditing(empty());
              setDirty(false);
              setOpen(true);
            }}
            className="min-h-10 rounded-lg bg-primary px-3 font-semibold text-surface"
          >
            Adicionar credencial
          </button>
        )}
      </div>
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-danger-soft p-3 text-sm text-danger"
        >
          {error}
        </p>
      )}
      {loading ? (
        <p role="status" className="mt-4">
          A carregar credenciais…
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-border bg-surface-subtle p-3"
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-xs font-semibold">
                  Plataforma
                  <input
                    readOnly
                    value={item.platform_name}
                    className="control mt-1 w-full px-3"
                  />
                </label>
                <label className="text-xs font-semibold">
                  Ligação
                  <input
                    readOnly
                    value={item.platform_url ?? ""}
                    className="control mt-1 w-full px-3"
                  />
                </label>
                <label className="text-xs font-semibold">
                  Utilizador
                  <input
                    readOnly
                    value={item.username}
                    className="control mt-1 w-full px-3"
                  />
                </label>
                <label className="text-xs font-semibold">
                  Palavra-passe
                  <input
                    readOnly
                    type="text"
                    value={item.password}
                    className="control mt-1 w-full px-3 font-mono"
                  />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => void toggleHistory(item)}
                  className="min-h-9 rounded-lg border border-border px-3 text-xs font-semibold text-primary"
                >
                  {history[item.id]
                    ? "Fechar histórico"
                    : `Histórico (${item.version_count})`}
                </button>
                {!readOnly && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing({
                          id: item.id,
                          platform_name: item.platform_name,
                          platform_url: item.platform_url ?? "",
                          username: item.username,
                          password: item.password,
                        });
                        setOpen(true);
                        setDirty(false);
                      }}
                      className="min-h-9 rounded-lg border border-border px-3 text-xs font-semibold text-primary"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(item)}
                      className="min-h-9 rounded-lg border border-danger/40 px-3 text-xs font-semibold text-danger"
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </div>
              {history[item.id] && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[34rem] text-xs">
                    <thead>
                      <tr>
                        <th className="p-2 text-left">
                          Palavra-passe utilizada
                        </th>
                        <th className="p-2 text-left">Desde</th>
                        <th className="p-2 text-left">Até</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history[item.id].map((version) => (
                        <tr key={version.version_id}>
                          <td className="border-t border-border p-2 font-mono">
                            {version.password}
                          </td>
                          <td className="border-t border-border p-2">
                            {new Date(version.valid_from).toLocaleString(
                              "pt-PT",
                            )}
                          </td>
                          <td className="border-t border-border p-2">
                            {version.valid_until
                              ? new Date(version.valid_until).toLocaleString(
                                  "pt-PT",
                                )
                              : "Actual"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          ))}
          {!items.length && (
            <p className="rounded-lg bg-surface-subtle p-4 text-sm text-text-secondary">
              Sem credenciais registadas.
            </p>
          )}
        </div>
      )}
      {open && (
        <div
          data-independent-form
          onChangeCapture={()=>setDirty(true)}
          className="mt-4 rounded-xl border border-primary/35 bg-primary/5 p-4"
        >
          <h4 className="font-semibold">
            {editing.id ? "Editar credencial" : "Nova credencial"}
          </h4>
          <button type="button" disabled={saving} onClick={()=>setOpen(false)} className="control mt-2 px-3">Fechar credencial</button>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Nome da plataforma
              <input
                maxLength={160}
                value={editing.platform_name}
                onChange={(event) =>
                  setEditing({ ...editing, platform_name: event.target.value })
                }
                placeholder="Autoridade Tributária"
                className="control mt-1 w-full px-3"
              />
            </label>
            <label className="text-sm font-semibold">
              Ligação da plataforma
              <input
                type="url"
                pattern="https://.*"
                value={editing.platform_url}
                onChange={(event) =>
                  setEditing({ ...editing, platform_url: event.target.value })
                }
                placeholder="https://…"
                className="control mt-1 w-full px-3"
              />
            </label>
            <label className="text-sm font-semibold">
              Username
              <input
                value={editing.username}
                onChange={(event) =>
                  setEditing({ ...editing, username: event.target.value })
                }
                className="control mt-1 w-full px-3"
              />
            </label>
            <label className="text-sm font-semibold">
              Palavra-passe
              <input
                type="text"
                value={editing.password}
                onChange={(event) =>
                  setEditing({ ...editing, password: event.target.value })
                }
                className="control mt-1 w-full px-3 font-mono"
              />
            </label>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setEditing(empty());
              }}
              disabled={saving||!dirty}
              className="record-cancel min-h-10 rounded-lg border px-3 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving||!dirty}
              className="record-save min-h-10 rounded-lg border px-3 font-semibold"
            >
              {saving ? "A guardar…" : "Guardar credencial"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
