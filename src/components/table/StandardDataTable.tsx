import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../features/auth/AuthContext";

type Scalar = string | number | boolean | Date | null | undefined;
type FilterValue = {
  text?: string;
  min?: string;
  max?: string;
  selected?: string[];
};
type SortRule = { id: string; direction: "asc" | "desc" };
export type TableColumn<Row> = {
  id: string;
  label: string;
  value: (row: Row) => Scalar;
  render?: (row: Row) => ReactNode;
  kind?: "text" | "number" | "date" | "money" | "boolean";
  filterOptions?: Array<{ value: string; label: string }>;
  suggestOptions?: boolean;
  textSuggestions?: string[];
  filterValues?: (row: Row) => string[];
  essential?: boolean;
  sticky?: boolean;
  align?: "left" | "center" | "right";
  width?: number;
  sortable?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
};
type Props<Row> = {
  id: string;
  label: string;
  rows: Row[];
  columns: TableColumn<Row>[];
  rowKey: (row: Row) => string;
  loading?: boolean;
  updating?: boolean;
  error?: string;
  onRetry?: () => void;
  defaultPageSize?: 10 | 20 | 50 | 100 | "all";
  selected?: string[];
  onSelectionChange?: (ids: string[]) => void;
  emptyMessage?: string;
  loadExportRows?: () => Promise<Row[]>;
  loadAllRows?: (onProgress?: (loaded: number, total: number) => void) => Promise<Row[]>;
  totalRows?: number;
  universeKey?: string;
  onRowDoubleClick?: (row: Row) => void;
  stickyHeaderOffset?: number;
  showSearch?: boolean;
  resultNoun?: string;
};

const fold = (value: Scalar) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT");
const numeric = (value: Scalar) =>
  value instanceof Date ? value.valueOf() : Number(value);
const comparable = (value: Scalar, kind: TableColumn<unknown>["kind"]) =>
  kind === "date"
    ? new Date(String(value)).valueOf()
    : kind === "number" || kind === "money"
      ? numeric(value)
      : kind === "boolean"
        ? Number(Boolean(value))
        : fold(value);
const safeSpreadsheetValue = (value: Scalar) =>
  typeof value === "string" && /^[=+\-@]/.test(value)
    ? `'${value}`
    : (value ?? "");
const spreadsheetValue = (
  value: Scalar,
  kind: TableColumn<unknown>["kind"],
) => {
  if (value == null) return "";
  if (kind === "date") {
    const parsed = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(parsed.valueOf())
      ? safeSpreadsheetValue(value)
      : parsed;
  }
  if (kind === "number" || kind === "money") return Number(value);
  if (kind === "boolean") return Boolean(value);
  return safeSpreadsheetValue(value);
};
const hasFilterValue = (value?: FilterValue) =>
  Boolean(
    value?.text || value?.min || value?.max || value?.selected !== undefined,
  );
const cyclePanelFocus = (event: ReactKeyboardEvent<HTMLElement>) => {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  const controls = [
    ...event.currentTarget.querySelectorAll<HTMLElement>(
      "button:not(:disabled),input:not(:disabled),select:not(:disabled)",
    ),
  ];
  if (!controls.length) return;
  const current = controls.indexOf(document.activeElement as HTMLElement),
    step = event.key === "ArrowDown" ? 1 : -1,
    next =
      current < 0 ? 0 : (current + step + controls.length) % controls.length;
  event.preventDefault();
  controls[next].focus();
};

function matchesFilter<Row>(
  row: Row,
  column: TableColumn<Row>,
  filter: FilterValue,
) {
  const value = column.value(row);
  if (filter.text && !fold(value).includes(fold(filter.text))) return false;
  if (filter.selected !== undefined) {
    const values = column.filterValues?.(row) ?? [String(value)];
    if (!values.some((candidate) => filter.selected!.includes(candidate))) return false;
  }
  if (filter.min) {
    const candidate =
      column.kind === "date"
        ? new Date(String(value)).valueOf()
        : numeric(value);
    const minimum =
      column.kind === "date"
        ? new Date(filter.min).valueOf()
        : Number(filter.min);
    if (!Number.isFinite(candidate) || candidate < minimum) return false;
  }
  if (filter.max) {
    const candidate =
      column.kind === "date"
        ? new Date(String(value)).valueOf()
        : numeric(value);
    const maximum =
      column.kind === "date"
        ? new Date(filter.max).valueOf()
        : Number(filter.max);
    if (!Number.isFinite(candidate) || candidate > maximum) return false;
  }
  return true;
}

