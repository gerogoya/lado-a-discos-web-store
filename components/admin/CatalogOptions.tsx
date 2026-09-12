"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, Pencil, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { catalogKinds, catalogLabels, fieldLabels, normalizeOptionName, searchOptionName, type CatalogKind, type CatalogOption } from "@/types/catalog";
import { createCatalogOption, deleteCatalogOption, errorMessage, listCatalogOptions, updateCatalogOption } from "@/lib/supabase/catalog";

type Notify = (type: "success" | "error", title: string, message: string) => void;
type OptionDialog = { kind: CatalogKind; initialName?: string; option?: CatalogOption; onSelect?: (option: CatalogOption) => void };
type CatalogContext = {
  options: CatalogOption[];
  ready: boolean;
  open: (dialog: OptionDialog) => void;
  change: (option: CatalogOption, patch: Partial<Pick<CatalogOption, "active">>) => Promise<void>;
  remove: (option: CatalogOption) => Promise<void>;
};
const Context = createContext<CatalogContext | null>(null);
export function useCatalog() {
  const value = useContext(Context);
  if (!value) throw new Error("CatalogProvider is required");
  return value;
}

export function CatalogProvider({ children, notify }: { children: ReactNode; notify: Notify }) {
  const [options, setOptions] = useState<CatalogOption[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [dialog, setDialog] = useState<OptionDialog | null>(null);
  async function load() {
    setLoadError("");
    try { setOptions(await listCatalogOptions()); setReady(true); }
    catch (error) { setLoadError(errorMessage(error)); }
  }
  useEffect(() => { void load(); }, []);
  function remember(option: CatalogOption) {
    setOptions(current => [...current.filter(item => item.id !== option.id), option]);
  }
  async function change(option: CatalogOption, patch: Partial<Pick<CatalogOption, "active">>) {
    remember({ ...option, ...patch });
    try {
      remember(await updateCatalogOption(option.id, patch));
      notify("success", patch.active ? "Opción activada" : "Opción desactivada", option.name);
    } catch (error) { remember(option); notify("error", "No se pudo actualizar", errorMessage(error)); }
  }
  async function remove(option: CatalogOption) {
    if (!window.confirm(`¿Eliminar "${option.name}"? Si está en uso, solo se podrá desactivar.`)) return;
    try {
      await deleteCatalogOption(option.id);
      setOptions(current => current.filter(item => item.id !== option.id));
      notify("success", "Opción eliminada", option.name);
    } catch (error) { notify("error", "No se pudo eliminar", errorMessage(error)); }
  }
  return <Context.Provider value={{ options, ready, open: setDialog, change, remove }}>
    {!ready && <div className="admin-message" role={loadError ? "alert" : "status"}>
      {loadError || "Cargando opciones del catálogo…"}
      {loadError && <button type="button" className="secondary-action" onClick={load}><RefreshCw size={16} />Reintentar</button>}
    </div>}
    {children}
    {dialog && <OptionModal dialog={dialog} options={options} onClose={() => setDialog(null)} onSave={remember} notify={notify} />}
  </Context.Provider>;
}

function OptionModal({ dialog, options, onClose, onSave, notify }: {
  dialog: OptionDialog; options: CatalogOption[]; onClose: () => void; onSave: (option: CatalogOption) => void; notify: Notify;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(dialog.option?.name ?? dialog.initialName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const headingId = useId();
  useEffect(() => {
    const previousFocus = document.activeElement;
    ref.current?.showModal();
    return () => { if (previousFocus instanceof HTMLElement) previousFocus.focus(); };
  }, []);
  const duplicate = options.find(option => option.kind === dialog.kind && option.id !== dialog.option?.id && normalizeOptionName(option.name) === normalizeOptionName(name));
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving || duplicate) return;
    setSaving(true); setError("");
    try {
      const option = dialog.option
        ? await updateCatalogOption(dialog.option.id, { name: name.trim().replace(/\s+/g, " ") })
        : await createCatalogOption(dialog.kind, name);
      onSave(option);
      dialog.onSelect?.(option);
      notify("success", dialog.option ? "Opción actualizada" : "Opción agregada", option.name);
      onClose();
    } catch (cause) {
      const message = errorMessage(cause);
      setError(message); notify("error", "No se pudo guardar la opción", message);
    } finally { setSaving(false); }
  }
  return <dialog className="catalog-dialog" ref={ref} aria-labelledby={headingId} onCancel={event => {
    event.preventDefault(); if (!saving) onClose();
  }}>
    <form onSubmit={save}>
      <div className="catalog-dialog-heading">
        <h2 id={headingId}>{dialog.option ? "Editar" : "Agregar"}: {fieldLabels[dialog.kind]}</h2>
        <button className="catalog-icon" type="button" aria-label="Cerrar" title="Cerrar" disabled={saving} onClick={onClose}><X size={20} /></button>
      </div>
      <label className="admin-field"><span>Nombre</span><input autoFocus required maxLength={120} value={name} disabled={saving} onChange={event => setName(event.target.value)} /></label>
      {duplicate && <p role="status">Ya existe “{duplicate.name}”{!duplicate.active && " (desactivada)"}.</p>}
      {duplicate?.active && dialog.onSelect && <button className="secondary-action" type="button" onClick={() => { dialog.onSelect?.(duplicate); onClose(); }}><Check size={16} />Usar existente</button>}
      {dialog.option && <label className="catalog-confirm"><input type="checkbox" checked={confirmed} required onChange={event => setConfirmed(event.target.checked)} />Actualizar el nombre en todos los discos asociados.</label>}
      {error && <p className="admin-message error" role="alert">{error}</p>}
      <div className="catalog-dialog-actions">
        <button type="button" className="secondary-action" disabled={saving} onClick={onClose}>Cancelar</button>
        <button className="primary-action" disabled={saving || !name.trim() || !!duplicate || (!!dialog.option && !confirmed)}><Check size={16} />{saving ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  </dialog>;
}

export function CatalogReady({ children, busy = false }: { children: ReactNode; busy?: boolean }) {
  const { ready } = useCatalog();
  return <fieldset className="catalog-fieldset" disabled={!ready || busy}>{children}</fieldset>;
}

export function CatalogField({ kind, value, legacyName = "", onChange }: {
  kind: CatalogKind; value: string | null | undefined; legacyName?: string; onChange: (option: CatalogOption | null) => void;
}) {
  const { options, open, ready } = useCatalog();
  const id = useId();
  const selected = options.find(option => option.id === value);
  const choices = options.filter(option => option.kind === kind && (option.active || option.id === value))
    .sort((a,b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "es"));
  const searchable = ["artist", "country", "label"].includes(kind);
  return <div className="admin-field catalog-field">
    <div className="catalog-field-heading">
      <label htmlFor={id}>{fieldLabels[kind]}</label>
      <button type="button" className="catalog-add" disabled={!ready} onClick={() => open({ kind, onSelect: onChange })}><Plus size={14} />Agregar</button>
    </div>
    {searchable ? <Autocomplete id={id} choices={choices} selected={selected} onChange={onChange}
      onAdd={name => open({ kind, initialName: name, onSelect: onChange })} />
      : <select id={id} value={value ?? ""} onChange={event => onChange(choices.find(option => option.id === event.target.value) ?? null)}>
        <option value="">Seleccionar</option>
        {choices.map(option => <option key={option.id} value={option.id}>{option.name}{!option.active && " (desactivada)"}</option>)}
      </select>}
    {!value && legacyName && <small className="catalog-legacy">Valor anterior: {legacyName}</small>}
  </div>;
}

function Autocomplete({ id, choices, selected, onChange, onAdd }: {
  id: string; choices: CatalogOption[]; selected?: CatalogOption; onChange: (option: CatalogOption | null) => void; onAdd: (name: string) => void;
}) {
  const [query, setQuery] = useState(selected?.name ?? "");
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setQuery(selected?.name ?? ""); }, [selected?.id, selected?.name]);
  useEffect(() => {
    inputRef.current?.setCustomValidity(query !== (selected?.name ?? "") ? "Seleccioná una sugerencia o agregá la opción nueva." : "");
  }, [query, selected?.name]);
  const filtered = choices.filter(option => searchOptionName(option.name).includes(searchOptionName(query))).slice(0, 40);
  function choose(option: CatalogOption) { onChange(option); setQuery(option.name); setExpanded(false); }
  return <div className="catalog-combobox" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setExpanded(false);
    }
  }}>
    <div className="catalog-combobox-input">
      <input ref={inputRef} id={id} role="combobox" autoComplete="off" aria-autocomplete="list" aria-expanded={expanded}
        aria-controls={`${id}-list`} aria-activedescendant={expanded && active >= 0 && filtered[active] ? `${id}-${filtered[active].id}` : undefined}
        value={query} placeholder="Buscar o seleccionar" onFocus={() => { setExpanded(true); setActive(-1); }}
        onChange={event => { setQuery(event.target.value); setExpanded(true); setActive(-1); }}
        onKeyDown={event => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault(); setExpanded(true);
            setActive(current => Math.max(0, Math.min(filtered.length - 1, current + (event.key === "ArrowDown" ? 1 : -1))));
          } else if (event.key === "Enter" && expanded) {
            event.preventDefault();
            if (filtered[active]) choose(filtered[active]);
            else {
              const exact = filtered.find(option => normalizeOptionName(option.name) === normalizeOptionName(query));
              if (exact) choose(exact);
            }
          } else if (event.key === "Escape") {
            event.preventDefault(); setExpanded(false); setQuery(selected?.name ?? "");
          }
        }} />
      {selected && <button className="catalog-clear" type="button" aria-label="Limpiar selección" title="Limpiar selección" onClick={() => { onChange(null); setQuery(""); setExpanded(false); }}><X size={14} /></button>}
    </div>
    {expanded && <div className="catalog-suggestions">
      <ul id={`${id}-list`} role="listbox">
        {filtered.map((option, index) => <li id={`${id}-${option.id}`} key={option.id} role="option" aria-selected={selected?.id === option.id}
          className={active === index ? "highlighted" : ""} onMouseDown={event => event.preventDefault()} onClick={() => choose(option)}>
          {option.name}{!option.active && " (desactivada)"}
        </li>)}
      </ul>
      {!filtered.length && <p role="status">Sin coincidencias</p>}
      <button type="button" className="catalog-suggestion-add" onMouseDown={event => event.preventDefault()} onClick={() => { onAdd(query); setExpanded(false); }}><Plus size={14} />Agregar{query.trim() ? ` “${query.trim()}”` : " opción"}</button>
    </div>}
  </div>;
}