function FilterPanel<Row>({
  column,
  anchor,
  value,
  onChange,
  onClose,
}: {
  column: TableColumn<Row>;
  anchor: HTMLElement | null;
  value: FilterValue;
  onChange: (next: FilterValue) => void;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [optionQuery, setOptionQuery] = useState("");
  const [style, setStyle] = useState<CSSProperties>({ visibility: "hidden" });
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>("input,button")?.focus();
  }, []);
  useLayoutEffect(() => {
    const update = () => {
      if (!anchor || !panel.current) return;
      const rect = anchor.getBoundingClientRect(),
        panelRect = panel.current.getBoundingClientRect(),
        margin = 8;
      const width = Math.min(256, window.innerWidth - margin * 2),
        height = Math.min(
          panelRect.height || 320,
          window.innerHeight - margin * 2,
        );
      const left = Math.max(
        margin,
        Math.min(rect.left, window.innerWidth - width - margin),
      );
      const below = window.innerHeight - rect.bottom >= height + margin;
      const top = below
        ? Math.min(rect.bottom + 6, window.innerHeight - height - margin)
        : Math.max(margin, rect.top - height - 6);
      setStyle({ left, top, width, visibility: "visible" });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchor]);
  const options =
    column.filterOptions ??
    (column.kind === "boolean"
      ? [
          { value: "true", label: "Sim" },
          { value: "false", label: "Não" },
        ]
      : undefined);
  const visibleOptions =
    options?.filter((option) =>
      fold(option.label).includes(fold(optionQuery)),
    ) ?? [];
  const typed=fold(value.text??""),textSuggestions=typed.length<2?[]:(column.textSuggestions??[]).filter(item=>fold(item).includes(typed)).slice(0,10);
  const selected = value.selected ?? options?.map((item) => item.value) ?? [];
  const normalizedSelection=(next:string[])=>options&&next.length===options.length&&options.every(option=>next.includes(option.value))?undefined:next;
  const selectVisible = () => {
    const next=[...new Set([...selected,...visibleOptions.map(item=>item.value)])];
    onChange({...value,selected:normalizedSelection(next)});
  };
  const clearAll = () =>
    onChange({
      ...value,
      selected: [],
    });
  const invertVisible = () =>
    onChange({
      ...value,
      selected: [
        ...selected.filter(
          (item) => !visibleOptions.some((option) => option.value === item),
        ),
        ...visibleOptions
          .filter((option) => !selected.includes(option.value))
          .map((option) => option.value),
      ],
    });
  return createPortal(
    <div
      ref={panel}
      data-filter-panel={column.id}
      role="dialog"
      aria-label={`Filtro ${column.label}`}
      style={style}
      className="fixed z-[120] max-h-[calc(100dvh-1rem)] overflow-auto rounded-xl border border-border bg-surface p-3 shadow-raised"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        } else cyclePanelFocus(event);
      }}
    >
      {options ? (
        <>
          <p className="mb-2 text-xs text-text-secondary">
            {selected.length} opções seleccionadas
          </p>
          {options.length > 6 && (
            <label className="block text-xs font-semibold">
              Pesquisar opções
              <input
                value={optionQuery}
                onChange={(event) => setOptionQuery(event.target.value)}
                className="control mt-1 w-full px-2"
              />
            </label>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              className="min-h-8 rounded-md border border-primary px-2 font-semibold text-primary"
              onClick={selectVisible}
            >
              {optionQuery ? "Todos os encontrados" : "Todos"}
            </button>
            <button
              type="button"
              className="min-h-8 rounded-md border border-border px-2 font-semibold text-secondary"
              onClick={clearAll}
            >
              Limpar
            </button>
            <button
              type="button"
              className="col-span-2 min-h-7 font-semibold text-secondary"
              onClick={invertVisible}
            >
              Inverter
            </button>
          </div>
          <div className="scrollbar-thin mt-2 max-h-[min(26.25rem,calc(100dvh-12rem))] overflow-y-auto overscroll-contain pr-1">
            {visibleOptions.map((option) => (
              <label
                key={option.value}
                className="flex h-7 items-center gap-2 border-b border-border/60 px-1 text-xs last:border-b-0 hover:bg-surface-subtle"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option.value)}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      selected: normalizedSelection(event.target.checked
                        ? [...new Set([...selected, option.value])]
                        : selected.filter((item) => item !== option.value)),
                    })
                  }
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          {!visibleOptions.length && (
            <p className="py-3 text-xs text-text-secondary">
              Nenhuma opção encontrada.
            </p>
          )}
        </>
      ) : column.kind === "number" ||
        column.kind === "money" ||
        column.kind === "date" ? (
        <div className="grid gap-3">
          <label className="text-xs font-semibold">
            Mínimo / início
            <input
              type={column.kind === "date" ? "date" : "number"}
              value={value.min ?? ""}
              onChange={(event) =>
                onChange({ ...value, min: event.target.value })
              }
              className="control mt-1 w-full px-2"
            />
          </label>
          <label className="text-xs font-semibold">
            Máximo / fim
            <input
              type={column.kind === "date" ? "date" : "number"}
              value={value.max ?? ""}
              onChange={(event) =>
                onChange({ ...value, max: event.target.value })
              }
              className="control mt-1 w-full px-2"
            />
          </label>
        </div>
      ) : (
        <div><label className="text-xs font-semibold">
          Texto
          <input
            value={value.text ?? ""}
            onChange={(event) =>
              onChange({ ...value, text: event.target.value })
            }
            className="control mt-1 w-full px-2"
            placeholder="Filtrar…"
          />
        </label>{typed.length>=2&&<div className="scrollbar-thin mt-2 max-h-[26.25rem] overflow-y-auto rounded-lg border border-border bg-background"><p className="px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-text-secondary">Sugestões</p>{textSuggestions.map(suggestion=><button key={suggestion} type="button" onClick={()=>onChange({...value,text:suggestion})} className="block h-7 w-full truncate border-b border-border px-2 text-left text-xs text-text-primary last:border-b-0 hover:bg-secondary-soft" title={suggestion}>{suggestion}</button>)}{!textSuggestions.length&&<p className="p-2 text-xs text-text-secondary">Sem sugestões. O texto livre continua válido.</p>}</div>}</div>
      )}
      <div className="mt-3 flex justify-between">
        <button
          type="button"
          onClick={() => onChange({})}
          className="min-h-11 text-xs font-semibold text-secondary"
        >
          Limpar filtro
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 text-xs font-semibold text-primary"
        >
          Concluir
        </button>
      </div>
    </div>,
    document.body,
  );
}

export function StandardDataTable<Row>({
  id,
  label,
  rows,
  columns,
  rowKey,
  loading = false,
  updating = false,
  error,
  onRetry,
  defaultPageSize = 20,
  selected = [],
  onSelectionChange,
  emptyMessage = "Não existem dados.",
  loadExportRows,
  loadAllRows,
  totalRows,
  universeKey = "",
  onRowDoubleClick,
  stickyHeaderOffset = 104,
  showSearch = true,
  resultNoun = "resultados",
}: Props<Row>) {
  const { user } = useAuth();
  const legacyStorageKey = `carina.table.${id}`;
  const storageKey = `carina.table.${user?.id ?? "anonymous"}.${id}`;
  const saved = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) ?? localStorage.getItem(legacyStorageKey) ?? "{}");
    } catch {
      return {};
    }
  }, [legacyStorageKey, storageKey]);
  const [query, setQuery] = useState("");
  const [sorts, setSorts] = useState<SortRule[]>([]);
  const [hidden, setHidden] = useState<string[]>(saved.hidden ?? []);
  const [filters, setFilters] = useState<Record<string, FilterValue>>({});
  const [order, setOrder] = useState<string[]>(()=>{
    const source=columns.map(column=>column.id),stored=Array.isArray(saved.order)?saved.order.filter((id:unknown):id is string=>typeof id==='string'&&source.includes(id)):[];
    if(!stored.length)return source;
    const merged=[...stored];
    for(let index=0;index<source.length;index++){const id=source[index];if(merged.includes(id))continue;const previous=source.slice(0,index).reverse().find(candidate=>merged.includes(candidate));const next=source.slice(index+1).find(candidate=>merged.includes(candidate));if(previous)merged.splice(merged.indexOf(previous)+1,0,id);else if(next)merged.splice(merged.indexOf(next),0,id);else merged.push(id)}
    return merged;
  });
  const [widths, setWidths] = useState<Record<string, number>>(
    saved.widths ?? {},
  );
  const [pageSize, setPageSize] = useState<10 | 20 | 50 | 100 | "all">(
    saved.pageSize === "all" ? defaultPageSize : (saved.pageSize ?? defaultPageSize),
  );
  const [page, setPage] = useState(1);
  const [columnsOpen, setColumnsOpen] = useState(false),
    [openFilter, setOpenFilter] = useState<string | null>(null);
  const [activeRow, setActiveRow] = useState<string | null>(null);
  const [virtualStart,setVirtualStart]=useState(0);
  const [exporting, setExporting] = useState(false),
    [exportStatus, setExportStatus] = useState("");
  const [universeRows, setUniverseRows] = useState<Row[] | null>(null),
    [universeRequested, setUniverseRequested] = useState(false),
    [universeLoading, setUniverseLoading] = useState(false),
    [universeError, setUniverseError] = useState(""),
    [universeProgress,setUniverseProgress]=useState<{loaded:number;total:number}|null>(null);
  const [columnsStyle, setColumnsStyle] = useState<CSSProperties>({
    visibility: "hidden",
  });
  const columnsButton = useRef<HTMLButtonElement>(null),
    columnsPanel = useRef<HTMLDivElement>(null),
    toolsElement = useRef<HTMLDivElement>(null),
    scrollContainer = useRef<HTMLDivElement>(null),
    tableElement = useRef<HTMLTableElement>(null),
    headerElement = useRef<HTMLTableSectionElement>(null),
    filterButtons = useRef<Record<string, HTMLButtonElement | null>>({}),
    draggedColumn = useRef<string | null>(null);
  const ordered = [...columns].sort((a, b) => {
    const ai = order.indexOf(a.id),
      bi = order.indexOf(b.id);
    return (ai < 0 ? columns.length : ai) - (bi < 0 ? columns.length : bi);
  });
  const visible = ordered.filter(
    (column) => column.essential || !hidden.includes(column.id),
  );
  const optionsFor = (column: TableColumn<Row>): TableColumn<Row> => {
    if(column.filterOptions||column.kind==="boolean"||column.kind==="number"||column.kind==="money"||column.kind==="date")return column;
    const values = new Map<string,string>();
    for (const row of sourceRows) {
      const candidates=column.filterValues?.(row)??[String(column.value(row)??"")];
      for(const candidate of candidates){const value=String(candidate??"");values.set(value,value||"Sem preenchimento")}
    }
    if(column.suggestOptions===false||(column.suggestOptions!==true&&values.size>500))return {...column,textSuggestions:[...values.values()]};
    return {...column,filterOptions:[...values.entries()].map(([value,label])=>({value,label})).sort((left,right)=>left.label.localeCompare(right.label,"pt-PT"))};
  };
  const hasFilter = (id: string) => {
    const value=filters[id],column=columns.find(item=>item.id===id);
    if(!value)return false;
    if(value.selected!==undefined&&column){
      const effective=optionsFor(column),options=effective.filterOptions??(effective.kind==="boolean"?[{value:"true"},{value:"false"}]:undefined);
      if(options&&value.selected.length===options.length&&options.every(option=>value.selected!.includes(option.value)))return false;
    }
    return hasFilterValue(value);
  };
  const stickyOffset = (index: number) => {
    let left = 0;
    for (let cursor = 0; cursor < index; cursor += 1) {
      const column = visible[cursor];
      if (column.sticky)
        left += widths[column.id] ?? column.width ?? 160;
    }
    return left;
  };
  const sourceRows = universeRows ?? rows;
  const reportedTotal = universeRows ? sourceRows.length : (totalRows ?? sourceRows.length);
  const processed = useMemo(() => {
    const words = fold(query).split(/\s+/).filter(Boolean);
    const result = sourceRows.filter(
      (row) =>
        words.every((word) =>
          columns.some(
            (column) =>
              (column.searchable ?? column.exportable !== false) &&
              fold(column.value(row)).includes(word),
          ),
        ) &&
        columns.every(
          (column) =>
            !hasFilterValue(filters[column.id]) ||
            matchesFilter(row, column, filters[column.id]),
        ),
    );
    if (sorts.length)
      result.sort((a, b) => {
        for (const sort of sorts) {
          const column = columns.find((item) => item.id === sort.id);
          if (!column) continue;
          const av = comparable(column.value(a), column.kind),
            bv = comparable(column.value(b), column.kind),
            direction = av < bv ? -1 : av > bv ? 1 : 0;
          if (direction)
            return sort.direction === "asc" ? direction : -direction;
        }
        return 0;
      });
    return result;
  }, [sourceRows, columns, query, filters, sorts]);
  const hasLocalFilters = Boolean(query.trim()) || columns.some((column) => hasFilter(column.id));
  const resultTotal = universeRows || hasLocalFilters ? processed.length : reportedTotal;
  const pageCount =
      pageSize === "all"
        ? 1
        : Math.max(1, Math.ceil(resultTotal / pageSize)),
    validPage = Math.min(page, pageCount);
  const shown =
    pageSize === "all"
      ? processed
      : processed.slice((validPage - 1) * pageSize, validPage * pageSize);
  const virtualized=pageSize==="all"&&shown.length>250,
    virtualCount=40,
    rendered=virtualized?shown.slice(virtualStart,Math.min(shown.length,virtualStart+virtualCount)):shown,
    virtualTop=virtualized?virtualStart*34:0,
    virtualBottom=virtualized?Math.max(0,(shown.length-virtualStart-rendered.length)*34):0;
  useEffect(()=>{setVirtualStart(0)},[pageSize,query,filters,sorts,universeKey]);
  useEffect(()=>{
    if(!virtualized)return;
    const updateVirtualWindow=()=>{
      const container=scrollContainer.current;if(!container)return;
      const documentTop=container.getBoundingClientRect().top+window.scrollY;
      const relativeTop=Math.max(0,window.scrollY-documentTop);
      setVirtualStart(Math.max(0,Math.min(shown.length-virtualCount,Math.floor(relativeTop/34)-8)));
    };
    updateVirtualWindow();
    window.addEventListener("scroll",updateVirtualWindow,{passive:true});
    window.addEventListener("resize",updateVirtualWindow);
    return()=>{window.removeEventListener("scroll",updateVirtualWindow);window.removeEventListener("resize",updateVirtualWindow)};
  },[virtualized,shown.length]);
  useEffect(() => {
    const header=headerElement.current,table=tableElement.current,tools=toolsElement.current,scroller=scrollContainer.current;
    if(!header||!table||!tools||!scroller)return;
    const stickyHeaderCells=[...header.querySelectorAll<HTMLElement>('[data-sticky-column="true"]')];
    let fixed=false;
    const reset=()=>{
      fixed=false;
      header.style.position="";
      header.style.top="";
      header.style.left="";
      header.style.width="";
      header.style.transform="";
      header.style.clipPath="";
      table.style.paddingTop="";
      for(const cell of stickyHeaderCells)cell.style.left=`${cell.dataset.stickyOffset??0}px`;
    };
    const update=()=>{
      const tableRect=table.getBoundingClientRect(),headerHeight=header.offsetHeight;
      const targetTop=tools.getBoundingClientRect().bottom;
      const shouldFix=window.innerWidth>=768&&tableRect.top<=targetTop&&tableRect.bottom>targetTop+headerHeight;
      if(!shouldFix){if(fixed)reset();return}
      if(!fixed){
        fixed=true;
        table.style.paddingTop=`${headerHeight}px`;
        header.style.position="fixed";
        header.style.transform="none";
      }
      const scrollerRect=scroller.getBoundingClientRect();
      const hiddenRight=Math.max(0,tableRect.width-scroller.scrollLeft-scrollerRect.width);
      header.style.top=`${targetTop}px`;
      header.style.left=`${scrollerRect.left-scroller.scrollLeft}px`;
      header.style.width=`${tableRect.width}px`;
      header.style.clipPath=`inset(0 ${hiddenRight}px 0 ${scroller.scrollLeft}px)`;
      for(const cell of stickyHeaderCells)cell.style.left=`${scrollerRect.left+Number(cell.dataset.stickyOffset??0)}px`;
    };
    update();
    window.addEventListener("scroll",update,{passive:true});
    window.addEventListener("resize",update);
    scroller.addEventListener("scroll",update,{passive:true});
    return()=>{
      window.removeEventListener("scroll",update);
      window.removeEventListener("resize",update);
      scroller.removeEventListener("scroll",update);
      reset();
    };
  },[stickyHeaderOffset,shown.length]);
  useEffect(() => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        hidden,
        pageSize: pageSize === "all" ? defaultPageSize : pageSize,
        order,
        widths,
      }),
    );
  }, [
    storageKey,
    hidden,
    pageSize,
    order,
    widths,
    defaultPageSize,
  ]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);
  useEffect(() => {
    let active = true;
    if (!loadAllRows || !universeRequested) {
      setUniverseRows(null);
      setUniverseLoading(false);
      setUniverseError("");
      return;
    }
    setUniverseRows(null);
    setUniverseLoading(true);
    setUniverseProgress(null);
    setUniverseError("");
    void loadAllRows((loaded,total)=>{if(active)setUniverseProgress({loaded,total})})
      .then((result) => {
        if (active) setUniverseRows(result);
      })
      .catch((reason) => {
        if (active)
          setUniverseError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar todos os resultados.",
          );
      })
      .finally(() => {
        if (active) setUniverseLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadAllRows, universeKey, universeRequested]);
  useEffect(() => {
    if (!columnsOpen) return;
    const outside = (event: MouseEvent) => {
      if (
        !columnsPanel.current?.contains(event.target as Node) &&
        !columnsButton.current?.contains(event.target as Node)
      ) {
        setColumnsOpen(false);
        columnsButton.current?.focus();
      }
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setColumnsOpen(false);
        columnsButton.current?.focus();
      }
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", key);
    };
  }, [columnsOpen]);
  useLayoutEffect(() => {
    if (!columnsOpen) return;
    const update = () => {
      const anchor = columnsButton.current,
        panel = columnsPanel.current;
      if (!anchor || !panel) return;
      const rect = anchor.getBoundingClientRect(),
        panelRect = panel.getBoundingClientRect(),
        margin = 8,
        width = Math.min(256, window.innerWidth - margin * 2),
        height = Math.min(
          panelRect.height || 320,
          window.innerHeight - margin * 2,
        ),
        left = Math.max(
          margin,
          Math.min(rect.right - width, window.innerWidth - width - margin),
        ),
        below = window.innerHeight - rect.bottom >= height + margin,
        top = below
          ? Math.min(rect.bottom + 6, window.innerHeight - height - margin)
          : Math.max(margin, rect.top - height - 6);
      setColumnsStyle({ left, top, width, visibility: "visible" });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [columnsOpen]);
  useEffect(() => {
    if (!openFilter) return;
    const outside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !document
          .querySelector(`[data-filter-panel="${openFilter}"]`)
          ?.contains(target) &&
        !filterButtons.current[openFilter]?.contains(target)
      ) {
        setOpenFilter(null);
        filterButtons.current[openFilter]?.focus();
      }
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [openFilter]);
  const toggleSort = (column: TableColumn<Row>, multiple: boolean) => {
    if (column.sortable === false) return;
    setSorts((current) => {
      const found = current.find((item) => item.id === column.id);
      const next = found
        ? found.direction === "asc"
          ? { id: column.id, direction: "desc" as const }
          : null
        : { id: column.id, direction: "asc" as const };
      if (!multiple) return next ? [next] : [];
      return [
        ...current.filter((item) => item.id !== column.id),
        ...(next ? [next] : []),
      ];
    });
    setPage(1);
  };
  const setColumnSort = (
    column: TableColumn<Row>,
    direction: "asc" | "desc",
    multiple: boolean,
  ) => {
    if (column.sortable === false) return;
    setSorts((current) => {
      const next = { id: column.id, direction };
      return multiple
        ? [...current.filter((item) => item.id !== column.id), next]
        : [next];
    });
    setPage(1);
  };
  const moveColumn = (target: string) => {
    const source = draggedColumn.current;
    if (!source || source === target) return;
    setOrder((current) => {
      const next = current.filter((item) => item !== source);
      next.splice(Math.max(0, next.indexOf(target)), 0, source);
      return next;
    });
    draggedColumn.current = null;
  };
  const resize = (event: React.MouseEvent, column: TableColumn<Row>) => {
    event.preventDefault();
    event.stopPropagation();
    const start = event.clientX,
      initial = widths[column.id] ?? column.width ?? 160;
    const move = (next: MouseEvent) =>
      setWidths((value) => ({
        ...value,
        [column.id]: Math.max(88, initial + next.clientX - start),
      }));
    const stop = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
  };
  const autoFit = (column: TableColumn<Row>) => {
    const longest = Math.max(
      column.label.length,
      ...processed
        .slice(0, 250)
        .map((row) => String(column.value(row) ?? "").length),
    );
    setWidths((value) => ({
      ...value,
      [column.id]: Math.max(96, Math.min(420, longest * 8 + 44)),
    }));
  };
  const exportXlsx = async () => {
    setExporting(true);
    setExportStatus("");
    try {
      const sourceRows = loadExportRows ? await loadExportRows() : processed;
      const { utils, writeFile } = await import("xlsx");
      const exportColumns = visible.filter(
          (column) => column.exportable !== false,
        ),
        exportRows = sourceRows.map((row) =>
          Object.fromEntries(
            exportColumns.map((column) => [
              column.label,
              spreadsheetValue(column.value(row), column.kind),
            ]),
          ),
        );
      const sheet = utils.json_to_sheet(exportRows, { cellDates: true }),
        book = utils.book_new();
      utils.book_append_sheet(book, sheet, label.slice(0, 31));
      const context = fold(query)
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 30);
      writeFile(
        book,
        `${id}-${new Date().toISOString().slice(0, 10)}${context ? `-${context}` : ""}.xlsx`,
      );
      setExportStatus(`${sourceRows.length} resultados exportados para XLSX.`);
    } catch (exportError) {
      setExportStatus(
        exportError instanceof Error
          ? exportError.message
          : "Não foi possível preparar a exportação XLSX.",
      );
    } finally {
      setExporting(false);
    }
  };
  const allShownSelected = Boolean(
    onSelectionChange &&
      shown.length &&
      shown.every((row) => selected.includes(rowKey(row))),
  );
  return (
    <section
      className="table-standard card relative isolate z-0 overflow-clip"
      aria-label={label}
    >
      <div className="print-table-heading hidden">
        <h2>{label}</h2>
        <p>
          Gerado em {new Date().toLocaleString("pt-PT")} · {processed.length}{" "}
          resultados · {Object.values(filters).filter(hasFilterValue).length}{" "}
          filtros por coluna{query ? ` · Pesquisa: ${query}` : ""}
        </p>
      </div>
      <div
        ref={toolsElement}
        style={{ top: stickyHeaderOffset }}
        className="table-tools z-40 flex min-h-9 flex-wrap items-center gap-1 border-b border-border bg-surface px-2 py-1 shadow-sm md:sticky"
      >
        {showSearch && <label className="relative min-w-52 flex-1">
          <span className="sr-only">Pesquisar em {label}</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (event.target.value && loadAllRows) setUniverseRequested(true);
              setPage(1);
            }}
            className="control min-h-8 w-full px-2.5 pr-9 text-xs"
            placeholder="Pesquisar em todas as colunas…"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpar pesquisa"
              className="absolute right-1 top-1 grid size-8 place-items-center rounded"
            >
              ×
            </button>
          )}
        </label>}
        <button
          type="button"
          onClick={() => {
            setFilters({});
            setQuery("");
            setPage(1);
          }}
          className="control min-h-6 px-1.5 text-[10px] font-semibold"
        >
          Limpar filtros
        </button>
        <div>
          <button
            ref={columnsButton}
            type="button"
            aria-expanded={columnsOpen}
            onClick={() => setColumnsOpen((value) => !value)}
            className={`control min-h-6 px-1.5 text-[10px] font-semibold ${hidden.length ? "border-danger bg-danger-soft text-danger" : ""}`}
          >
            Colunas · {visible.length}/{columns.length}
          </button>
          {columnsOpen && (
            <div
              ref={columnsPanel}
              role="dialog"
              aria-label={`Colunas visíveis em ${label}`}
              style={columnsStyle}
              onKeyDown={cyclePanelFocus}
              className="fixed z-[120] max-h-[min(20rem,calc(100dvh-1rem))] overflow-auto rounded-xl border border-border bg-surface p-3 shadow-raised"
            >
              <div className="mb-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setHidden([])}
                  className="min-h-11 text-xs font-semibold text-primary"
                >
                  Mostrar todas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHidden([]);
                    setOrder(columns.map((column) => column.id));
                    setWidths({});
                  }}
                  className="min-h-11 text-xs font-semibold text-secondary"
                >
                  Repor predefinição
                </button>
              </div>
              {ordered.map((column) => (
                <label
                  key={column.id}
                  className="flex min-h-11 items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={column.essential || !hidden.includes(column.id)}
                    disabled={column.essential}
                    onChange={(event) =>
                      setHidden((current) =>
                        event.target.checked
                          ? current.filter((item) => item !== column.id)
                          : [...current, column.id],
                      )
                    }
                  />
                  {column.label}
                </label>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          disabled={exporting}
          onClick={() => void exportXlsx()}
          className="control min-h-6 px-1.5 text-[10px] font-semibold disabled:opacity-50"
        >
          {exporting ? "A preparar XLSX…" : "XLSX"}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="control min-h-6 px-1.5 text-[10px] font-semibold"
        >
          Imprimir / PDF
        </button>
      </div>
      {exportStatus && (
        <p
          role="status"
          className="border-b border-border px-3 py-2 text-xs text-text-secondary"
        >
          {exportStatus}
        </p>
      )}
      <div className="px-3 py-2 text-xs text-text-secondary" role="status">
        {updating ? "A actualizar… · " : ""}
        {loading && rows.length === 0
          ? `A carregar ${resultNoun}…`
          : universeLoading
          ? `A carregar todo o universo (${universeProgress?.loaded??rows.length} de ${universeProgress?.total??reportedTotal})…`
          : `${resultTotal} ${resultNoun} de ${reportedTotal}`}
        {selected.length ? ` · ${selected.length} seleccionados` : ""}
        {universeError ? ` · ${universeError}` : ""}
        {universeLoading&&<progress aria-label="Progresso do carregamento da tabela" className="mt-2 block h-2 w-full accent-secondary" value={universeProgress?.loaded??rows.length} max={Math.max(1,universeProgress?.total??reportedTotal)}/>}
      </div>
      <div ref={scrollContainer} className="scrollbar-thin overflow-x-auto">
        <table ref={tableElement} className="w-full min-w-max border-separate border-spacing-0 text-left text-sm">
          <caption className="sr-only">{label}</caption>
          <colgroup>
            {onSelectionChange && <col style={{ width: 48, minWidth: 48 }} />}
            {visible.map((column) => {
              const width = widths[column.id] ?? column.width ?? 160;
              return <col key={column.id} style={{ width, minWidth: width }} />;
            })}
          </colgroup>
          <thead ref={headerElement} className="relative z-30 bg-surface shadow-sm">
            <tr>
              {onSelectionChange && (
                <th
                  style={{ width: 48, minWidth: 48 }}
                  className="border-b border-border bg-surface px-3 py-3"
                >
                  <input
                    type="checkbox"
                    aria-label="Seleccionar linhas visíveis"
                    checked={allShownSelected}
                    onChange={(event) =>
                      onSelectionChange(
                        event.target.checked
                          ? [...new Set([...selected, ...shown.map(rowKey)])]
                          : selected.filter(
                              (key) =>
                                !shown.some((row) => rowKey(row) === key),
                            ),
                      )
                    }
                  />
                </th>
              )}
              {visible.map((column, index) => {
                const sticky = Boolean(column.sticky),
                  width = widths[column.id] ?? column.width ?? 160,
                  sortIndex = sorts.findIndex((item) => item.id === column.id);
                return (
                  <th
                    key={column.id}
                    data-sticky-column={sticky}
                    data-sticky-offset={sticky?stickyOffset(index):undefined}
                    draggable={!sticky}
                    onDragStart={() => {
                      draggedColumn.current = column.id;
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => moveColumn(column.id)}
                    style={{
                      width,
                      minWidth: width,
                      left: sticky ? stickyOffset(index) : undefined,
                    }}
                    aria-sort={
                      sortIndex >= 0
                        ? sorts[sortIndex].direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    className={`relative border-b border-border bg-surface px-2 py-1 align-bottom ${sticky ? "sticky z-40 shadow-[2px_0_3px_-3px_rgba(0,0,0,.35)]" : "cursor-grab"}`}
                  >
                    <button
                      type="button"
                      disabled={column.sortable === false}
                      onClick={(event) => toggleSort(column, event.shiftKey)}
                      className="flex min-h-6 w-full items-center gap-1.5 text-xs font-semibold disabled:cursor-default"
                    >
                      <span>{column.label}</span>
                      {sortIndex >= 0 && (
                        <span
                          className="text-xs text-secondary"
                          aria-hidden="true"
                        >
                          {sorts[sortIndex].direction === "asc" ? "↑" : "↓"}
                          {sorts.length > 1 ? sortIndex + 1 : ""}
                        </span>
                      )}
                    </button>
                      <div className="mt-0.5 flex items-center gap-0.5">
                      {column.filterable !== false &&
                        column.searchable !== false && (
                          <div className="relative min-w-0 flex-1">
                            <button
                              ref={(node) => {
                                filterButtons.current[column.id] = node;
                              }}
                              type="button"
                              aria-expanded={openFilter === column.id}
                              disabled={universeLoading}
                              onClick={() => {
                                if (loadAllRows && !universeRows) setUniverseRequested(true);
                                setOpenFilter((current) =>
                                  current === column.id ? null : column.id,
                                );
                              }}
                              className={`min-h-7 w-full rounded border px-1.5 text-left text-[0.6875rem] disabled:cursor-wait disabled:opacity-60 ${hasFilter(column.id) ? "border-secondary bg-secondary-soft text-secondary" : "border-border bg-background text-text-secondary"}`}
                            >
                              {universeLoading
                                ? "A carregar opções…"
                                : hasFilter(column.id)
                                ? "Filtro activo"
                                : "Filtrar…"}
                            </button>
                            {openFilter === column.id && (
                              <FilterPanel
                                column={optionsFor(column)}
                                anchor={filterButtons.current[column.id]}
                                value={filters[column.id] ?? {}}
                                onChange={(next) => {
                                  setFilters((current) => ({
                                    ...current,
                                    [column.id]: next,
                                  }));
                                  setPage(1);
                                }}
                                onClose={() => {
                                  setOpenFilter(null);
                                  filterButtons.current[column.id]?.focus();
                                }}
                              />
                            )}
                          </div>
                        )}
                      {column.sortable !== false && (
                        <span className="flex shrink-0 overflow-hidden rounded border border-border bg-background">
                          <button
                            type="button"
                            aria-label={`Ordenar ${column.label} por ordem ascendente`}
                            aria-pressed={
                              sortIndex >= 0 &&
                              sorts[sortIndex].direction === "asc"
                            }
                            onClick={(event) => {
                              if (loadAllRows && !universeRows) setUniverseRequested(true);
                              setColumnSort(column, "asc", event.shiftKey);
                            }}
                            className={`grid size-7 place-items-center text-xs ${sortIndex >= 0 && sorts[sortIndex].direction === "asc" ? "bg-secondary text-surface" : "text-text-secondary hover:bg-secondary-soft"}`}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            aria-label={`Ordenar ${column.label} por ordem descendente`}
                            aria-pressed={
                              sortIndex >= 0 &&
                              sorts[sortIndex].direction === "desc"
                            }
                            onClick={(event) => {
                              if (loadAllRows && !universeRows) setUniverseRequested(true);
                              setColumnSort(column, "desc", event.shiftKey);
                            }}
                            className={`grid size-7 place-items-center border-l border-border text-xs ${sortIndex >= 0 && sorts[sortIndex].direction === "desc" ? "bg-secondary text-surface" : "text-text-secondary hover:bg-secondary-soft"}`}
                          >
                            ↓
                          </button>
                        </span>
                      )}
                    </div>
                    <span
                      role="separator"
                      aria-label={`Redimensionar ${column.label}`}
                      onMouseDown={(event) => resize(event, column)}
                      onDoubleClick={() => autoFit(column)}
                      className="absolute inset-y-0 right-0 w-2 cursor-col-resize hover:bg-secondary/20"
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {virtualTop>0&&<tr aria-hidden="true"><td colSpan={visible.length+(onSelectionChange?1:0)} style={{height:virtualTop,padding:0,border:0}}/></tr>}
            {!loading &&
              rendered.map((row) => {
                const key = rowKey(row),
                  isActive = activeRow === key,
                  isSelected = selected.includes(key) || isActive;
                return (
                  <tr
                    key={key}
                    tabIndex={0}
                    aria-selected={isSelected}
                    onClickCapture={() => setActiveRow(key)}
                    onFocus={() => setActiveRow(key)}
                    onDoubleClick={() => onRowDoubleClick?.(row)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && onRowDoubleClick) {
                        event.preventDefault();
                        onRowDoubleClick(row);
                        return;
                      }
                      if (event.key !== "ArrowDown" && event.key !== "ArrowUp")
                        return;
                      const sibling =
                        event.key === "ArrowDown"
                          ? event.currentTarget.nextElementSibling
                          : event.currentTarget.previousElementSibling;
                      if (sibling instanceof HTMLElement) {
                        event.preventDefault();
                        sibling.focus();
                      }
                    }}
                    className={`group h-[2.125rem] odd:bg-surface-subtle even:bg-surface hover:bg-secondary-soft ${isActive ? "table-row-active outline outline-1 outline-secondary" : ""} ${onRowDoubleClick ? "cursor-pointer" : ""} focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary`}
                    aria-label={onRowDoubleClick ? `Abrir ${key}` : undefined}
                  >
                    {onSelectionChange && (
                      <td
                        style={{ width: 48, minWidth: 48 }}
                        className="border-b border-border bg-inherit px-3 py-0.5 text-center"
                      >
                        <input
                          type="checkbox"
                          aria-label={`Seleccionar ${key}`}
                          checked={isSelected}
                          onChange={() =>
                            onSelectionChange(
                              isSelected
                                ? selected.filter((item) => item !== key)
                                : [...selected, key],
                            )
                          }
                        />
                      </td>
                    )}
                    {visible.map((column, index) => {
                      const sticky = Boolean(column.sticky),
                        width = widths[column.id] ?? column.width ?? 160,
                        raw = column.value(row),
                        tooltip = raw == null ? "" : String(raw);
                      return (
                        <td
                          key={column.id}
                          style={{
                            width,
                            minWidth: width,
                            maxWidth: width,
                            left: sticky ? stickyOffset(index) : undefined,
                          }}
                          className={`border-b border-border px-3 py-0.5 ${column.kind === "money" ? "text-right tabular-nums" : "text-center"} ${sticky ? "sticky z-10 bg-inherit shadow-[2px_0_3px_-3px_rgba(0,0,0,.35)]" : "bg-inherit"}`}
                        >
                          <div
                            className="overflow-hidden text-ellipsis whitespace-nowrap"
                            title={tooltip}
                          >
                            {column.render
                              ? column.render(row)
                              : String(raw ?? "—")}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            {virtualBottom>0&&<tr aria-hidden="true"><td colSpan={visible.length+(onSelectionChange?1:0)} style={{height:virtualBottom,padding:0,border:0}}/></tr>}
          </tbody>
        </table>
        {loading && (
          <div role="status" className="space-y-2 p-4">
            {Array.from({ length: 5 }, (_, index) => (
              <div
                key={index}
                className="h-10 animate-pulse rounded bg-surface-subtle"
              />
            ))}
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="m-4 rounded-lg bg-danger-soft p-4 text-sm text-danger"
          >
            {error}
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="ml-3 font-semibold underline"
              >
                Tentar novamente
              </button>
            )}
          </div>
        )}
        {!loading && !error && !processed.length && (
          <div className="p-8 text-center text-sm text-text-secondary">
            {rows.length
              ? "Os filtros não encontraram resultados."
              : emptyMessage}
          </div>
        )}
      </div>
      <div className="table-pagination flex flex-wrap items-center justify-between gap-3 border-t border-border p-3 text-sm">
        <label>
          Linhas por página{" "}
          <select
            value={pageSize}
            onChange={(event) => {
              if (event.target.value === "all" && loadAllRows) setUniverseRequested(true);
              setPageSize(
                event.target.value === "all"
                  ? "all"
                  : (Number(event.target.value) as 10 | 20 | 50 | 100),
              );
              setPage(1);
            }}
            className="control ml-2 min-h-9 px-2"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value="all" disabled={universeLoading||Boolean(universeError)}>Todas</option>
          </select>
        </label>
        <span>
          {loading && rows.length === 0
            ? `A carregar ${resultNoun}…`
            : pageSize === "all" && universeLoading
            ? `A carregar ${universeProgress?.loaded ?? rows.length} de ${universeProgress?.total ?? reportedTotal} para mostrar todas…`
            : resultTotal
            ? `${pageSize === "all" ? 1 : (validPage - 1) * pageSize + 1}–${pageSize === "all" ? resultTotal : Math.min(validPage * pageSize, resultTotal)} de ${resultTotal}`
            : `0 ${resultNoun}`}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={validPage <= 1}
            onClick={() => setPage((value) => value - 1)}
            className="control min-h-9 px-3 disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={validPage >= pageCount}
            onClick={() => {
              if (loadAllRows && !universeRows) setUniverseRequested(true);
              setPage((value) => value + 1);
            }}
            className="control min-h-9 px-3 disabled:opacity-40"
          >
            Seguinte
          </button>
        </div>
      </div>
    </section>
  );
}