export function CatalogManager() {
  const { options, ready, open, change, remove } = useCatalog();
  const [kind, setKind] = useState<CatalogKind>("genre");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const filtered = options.filter(option => option.kind === kind && searchOptionName(option.name).includes(searchOptionName(query)))
    .sort((a,b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "es"));
  async function run(id: string, action: () => Promise<void>) {
    setPending(id); try { await action(); } finally { setPending(null); }
  }
  return <section className="catalog-manager" aria-label="Opciones del catálogo">
    <nav className="catalog-categories" aria-label="Tipo de opción">
      {catalogKinds.map(value => <button type="button" key={value} aria-pressed={kind === value} onClick={() => { setKind(value); setQuery(""); }}>{catalogLabels[value]}</button>)}
    </nav>
    <div className="catalog-toolbar">
      <h2>{catalogLabels[kind]}</h2>
      <label className="admin-search"><Search size={18} /><input aria-label="Buscar opciones" placeholder="Buscar opciones" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <button type="button" className="primary-action" disabled={!ready} onClick={() => open({ kind })}><Plus size={16} />Agregar</button>
    </div>
    <ul className="catalog-option-list">
      {filtered.map(option => <li key={option.id}>
        <span className="catalog-option-name">{option.name}</span>
        <label className="catalog-active"><input type="checkbox" checked={option.active} disabled={pending !== null} onChange={event => void run(option.id, () => change(option, { active: event.target.checked }))} />{option.active ? "Activa" : "Desactivada"}</label>
        <button type="button" className="catalog-icon" disabled={pending !== null} aria-label={`Editar ${option.name}`} title="Editar nombre" onClick={() => open({ kind, option })}><Pencil size={17} /></button>
        <button type="button" className="catalog-icon danger" disabled={pending !== null} aria-label={`Eliminar ${option.name}`} title="Eliminar opción" onClick={() => void run(option.id, () => remove(option))}><Trash2 size={17} /></button>
      </li>)}
    </ul>
    {!filtered.length && ready && <p role="status">No hay opciones{query && " que coincidan con la búsqueda"}.</p>}
  </section>;
}
