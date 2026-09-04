import { referrerNames } from '../../lib/professionalNames'
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  StandardDataTable,
  type TableColumn,
} from "../../components/table/StandardDataTable";
import { supabase } from "../../lib/supabase";
import { ClientDocumentsPanel } from "../clients/ClientDocumentsPanel";
import { AppLink } from "../../components/ui/AppLink";
import { SocietyLogoCropper } from "./SocietyLogoCropper";
import { ClientCreditPanel } from "../clients/ClientCreditPanel";
import { ClientRetainerPanel } from "./ClientRetainerPanel";
import { ClientCredentialsPanel } from "./ClientCredentialsPanel";
import { withTransientRetry } from "../../lib/transientRetry";

const HonorariumNoteModal = lazy(() =>
  import("../clients/HonorariumNoteModal").then((module) => ({
    default: module.HonorariumNoteModal,
  })),
);

type Section = "clients" | "billing_entities" | "professionals";
type Row = {
  id: string;
  firm_id: string;
  display_name?: string;
  name?: string;
  client_code?: string;
  client_type?: "individual" | "company";
  profile_types?: Array<"individual" | "company">;
  active: boolean;
};
type Profile = {
  id?: string;
  client_type: "individual" | "company";
  client_code: string;
  active: boolean;
};
type ClientDetails = {
  legal_name: string;
  tax_number: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  honorarium_language: "pt" | "en" | "fr";
  honorarium_delivery_method: "email" | "post" | "hand";
  honorarium_recipient_name: string;
  default_billing_entity_id: string;
  client_referrer: string;
  client_referrer_other: string;
  primary_billing_entity_id: string;
  default_hourly_rate: string;
};
type BillingDetails = {
  legal_name: string;
  tax_number: string;
  address: string;
  email: string;
  phone: string;
  bank_account_holder: string;
  bank_name: string;
  bank_account_number: string;
  iban: string;
  bic_swift: string;
  default_vat_rate: string;
  default_currency: string;
};
type BankAccount = {
  account_holder: string;
  bank_name: string;
  account_number: string;
  iban: string;
  bic_swift: string;
  currency: string;
};
type Identifier = {
  id?: string;
  identifier_type:
    | "citizen_card"
    | "passport"
    | "residence_permit"
    | "company_registration"
    | "tax"
    | "other";
  identifier_number: string;
  issuing_country: string;
  issuing_authority: string;
  issued_on: string;
  expires_on: string;
  notes: string;
};
const sections: { id: Section; label: string }[] = [
  { id: "clients", label: "Clientes" },
  { id: "billing_entities", label: "Sociedades" },
  { id: "professionals", label: "Responsáveis" },
];
const emptyProfiles = (): Profile[] => [
  { client_type: "individual", client_code: "", active: true },
  { client_type: "company", client_code: "", active: false },
];
const unselectedProfiles = (): Profile[] => [
  { client_type: "individual", client_code: "", active: false },
  { client_type: "company", client_code: "", active: false },
];
const emptyDetails = (): ClientDetails => ({
  legal_name: "",
  tax_number: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
  honorarium_language: "pt",
  honorarium_delivery_method: "email",
  honorarium_recipient_name: "",
  default_billing_entity_id: "",
  client_referrer: "",
  client_referrer_other: "",
  primary_billing_entity_id: "",
  default_hourly_rate: "",
});
const emptyBillingDetails = (): BillingDetails => ({
  legal_name: "",
  tax_number: "",
  address: "",
  email: "",
  phone: "",
  bank_account_holder: "",
  bank_name: "",
  bank_account_number: "",
  iban: "",
  bic_swift: "",
  default_vat_rate: "23",
  default_currency: "EUR",
});
const emptyBankAccount = (): BankAccount => ({
  account_holder: "",
  bank_name: "",
  account_number: "",
  iban: "",
  bic_swift: "",
  currency: "EUR",
});
const contactValues = (value: string | null | undefined) => {
  const values = (value ?? "")
    .split(/\r?\n|;\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
  return values.length ? values : [""];
};
const storedContacts = (values: string[]) =>
  [...new Set(values.map((item) => item.trim()).filter(Boolean))].join("\n");
const emptyIdentifier = (): Identifier => ({
  identifier_type: "citizen_card",
  identifier_number: "",
  issuing_country: "",
  issuing_authority: "",
  issued_on: "",
  expires_on: "",
  notes: "",
});
const identifierLabels: Record<Identifier["identifier_type"], string> = {
  citizen_card: "Cartão de Cidadão / BI",
  passport: "Passaporte",
  residence_permit: "Título de residência",
  company_registration: "Registo comercial",
  tax: "Identificação fiscal",
  other: "Outro",
};

export function MasterDataPage({
  initialSection = "clients",
  clientTypeFilter = null,
  focusedRecordId,
  onDismiss,
  onRecordSaved,
}: {
  initialSection?: Section;
  focusedRecordId?: string;
  onDismiss?:()=>void;
  onRecordSaved?:()=>void;
  clientTypeFilter?: "individual" | "company" | "mixed" | null;
}) {
  const [clientDetailsReady,setClientDetailsReady]=useState(false);
  const [referrerOptions,setReferrerOptions]=useState<Array<{id:string;name:string}>>([]);
  const [section, setSection] = useState<Section>(initialSection),
    [rows, setRows] = useState<Row[]>([]),
    [firmId, setFirmId] = useState("");
  const firmIdRef = useRef("");
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Row | null>(null),
    [creating, setCreating] = useState(false),
    [editName, setEditName] = useState("");
  const [editActive, setEditActive] = useState(true),
    [profiles, setProfiles] = useState<Profile[]>(emptyProfiles),
    [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showOtherProfile,setShowOtherProfile]=useState(false);
  const [showHourlyRate,setShowHourlyRate]=useState(false);
  const [clientPage,setClientPage]=useState<"general"|"contacts"|"billing"|"retainer"|"provisions"|"credentials"|"documents">("general");
  const [mode, setMode] = useState<"view" | "edit">("view"),
    [details, setDetails] = useState<ClientDetails>(emptyDetails),
    [identifiers, setIdentifiers] = useState<Identifier[]>([]);
  const [emails, setEmails] = useState<string[]>([""]),
    [phones, setPhones] = useState<string[]>([""]);
  const [suggestedCodes, setSuggestedCodes] = useState<
    Record<"individual" | "company", string>
  >({ individual: "", company: "" });
  const [identifiersAvailable, setIdentifiersAvailable] = useState(true);
  const [billingDetails, setBillingDetails] =
      useState<BillingDetails>(emptyBillingDetails),
    [billingOptions, setBillingOptions] = useState<
      Array<{ id: string; name: string }>
    >([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [logoPath, setLogoPath] = useState(""),
    [logoUrl, setLogoUrl] = useState(""),
    [logoBlob, setLogoBlob] = useState<Blob | null>(null),
    [removeLogo, setRemoveLogo] = useState(false);
  const [documentClient, setDocumentClient] = useState<{
    row: Row;
    kind: "honorarium" | "collection";
  } | null>(null);
  const [unpaidClientIds, setUnpaidClientIds] = useState<Set<string>>(new Set());
  const [retainerClientIds, setRetainerClientIds] = useState<Set<string>>(
    new Set(),
  );
  const loadSequenceRef = useRef(0);
  const openedRecordRef = useRef<string | null>(null);
  useEffect(() => setSection(initialSection), [initialSection]);
  const load = useCallback(async () => {
    const db = supabase;
    if (!db) return;
    const sequence = ++loadSequenceRef.current;
    const isCurrent = () => loadSequenceRef.current === sequence;
    setLoading(true);
    setError("");
    let targetFirm = firmIdRef.current;
    if (!targetFirm) {
      const { data } = await withTransientRetry(() =>
        db
          .from("firm_members")
          .select("firm_id")
          .eq("active", true)
          .limit(1)
          .maybeSingle(),
      );
      if (!isCurrent()) return;
      targetFirm = data?.firm_id ?? "";
      firmIdRef.current = targetFirm;
      setFirmId(targetFirm);
    }
    const fields =
      section === "billing_entities"
        ? "id,firm_id,name,active"
        : section === "clients"
          ? "id,firm_id,display_name,client_code,client_type,active"
          : "id,firm_id,display_name,active";
    const { data, error: failure } = await withTransientRetry(() => {
      const query=db.from(section).select(fields).order(section === "billing_entities" ? "name" : "display_name");
      return focusedRecordId?query.eq('id',focusedRecordId):query;
    });
    if (!isCurrent()) return;
    if (failure) setError(failure.message);
    else if (focusedRecordId) setRows((data??[]) as unknown as Row[]);
    else if (section === "clients") {
      const [profileResult, flagsResult, retainerResult] = await Promise.all([
        withTransientRetry(() =>
          db
            .from("client_profiles")
            .select("client_id,client_type")
            .eq("active", true),
        ),
        withTransientRetry(() =>
          db.rpc("get_client_document_action_flags"),
        ),
        withTransientRetry(() =>
          db
            .from("client_retainers")
            .select("client_id")
            .eq("active", true),
        ),
      ]);
      if (!isCurrent()) return;
      if (profileResult.error) setError(profileResult.error.message);
      else {
        const types = new Map<string, Array<"individual" | "company">>();
        for (const profile of profileResult.data ?? []) {
          const type = profile.client_type as "individual" | "company";
          types.set(profile.client_id, [
            ...(types.get(profile.client_id) ?? []),
            type,
          ]);
        }
        setRows(
          ((data ?? []) as unknown as Row[]).map((row) => ({
            ...row,
            profile_types: [
              ...new Set(
                types.get(row.id) ?? [row.client_type ?? "individual"],
              ),
            ],
          })),
        );
      }
      if (flagsResult.error) {
        setUnpaidClientIds(new Set());
      } else {
        const flags = (flagsResult.data ?? []) as Array<{
          client_id: string;
          has_unpaid: boolean;
        }>;
        setUnpaidClientIds(
          new Set(
            flags
              .filter((item) => item.has_unpaid)
              .map((item) => item.client_id),
          ),
        );
      }
      setRetainerClientIds(
        retainerResult.error
          ? new Set()
          : new Set((retainerResult.data ?? []).map((item) => item.client_id)),
      );
    } else setRows((data ?? []) as unknown as Row[]);
    if (isCurrent()) setLoading(false);
  }, [section,focusedRecordId]);
  useEffect(() => {
    void load();
    return () => {
      loadSequenceRef.current += 1;
    };
  }, [load]);
  async function openEditor(row: Row) {
    setCreating(false);
    setClientDetailsReady(false);
    setEditing(row);
    setMode("edit");
    setShowOtherProfile(false);
    setDirty(false);
    setClientPage("general");
    setEditName(row.display_name ?? row.name ?? "");
    setEditActive(row.active);
    setError("");
    setDetails(emptyDetails());
    setShowHourlyRate(false);
    setEmails([""]);
    setPhones([""]);
    setIdentifiers([]);
    setIdentifiersAvailable(true);
    if (section === "billing_entities") {
      setProfiles([]);
      setLogoPath("");
      setLogoUrl("");
      setLogoBlob(null);
      setRemoveLogo(false);
      const result = await supabase!
        .from("billing_entities")
        .select(
          "legal_name,tax_number,address,email,phone,bank_account_holder,bank_name,bank_account_number,iban,bic_swift,bank_accounts,default_vat_rate,default_currency,logo_path",
        )
        .eq("id", row.id)
        .single();
      let data = result.data as Record<string, unknown> | null;
      if (
        result.error &&
        (result.error.code === "42703" || result.error.code === "PGRST204")
      ) {
        const fallback = await supabase!
          .from("billing_entities")
          .select(
            "legal_name,tax_number,address,email,phone,bank_account_holder,bank_name,bank_account_number,iban,bic_swift,bank_accounts,default_vat_rate,default_currency",
          )
          .eq("id", row.id)
          .single();
        data = fallback.data as Record<string, unknown> | null;
        if (fallback.error) setError(fallback.error.message);
      } else if (result.error) setError(result.error.message);
      if (data) {
        setBillingDetails({
          ...emptyBillingDetails(),
          ...Object.fromEntries(
            Object.keys(emptyBillingDetails()).map((key) => [
              key,
              data![key] == null
                ? emptyBillingDetails()[key as keyof BillingDetails]
                : String(data![key]),
            ]),
          ),
        });
        const stored = Array.isArray(data.bank_accounts)
          ? (data.bank_accounts as BankAccount[])
          : [];
        setBankAccounts(
          stored.length
            ? stored
            : data.iban
              ? [
                  {
                    account_holder: String(data.bank_account_holder ?? ""),
                    bank_name: String(data.bank_name ?? ""),
                    account_number: String(data.bank_account_number ?? ""),
                    iban: String(data.iban),
                    bic_swift: String(data.bic_swift ?? ""),
                    currency: String(data.default_currency ?? "EUR"),
                  },
                ]
              : [],
        );
        const path = String(data.logo_path ?? "");
        setLogoPath(path);
        if (path) {
          const storedLogo = await supabase!.storage
            .from("billing-entity-logos")
            .download(path);
          if (storedLogo.error || !storedLogo.data) {
            setError(`Não foi possível apresentar o logótipo guardado: ${storedLogo.error?.message ?? "ficheiro indisponível"}`);
          } else {
            setLogoUrl(URL.createObjectURL(storedLogo.data));
          }
        }
      }
      return;
    }
    if (section !== "clients") {
      setProfiles([]);
      return;
    }
    const [clientResult, profileResult, identifierResult, referrersResult] = await Promise.all([
      supabase!
        .from("clients")
        .select(
          "legal_name,tax_number,email,phone,address,notes,honorarium_language,honorarium_delivery_method,honorarium_recipient_name,default_billing_entity_id,client_referrer,client_referrer_other,primary_billing_entity_id,default_hourly_rate",
        )
        .eq("id", row.id)
        .single(),
      supabase!
        .from("client_profiles")
        .select("id,client_type,client_code,active")
        .eq("client_id", row.id),
      supabase!
        .from("client_identifiers")
        .select(
          "id,identifier_type,identifier_number,issuing_country,issuing_authority,issued_on,expires_on,notes",
        )
        .eq("client_id", row.id)
        .order("created_at"),
      supabase!.from("client_referrers").select("id,name").order("name"),
    ]);
    setReferrerOptions(referrersResult.data??[]);
    if(clientResult.error||profileResult.error){setError(clientResult.error?.message??profileResult.error!.message);return;}
    setClientDetailsReady(true);
    if (clientResult.data) {
      const data = clientResult.data as Record<string, string | null>;
      setDetails({
        ...emptyDetails(),
        ...Object.fromEntries(
          Object.keys(emptyDetails()).map((key) => [
            key,
            data[key] == null ? emptyDetails()[key as keyof ClientDetails] : String(data[key]),
          ]),
        ),
      } as ClientDetails);
      setEmails(contactValues(data.email));
      setPhones(contactValues(data.phone));
    }
    if (identifierResult.error) {
      setIdentifiersAvailable(false);
    } else
      setIdentifiers(
        (identifierResult.data ?? []).map((item) => ({
          ...item,
          issuing_country: item.issuing_country ?? "",
          issuing_authority: item.issuing_authority ?? "",
          issued_on: item.issued_on ?? "",
          expires_on: item.expires_on ?? "",
          notes: item.notes ?? "",
        })) as Identifier[],
      );
    const found = (profileResult.data ?? []) as unknown as Profile[];
    setProfiles(
      found.length
        ? (["individual", "company"] as const).map(
            (type) =>
              found.find((item) => item.client_type === type) ?? {
                client_type: type,
                client_code: "",
                active: false,
              },
          )
        : [
            {
              client_type: row.client_type ?? "individual",
              client_code: row.client_code ?? "",
              active: true,
            },
            {
              client_type:
                row.client_type === "individual" ? "company" : "individual",
              client_code: "",
              active: false,
            },
          ],
    );
  }
  useEffect(() => {
    if (loading) return;
    const recordId = focusedRecordId ?? new URLSearchParams(window.location.search).get("record");
    if (!recordId || openedRecordRef.current === recordId) return;
    const row = rows.find((item) => item.id === recordId);
    if (!row) return;
    openedRecordRef.current = recordId;
    void openEditor(row);
    // A abertura é intencionalmente accionada apenas quando a lista/ID pedido muda.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, rows, section,focusedRecordId]);
  async function openCreator() {
    setClientDetailsReady(true);
    if(supabase){const result=await supabase.from("client_referrers").select("id,name").order("name");setReferrerOptions(result.data??[]);}
    setEditing(null);
    setCreating(true);
    setMode("edit");
    setDirty(false);
    setEditName("");
    setEditActive(true);
    setProfiles(unselectedProfiles());
    setDetails(emptyDetails());
    setShowHourlyRate(false);
    setBillingDetails(emptyBillingDetails());
    setBankAccounts([]);
    setLogoPath("");
    setLogoUrl("");
    setLogoBlob(null);
    setRemoveLogo(false);
    setEmails([""]);
    setPhones([""]);
    setIdentifiers([]);
    setIdentifiersAvailable(true);
    setError("");
    setNotice("");
    setSuggestedCodes({ individual: "", company: "" });
    if (!supabase || !firmId) return;
    const { data, error: codeError } = await supabase
      .from("client_profiles")
      .select("client_type,client_code")
      .eq("firm_id", firmId);
    if (codeError) {
      setError(
        `Não foi possível calcular os próximos códigos: ${codeError.message}`,
      );
      return;
    }
    const next = (type: "individual" | "company") => {
      const prefix = type === "company" ? "01" : "02";
      const highest = (data ?? [])
        .filter((item) => item.client_type === type)
        .map((item) =>
          new RegExp(`^${prefix}\\.(\\d+)$`).exec(item.client_code ?? ""),
        )
        .filter((match): match is RegExpExecArray => Boolean(match))
        .reduce((maximum, match) => Math.max(maximum, Number(match[1])), 0);
      return `${prefix}.${String(highest + 1).padStart(4, "0")}`;
    };
    setSuggestedCodes({
      individual: next("individual"),
      company: next("company"),
    });
  }
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase
      .from("billing_entities")
      .select("id,name")
      .eq("active", true)
      .order("name")
      .then((result) => {
        if (active && !result.error)
          setBillingOptions(
            (result.data ?? []) as Array<{ id: string; name: string }>,
          );
      });
    return () => {
      active = false;
    };
  }, []);
  function closeEditor() {
    if(saving)return;
    onDismiss?.();
    setEditing(null);
    setCreating(false);
    setError("");
  }
  async function cancelChanges() {
    setError("");
    if (creating) {
      closeEditor();
      return;
    }
    if (editing) await openEditor(editing);
  }
  function updateProfile(
    type: "individual" | "company",
    change: Partial<Profile>,
  ) {
    setDirty(true);
    setProfiles((current) =>
      current.map((item) =>
        item.client_type === type ? { ...item, ...change } : item,
      ),
    );
  }
  function selectCreationProfile(type: "individual" | "company") {
    setDirty(true);
    setProfiles((current) =>
      current.map((item) =>
        item.client_type === type
          ? {
              ...item,
              active: true,
              client_code: item.client_code || suggestedCodes[type],
            }
          : { ...item, active: false, client_code: "" },
      ),
    );
  }
  function updateIdentifier(index: number, change: Partial<Identifier>) {
    setDirty(true);
    setIdentifiers((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...change } : item,
      ),
    );
  }
  function updateBankAccount(index: number, change: Partial<BankAccount>) {
    setDirty(true);
    setBankAccounts((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...change } : item,
      ),
    );
  }
  async function removeIdentifier(index: number) {
    const item = identifiers[index];
    if (!item || !window.confirm("Eliminar este documento de identificação?"))
      return;
    setError("");
    if (item.id) {
      const { error: removeError } = await supabase!
        .from("client_identifiers")
        .delete()
        .eq("id", item.id);
      if (removeError) {
        setError(removeError.message);
        return;
      }
    }
    setDirty(true);
    setIdentifiers((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!supabase || (!editing && !creating) || !firmId) return;
    if (!dirty) return;
    if (section === "clients" && !clientDetailsReady) return;
    setSaving(true);
    setError("");
    const name = editName.trim();
    if (section === "clients" && !profiles.some((item) => item.active)) {
      setError("Active pelo menos uma vertente: Particular ou Empresa.");
      setSaving(false);
      return;
    }
    if (
      section === "clients" &&
      profiles.some((item) => item.active && !item.client_code.trim())
    ) {
      setError("Indique o código de cada vertente activa.");
      setSaving(false);
      return;
    }
    if (section === "clients") {
      const activeProfiles = profiles.filter((item) => item.active),
        invalid = activeProfiles.find(
          (item) =>
            !new RegExp(
              item.client_type === "individual" ? "^02\\.\\d+$" : "^01\\.\\d+$",
            ).test(item.client_code.trim()),
        );
      if (invalid) {
        setError(
          `O código de ${invalid.client_type === "individual" ? "Particular" : "Empresa"} deve começar por ${invalid.client_type === "individual" ? "02." : "01."}`,
        );
        setSaving(false);
        return;
      }
      const codes = activeProfiles.map((item) => item.client_code.trim()),
        duplicates = await supabase
          .from("client_profiles")
          .select("client_id,client_code")
          .eq("firm_id", firmId)
          .in("client_code", codes);
      if (duplicates.error) {
        setError(
          `Não foi possível validar os códigos: ${duplicates.error.message}`,
        );
        setSaving(false);
        return;
      }
      const conflict = (duplicates.data ?? []).find(
        (item) => item.client_id !== editing?.id,
      );
      if (conflict) {
        setError(
          `O código ${conflict.client_code} já está atribuído. Feche e volte a abrir a criação para obter a sugestão seguinte.`,
        );
        setSaving(false);
        return;
      }
    }
    if(section==='clients' && details.default_hourly_rate!=='' && (!Number.isFinite(Number(details.default_hourly_rate)) || Number(details.default_hourly_rate)<0 || Number(details.default_hourly_rate)>9999999999.99)){
      setError('Indique um valor/hora válido, igual ou superior a zero.');setSaving(false);return;
    }
    const savedDetails = {
      ...details,
      client_referrer: details.client_referrer || null,
      client_referrer_other: details.client_referrer==='other'?details.client_referrer_other.trim():null,
      primary_billing_entity_id: details.primary_billing_entity_id || null,
      default_hourly_rate: details.default_hourly_rate === '' ? null : Number(details.default_hourly_rate),
      email: storedContacts(emails),
      phone: storedContacts(phones),
      honorarium_recipient_name:
        details.honorarium_recipient_name.trim() || null,
      default_billing_entity_id: details.default_billing_entity_id || null,
    };
    const savedBankAccounts = bankAccounts
      .map(
        (account) =>
          Object.fromEntries(
            Object.entries(account).map(([key, value]) => [key, value.trim()]),
          ) as BankAccount,
      )
      .filter((account) => Object.values(account).some(Boolean));
    const primaryBankAccount = savedBankAccounts[0];
    const savedBillingDetails = {
      ...billingDetails,
      bank_accounts: savedBankAccounts,
      bank_account_holder: primaryBankAccount?.account_holder ?? "",
      bank_name: primaryBankAccount?.bank_name ?? "",
      bank_account_number: primaryBankAccount?.account_number ?? "",
      iban: primaryBankAccount?.iban ?? "",
      bic_swift: primaryBankAccount?.bic_swift ?? "",
      default_currency:
        primaryBankAccount?.currency || billingDetails.default_currency,
      default_vat_rate: Number(billingDetails.default_vat_rate) || 0,
    };
    let targetId = editing?.id;
    if (creating) {
      const primary = profiles.find((item) => item.active)!;
      const result =
        section === "billing_entities"
          ? await supabase
              .from("billing_entities")
              .insert({
                firm_id: firmId,
                name,
                active: editActive,
                ...savedBillingDetails,
              })
              .select("id")
              .single()
          : section === "professionals"
            ? await supabase
                .from("professionals")
                .insert({
                  firm_id: firmId,
                  display_name: name,
                  active: editActive,
                })
                .select("id")
                .single()
            : await supabase
                .from("clients")
                .insert({
                  firm_id: firmId,
                  display_name: name,
                  client_code: primary.client_code.trim(),
                  client_type: primary.client_type,
                  active: editActive,
                  ...savedDetails,
                })
                .select("id")
                .single();
      const { data, error: createError } = result;
      if (createError) {
        setError(createError.message);
        setSaving(false);
        return;
      }
      targetId = data.id;
    } else {
      const field = section === "billing_entities" ? "name" : "display_name";
      const updatePayload =
        section === "clients"
          ? { [field]: name, active: editActive, ...savedDetails }
          : section === "billing_entities"
            ? { [field]: name, active: editActive, ...savedBillingDetails }
            : { [field]: name, active: editActive };
      const { error: updateError } = await supabase
        .from(section)
        .update(updatePayload)
        .eq("id", editing!.id);
      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }
    }
    if (section === "clients" && targetId) {
      const persistedProfiles:Profile[]=[];
      for (const item of profiles.filter((value) => value.active || value.id)) {
        const payload = {
          firm_id: firmId,
          client_id: targetId,
          client_type: item.client_type,
          client_code: item.client_code.trim(),
          active: item.active,
        };
        const result = item.id
          ? await supabase
              .from("client_profiles")
              .update(payload)
              .eq("id", item.id)
          : await supabase.from("client_profiles").insert(payload).select("id").single();
        if (result.error) {
          setError(result.error.message);
          setSaving(false);
          return;
        }
        persistedProfiles.push({...item,id:item.id??result.data?.id});
      }
      setProfiles(current=>current.map(item=>persistedProfiles.find(saved=>saved.client_type===item.client_type)??item));
    }
    if (section === "clients" && targetId && identifiersAvailable) {
      for (const item of identifiers.filter((value) =>
        value.identifier_number.trim(),
      )) {
        const payload = {
          firm_id: firmId,
          client_id: targetId,
          identifier_type: item.identifier_type,
          identifier_number: item.identifier_number.trim(),
          issuing_country: item.issuing_country.trim() || null,
          issuing_authority: item.issuing_authority.trim() || null,
          issued_on: item.issued_on || null,
          expires_on: item.expires_on || null,
          notes: item.notes.trim() || null,
        };
        const result = item.id
          ? await supabase
              .from("client_identifiers")
              .update(payload)
              .eq("id", item.id)
          : await supabase.from("client_identifiers").insert(payload);
        if (result.error) {
          setError(result.error.message);
          setSaving(false);
          return;
        }
      }
    }
    if (section === "billing_entities" && targetId) {
      const path = `${firmId}/${targetId}/logo.png`;
      if (logoBlob) {
        const upload = await supabase.storage
          .from("billing-entity-logos")
          .upload(path, logoBlob, {
            contentType: "image/png",
            upsert: true,
            cacheControl: "3600",
          });
        if (upload.error) {
          setError(
            `Os dados foram guardados, mas o logótipo não: ${upload.error.message}`,
          );
          setSaving(false);
          return;
        }
        const update = await supabase
          .from("billing_entities")
          .update({ logo_path: path })
          .eq("id", targetId);
        if (update.error) {
          setError(
            `O logótipo foi carregado, mas não foi associado: ${update.error.message}`,
          );
          setSaving(false);
          return;
        }
      } else if (removeLogo && logoPath) {
        const removed = await supabase.storage
          .from("billing-entity-logos")
          .remove([logoPath]);
        if (removed.error) {
          setError(
            `Os dados foram guardados, mas o logótipo não foi removido: ${removed.error.message}`,
          );
          setSaving(false);
          return;
        }
        const update = await supabase
          .from("billing_entities")
          .update({ logo_path: null })
          .eq("id", targetId);
        if (update.error) {
          setError(update.error.message);
          setSaving(false);
          return;
        }
      }
    }
    setNotice(`${name} ${creating ? "criado" : "actualizado"}.`);
    setSaving(false);
    await load();
    onRecordSaved?.();
    if (creating) closeEditor();
    else {
      setEditing((current) => current ? {
        ...current,
        display_name: section === "billing_entities" ? current.display_name : name,
        name: section === "billing_entities" ? name : current.name,
        active: editActive,
      } : current);
      setDirty(false);
      setMode("edit");
      setShowOtherProfile(false);
    }
  }
  const columns: TableColumn<Row>[] = [
    {
      id: "name",
      label: "Nome",
      essential: true,
      sticky: true,
      value: (row) => row.display_name ?? row.name ?? "",
    },
    ...(section === "clients"
      ? ([
          {
            id: "code",
            label: "Código",
            value: (row: Row) => row.client_code ?? "",
          },
          {
            id: "retainer",
            label: "Avença",
            kind: "boolean" as const,
            value: (row: Row) => retainerClientIds.has(row.id),
            render: (row: Row) =>
              retainerClientIds.has(row.id) ? (
                <span className="rounded-full bg-secondary-soft px-2 py-1 text-xs font-semibold text-secondary">
                  Activa
                </span>
              ) : (
                <span className="text-text-secondary">—</span>
              ),
          },
          ...(!clientTypeFilter
            ? ([
                {
                  id: "type",
                  label: "Perfil actual",
                  filterOptions: [
                    { value: "individual", label: "Particular" },
                    { value: "company", label: "Empresa" },
                    { value: "mixed", label: "Mistos" },
                  ],
                  filterValues: (row: Row) => {
                    const types = row.profile_types ?? [
                      row.client_type ?? "individual",
                    ];
                    return types.length > 1 ? [...types, "mixed"] : types;
                  },
                  value: (row: Row) =>
                    (row.profile_types?.length ?? 1) > 1
                      ? "mixed"
                      : (row.client_type ?? ""),
                  render: (row: Row) =>
                    (row.profile_types?.length ?? 1) > 1
                      ? "Misto"
                      : row.client_type === "individual"
                        ? "Particular"
                        : "Empresa",
                },
              ] as TableColumn<Row>[])
            : []),
        ] as TableColumn<Row>[])
      : []),
    ...(!clientTypeFilter
      ? [
          {
            id: "active",
            label: "Estado",
            kind: "boolean" as const,
            value: (row: Row) => row.active,
            render: (row: Row) => (row.active ? "Activo" : "Inactivo"),
          },
        ]
      : []),
    {
      id: clientTypeFilter ? "client_actions" : "actions",
      label: "Acções",
      width: 120,
      sortable: false,
      searchable: false,
      filterable: false,
      exportable: false,
      value: () => null,
      render: (row) => (
        <button
          type="button"
          title="Abrir a ficha completa deste Cliente para consultar ou editar os seus dados."
          onClick={() => void openEditor(row)}
          className="min-h-9 shrink-0 whitespace-nowrap rounded-lg border border-border px-3 py-1.5 font-semibold text-primary"
        >
          Abrir ficha
        </button>
      ),
    },
    ...(section === "clients"
      ? ([
          {
            id: "honorarium_available",
            label: "Nota de Honorários",
            sortable: false,
            filterable: false,
            width: 190,
            value: () => '',
            render: (row: Row) => {
              return (
                <button
                  type="button"
                  title="Preparar, consultar ou rever notas de honorários deste cliente."
                  onClick={() => setDocumentClient({ row, kind: "honorarium" })}
                  className="min-h-9 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 font-semibold text-surface disabled:cursor-not-allowed disabled:border disabled:border-border disabled:bg-surface-subtle disabled:text-text-secondary"
                >
                  Nota de Honorários
                </button>
              );
            },
          },
          {
            id: "collection_available",
            label: "Cobrança",
            kind: "boolean" as const,
            width: 135,
            value: (row: Row) => unpaidClientIds.has(row.id),
            render: (row: Row) => {
              const available = unpaidClientIds.has(row.id);
              return (
                <button
                  type="button"
                  disabled={!available}
                  title={
                    available
                      ? "Seleccionar movimentos facturados e não pagos para reforçar a cobrança."
                      : "Sem movimentos facturados e não pagos disponíveis."
                  }
                  onClick={() => setDocumentClient({ row, kind: "collection" })}
                  className="min-h-9 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 font-semibold text-surface disabled:cursor-not-allowed disabled:border disabled:border-border disabled:bg-surface-subtle disabled:text-text-secondary"
                >
                  Cobrança
                </button>
              );
            },
          },
        ] as TableColumn<Row>[])
      : []),
  ];
  const profile = (type: "individual" | "company") =>
    profiles.find((item) => item.client_type === type) ?? {
      client_type: type,
      client_code: "",
      active: false,
    };
  const editorOpen = Boolean(editing || creating),
    label = clientTypeFilter
      ? (
          {
            individual: "Particulares",
            company: "Empresas",
            mixed: "Mistos",
          } as const
        )[clientTypeFilter]
      : (sections.find((item) => item.id === section)?.label ?? "Entidades");
  const visibleRows =
    section === "clients" && clientTypeFilter
      ? rows.filter((row) => {
          const types = row.profile_types ?? [row.client_type ?? "individual"];
          return clientTypeFilter === "mixed"
            ? types.length > 1
            : types.includes(clientTypeFilter);
        })
      : rows;
  return (
    <div className="space-y-5">
      {!focusedRecordId && notice && (
        <p
          role="status"
          className="rounded-lg bg-success-soft p-3 text-sm text-success"
        >
          {notice}
        </p>
      )}
      {!focusedRecordId && <section className="card p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="sr-only">
              Lista · {label}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Clientes desta categoria. Abra a ficha com duplo clique numa
              linha.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void openCreator()}
            className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-surface"
          >
            Criar{" "}
            {section === "clients"
              ? "cliente"
              : section === "billing_entities"
                ? "Sociedade"
                : "Responsável"}
          </button>
        </div>
        <StandardDataTable
          id={`master-${section}-${clientTypeFilter ?? "all"}`}
          label={`Lista de ${label}`}
          rows={visibleRows}
          columns={columns}
          rowKey={(row) => row.id}
          loading={loading}
          error={
            !editorOpen && error
              ? `Não foi possível carregar a lista: ${error}`
              : undefined
          }
          onRetry={() => void load()}
          onRowDoubleClick={(row) => void openEditor(row)}
          defaultPageSize={20}
        />
      </section>}
      {focusedRecordId&&!editorOpen&&<div className="app-safe-fixed fixed z-[75] grid place-items-center bg-navigation/55 p-4"><section role="dialog" aria-modal="true" aria-label="Abrir ficha" className="card max-w-lg p-6"><p role={loading?'status':'alert'}>{loading?'A abrir ficha…':error||'A ficha não foi encontrada ou não está acessível.'}</p><button type="button" data-close-record disabled={saving} onClick={closeEditor} className="control mt-4 px-4">Fechar</button></section></div>}
      {editorOpen && (
        <div className="app-safe-fixed fixed z-[75] grid place-items-center bg-navigation/55 p-0 sm:p-4">
          <form
            onSubmit={save}
            onChangeCapture={event=>{if(!(event.target instanceof HTMLElement)||!event.target.closest('[data-independent-form]'))setDirty(true)}}
            role="dialog"
            aria-modal="true"
            aria-labelledby="entity-edit-title"
            className="card flex h-full max-h-dvh w-full max-w-6xl flex-col overflow-hidden rounded-none sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border bg-surface px-4 py-3 sm:px-6 sm:py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[.15em] text-secondary">
                  {creating
                    ? "Nova ficha"
                    : mode === "view"
                      ? "Consulta"
                      : "Edição"}
                </p>
                <h2
                  id="entity-edit-title"
                  className="mt-1 truncate font-display text-xl font-semibold sm:text-2xl"
                >
                  {creating ? "Criar entidade" : editName}
                </h2>
              </div>
              <button
                type="button"
                data-close-record disabled={saving} onClick={closeEditor}
                className="min-h-11 min-w-11 shrink-0 rounded-lg border border-border text-xl"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-4 sm:px-6">
              {section === "clients" && editing && (
                <nav
                  aria-label="Listas do cliente"
                  className="sticky top-0 z-10 -mx-4 grid grid-cols-2 gap-1.5 border-b border-border bg-surface px-4 py-2 shadow-sm sm:-mx-6 sm:grid-cols-4 lg:grid-cols-7 sm:px-6"
                >
                  {[
                    [
                      "Ver todos os registos",
                      `?view=work&clientId=${editing.id}`,
                      "Abrir a tabela completa de registos filtrada por este Cliente.",
                    ],
                    [
                      "Não facturados",
                      `?view=work&clientId=${editing.id}&collectionState=uninvoiced`,
                      "Listar apenas os movimentos ainda não facturados.",
                    ],
                    [
                      "Facturados não pagos",
                      `?view=work&clientId=${editing.id}&collectionState=unpaid`,
                      "Listar os movimentos facturados cujo pagamento continua pendente.",
                    ],
                    [
                      "Sem preço",
                      `?view=work&clientId=${editing.id}&missingPrice=true`,
                      "Listar movimentos deste Cliente sem preço definido.",
                    ],
                    [
                      "Sem sociedade",
                      `?view=work&clientId=${editing.id}&missingSociety=true`,
                      "Listar movimentos deste Cliente que ainda não têm Sociedade atribuída.",
                    ],
                  ].map(([text, href, description]) => (
                    <AppLink
                      key={text}
                      href={href}
                      title={description}
                    className={`flex min-h-9 items-center justify-center rounded-lg border px-2 text-center text-[11px] font-semibold leading-tight hover:text-white ${text === "Ver todos os registos" ? "border-primary bg-primary text-surface hover:bg-primary/90" : "border-secondary/45 bg-secondary-soft text-secondary hover:bg-secondary"}`}
                    >
                      {text}
                    </AppLink>
                  ))}
                  <button
                    type="button"
                    title="Preparar, consultar ou rever as notas de honorários do cliente."
                    onClick={() =>
                      setDocumentClient({ row: editing, kind: "honorarium" })
                    }
                    className="flex min-h-9 items-center justify-center rounded-lg bg-primary px-2 text-center text-[11px] font-semibold leading-tight text-surface disabled:cursor-not-allowed disabled:border disabled:border-border disabled:bg-surface-subtle disabled:text-text-secondary"
                  >
                    Nota de Honorários
                  </button>
                  <button
                    type="button"
                    disabled={!unpaidClientIds.has(editing.id)}
                    title={
                      unpaidClientIds.has(editing.id)
                        ? "Seleccionar movimentos facturados e não pagos para reforçar a cobrança."
                        : "Sem movimentos facturados e não pagos disponíveis."
                    }
                    onClick={() =>
                      setDocumentClient({ row: editing, kind: "collection" })
                    }
                    className="flex min-h-9 items-center justify-center rounded-lg bg-primary px-2 text-center text-[11px] font-semibold leading-tight text-surface disabled:cursor-not-allowed disabled:border disabled:border-border disabled:bg-surface-subtle disabled:text-text-secondary"
                  >
                    Cobrança
                  </button>
                </nav>
              )}
              {section === "clients" && (
                <nav aria-label="Páginas da ficha do cliente" className="sticky top-0 z-20 -mx-4 grid grid-cols-2 gap-2 border-b border-border bg-surface px-4 py-3 shadow-sm sm:-mx-6 sm:grid-cols-3 sm:px-6 lg:grid-cols-6">
                  {([['general','Geral'],['contacts','Contactos'],['billing','Facturação'],['retainer','Avença'],['provisions','Provisões'],['credentials','Credenciais'],['documents','Documentos']] as const).map(([id,label])=><button key={id} type="button" aria-current={clientPage===id?'page':undefined} onClick={()=>setClientPage(id)} className={`min-h-11 rounded-lg border px-3 text-sm font-semibold transition-colors ${clientPage===id?'border-primary bg-primary text-surface shadow-sm':'border-primary/35 bg-surface text-primary hover:bg-primary/10'}`}>{label}</button>)}
                </nav>
              )}
              <fieldset
                disabled={mode === "view" || (section === "clients" && !clientDetailsReady)}
                data-compact={mode === "view" ? "true" : "false"}
                data-client-page={section === "clients" ? clientPage : undefined}
                onDoubleClick={() => { if (mode === "view") setMode("edit") }}
                className="master-data-fields min-w-0"
              >
                <legend className="w-full pt-4">
                  {mode === "view" && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        setMode("edit");
                      }}
                      className="min-h-10 rounded-lg border border-primary/45 bg-primary/5 px-4 text-sm font-semibold text-primary"
                    >
                      Editar dados da ficha
                    </button>
                  )}
                </legend>
                <label className="mt-5 block text-sm font-semibold">
                  Nome
                  <input
                    required
                    maxLength={160}
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    className="control mt-1 w-full px-3"
                  />
                </label>
                {section !== "clients" && (
                  <label className="mt-4 flex min-h-11 items-center gap-3 rounded-lg border border-border px-3 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={editActive}
                      onChange={(event) => setEditActive(event.target.checked)}
                    />
                    {editActive ? "Entidade activa" : "Entidade inactiva"}
                  </label>
                )}
                {section === "clients" && (
                  <>
                    <fieldset className="mt-5">
                      <legend className="font-semibold">
                        Tipo e código do cliente
                      </legend>
                      {creating && (
                        <p className="mt-2 rounded-lg bg-warning-soft p-3 text-sm text-warning">
                          Escolha obrigatoriamente uma única opção. O prefixo 02
                          identifica Particulares e o prefixo 01 identifica
                          Empresas.
                        </p>
                      )}
                      {(["individual", "company"] as const)
                        .filter((type) => creating || showOtherProfile || profile(type).active)
                        .map((type) => {
                        const item = profile(type);
                        return (
                          <div
                            key={type}
                            className="mt-3 grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[auto_1fr] sm:items-end"
                          >
                            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
                              <input
                                type={creating ? "radio" : "checkbox"}
                                name={creating ? "new-client-type" : undefined}
                                checked={item.active}
                                onChange={(event) =>
                                  creating
                                    ? selectCreationProfile(type)
                                    : updateProfile(type, {
                                        active: event.target.checked,
                                        client_code:
                                          event.target.checked &&
                                          !item.client_code
                                            ? suggestedCodes[type]
                                            : item.client_code,
                                      })
                                }
                              />
                              {type === "individual" ? "Particular" : "Empresa"}
                            </label>
                            <label className="text-xs font-semibold">
                              Código desta vertente
                              <input
                                disabled={mode === "view" || !item.active}
                                required={item.active}
                                pattern={
                                  type === "individual"
                                    ? "02\\.\\d+"
                                    : "01\\.\\d+"
                                }
                                title={
                                  type === "individual"
                                    ? "O código de Particular deve começar por 02."
                                    : "O código de Empresa deve começar por 01."
                                }
                                value={item.client_code}
                                onChange={(event) =>
                                  updateProfile(type, {
                                    client_code: event.target.value,
                                  })
                                }
                                placeholder={
                                  suggestedCodes[type] || "A calcular…"
                                }
                                className="control mt-1 w-full px-3 text-sm"
                              />
                            </label>
                          </div>
                        );
                        })}
                      {!creating && !showOtherProfile && !profiles.every(item=>item.active) && <button type="button" className="control mt-3 px-3 text-sm font-semibold" onClick={()=>setShowOtherProfile(true)}>Acrescentar vertente {profile('individual').active?'Empresa':'Particular'}</button>}
                      {!creating && (
                        <p className="mt-2 text-xs text-text-secondary">
                          As vertentes existentes permanecem editáveis para
                          preservar os registos históricos.
                        </p>
                      )}
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <label className="text-sm font-semibold sm:col-span-2">
                          Angariador do cliente
                          <select aria-label="Angariador do cliente" value={details.client_referrer==='other'?(referrerOptions.find(item=>item.name===details.client_referrer_other)?.id??'other'):details.client_referrer} onChange={e=>{const recipient=referrerOptions.find(item=>item.id===e.target.value);setDetails({...details,client_referrer:recipient?'other':e.target.value,client_referrer_other:recipient?.name??''})}} className="control mt-1 w-full px-3"><option value="">Por preencher</option>{Object.entries(referrerNames).map(([id,label])=><option key={id} value={id}>{label}</option>)}{referrerOptions.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}<option value="other">Outro · acrescentar angariador</option></select>
                          <span className="mt-1 block text-xs font-normal text-text-secondary">Parcela de 10% nos registos da LEGALTEAM. Os clientes antigos podem ser completados posteriormente.</span>
                        </label>
                        {details.client_referrer==='other'&&<label className="text-sm font-semibold sm:col-span-2">Nome do angariador<input aria-label="Nome do angariador" required maxLength={200} value={details.client_referrer_other} onChange={e=>setDetails({...details,client_referrer_other:e.target.value})} className="control mt-1 w-full px-3"/><span className="mt-1 block text-xs font-normal text-text-secondary">Ao guardar, fica disponível para outros clientes e para a repartição.</span></label>}
                        <label className="text-sm font-semibold sm:col-span-2">Sociedade do cliente<select aria-label="Sociedade do cliente" value={details.primary_billing_entity_id} onChange={e=>setDetails({...details,primary_billing_entity_id:e.target.value})} className="control mt-1 w-full px-3"><option value="">Por atribuir</option>{billingOptions.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select><span className="mt-1 block text-xs font-normal text-text-secondary">Sociedade pela qual o cliente foi angariado. Cada movimento pode ser facturado por outra sociedade.</span></label>
                        <div className="rounded-xl border border-secondary/40 bg-secondary-soft p-3 sm:col-span-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold">Valor/hora do cliente</p>
                            {!showHourlyRate&&details.default_hourly_rate===''&&<button type="button" onClick={()=>setShowHourlyRate(true)} className="control px-3 text-sm font-semibold">Predefinir valor/hora</button>}
                          </div>
                          {(showHourlyRate||details.default_hourly_rate!=='')&&<div className="mt-3 flex flex-wrap items-end gap-3">
                            <label className="min-w-0 flex-1 text-sm font-semibold">Valor/hora predefinido (€)<input aria-label="Valor/hora predefinido (€)" type="number" min="0" max="9999999999.99" step="0.01" inputMode="decimal" value={details.default_hourly_rate} onChange={e=>setDetails({...details,default_hourly_rate:e.target.value})} className="control mt-1 w-full border-secondary px-3"/></label>
                            <button type="button" disabled={details.default_hourly_rate===''} onClick={()=>{setDetails({...details,default_hourly_rate:''});setShowHourlyRate(true);setDirty(true)}} className="control px-3 text-sm text-danger">Retirar predefinição</button>
                          </div>}
                          <p className="mt-2 text-xs text-text-secondary">Preenche os novos registos deste cliente. Pode alterar o valor em cada movimento. Guarde a ficha para aplicar a predefinição.</p>
                        </div>
                        <label className="text-sm font-semibold">
                          Denominação legal
                          <input
                            maxLength={200}
                            value={details.legal_name}
                            onChange={(e) =>
                              setDetails({
                                ...details,
                                legal_name: e.target.value,
                              })
                            }
                            className="control mt-1 w-full px-3"
                          />
                        </label>
                        <label className="text-sm font-semibold">
                          NIF
                          <input
                            maxLength={40}
                            value={details.tax_number}
                            onChange={(e) =>
                              setDetails({
                                ...details,
                                tax_number: e.target.value,
                              })
                            }
                            className="control mt-1 w-full px-3"
                          />
                        </label>
                      </div>
                    </fieldset>
                    <fieldset className="mt-6">
                      <legend className="font-semibold">
                        Identificação e contactos
                      </legend>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-border p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold">
                              Correios electrónicos
                            </p>
                            {mode === "edit" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEmails((current) => [...current, ""]);
                                  setDirty(true);
                                }}
                                className="rounded-md border border-border px-2 py-1 text-xs font-semibold text-primary"
                              >
                                + Adicionar
                              </button>
                            )}
                          </div>
                          {emails.map((email, index) => (
                            <div
                              key={index}
                              className="mt-2 flex items-center gap-2"
                            >
                              <input
                                aria-label={`Correio electrónico ${index + 1}`}
                                type="email"
                                maxLength={200}
                                value={email}
                                onChange={(e) =>
                                  setEmails((current) =>
                                    current.map((item, itemIndex) =>
                                      itemIndex === index
                                        ? e.target.value
                                        : item,
                                    ),
                                  )
                                }
                                placeholder="nome@exemplo.pt"
                                className="control min-w-0 flex-1 px-3"
                              />
                              {mode === "edit" && emails.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEmails((current) =>
                                      current.filter(
                                        (_, itemIndex) => itemIndex !== index,
                                      ),
                                    );
                                    setDirty(true);
                                  }}
                                  aria-label={`Remover correio electrónico ${index + 1}`}
                                  className="min-h-10 rounded-md border border-danger/40 px-2 text-danger"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="rounded-xl border border-border p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold">Telefones</p>
                            {mode === "edit" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPhones((current) => [...current, ""]);
                                  setDirty(true);
                                }}
                                className="rounded-md border border-border px-2 py-1 text-xs font-semibold text-primary"
                              >
                                + Adicionar
                              </button>
                            )}
                          </div>
                          {phones.map((phone, index) => (
                            <div
                              key={index}
                              className="mt-2 flex items-center gap-2"
                            >
                              <input
                                aria-label={`Telefone ${index + 1}`}
                                type="tel"
                                inputMode="tel"
                                maxLength={60}
                                value={phone}
                                onChange={(e) =>
                                  setPhones((current) =>
                                    current.map((item, itemIndex) =>
                                      itemIndex === index
                                        ? e.target.value
                                        : item,
                                    ),
                                  )
                                }
                                placeholder="Número de telefone"
                                className="control min-w-0 flex-1 px-3"
                              />
                              {mode === "edit" && phones.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPhones((current) =>
                                      current.filter(
                                        (_, itemIndex) => itemIndex !== index,
                                      ),
                                    );
                                    setDirty(true);
                                  }}
                                  aria-label={`Remover telefone ${index + 1}`}
                                  className="min-h-10 rounded-md border border-danger/40 px-2 text-danger"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <label className="text-sm font-semibold sm:col-span-2">
                          Morada
                          <textarea
                            maxLength={1000}
                            value={details.address}
                            onChange={(e) =>
                              setDetails({
                                ...details,
                                address: e.target.value,
                              })
                            }
                            className="control mt-1 min-h-20 w-full p-3"
                          />
                        </label>
                        <label className="text-sm font-semibold sm:col-span-2">
                          Notas
                          <textarea
                            maxLength={2000}
                            value={details.notes}
                            onChange={(e) =>
                              setDetails({ ...details, notes: e.target.value })
                            }
                            className="control mt-1 min-h-20 w-full p-3"
                          />
                        </label>
                      </div>
                    </fieldset>
                    <fieldset className="mt-6">
                      <legend className="font-semibold">
                        Dados para Notas de Honorários e Cobranças
                      </legend>
                      <p className="mt-1 text-xs text-text-secondary">
                        Estes dados serão usados como predefinição nos dois
                        tipos de documento.
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="text-sm font-semibold">
                          Destinatário
                          <input
                            maxLength={200}
                            value={details.honorarium_recipient_name}
                            onChange={(e) =>
                              setDetails({
                                ...details,
                                honorarium_recipient_name: e.target.value,
                              })
                            }
                            placeholder="Nome a apresentar no documento"
                            className="control mt-1 w-full px-3"
                          />
                        </label>
                        <label className="text-sm font-semibold">
                          Sociedade emissora
                          <select
                            value={details.default_billing_entity_id}
                            onChange={(e) =>
                              setDetails({
                                ...details,
                                default_billing_entity_id: e.target.value,
                              })
                            }
                            className="control mt-1 w-full px-3"
                          >
                            <option value="">
                              Seleccionar quando necessário
                            </option>
                            {billingOptions.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-sm font-semibold">
                          Idioma
                          <select
                            value={details.honorarium_language}
                            onChange={(e) =>
                              setDetails({
                                ...details,
                                honorarium_language: e.target
                                  .value as ClientDetails["honorarium_language"],
                              })
                            }
                            className="control mt-1 w-full px-3"
                          >
                            <option value="pt">Português</option>
                            <option value="en">Inglês</option>
                            <option value="fr">Francês</option>
                          </select>
                        </label>
                        <label className="text-sm font-semibold">
                          Forma de envio
                          <select
                            value={details.honorarium_delivery_method}
                            onChange={(e) =>
                              setDetails({
                                ...details,
                                honorarium_delivery_method: e.target
                                  .value as ClientDetails["honorarium_delivery_method"],
                              })
                            }
                            className="control mt-1 w-full px-3"
                          >
                            <option value="email">Correio electrónico</option>
                            <option value="post">Correio postal</option>
                            <option value="hand">Entrega em mão</option>
                          </select>
                        </label>
                      </div>
                    </fieldset>
                    <fieldset className="mt-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <legend className="font-semibold">
                          Documentos de identificação
                        </legend>
                        {mode === "edit" && identifiersAvailable && (
                          <button
                            type="button"
                            onClick={() => {
                              setIdentifiers((current) => [
                                ...current,
                                emptyIdentifier(),
                              ]);
                              setDirty(true);
                            }}
                            className="min-h-10 rounded-lg border border-border px-3 font-semibold text-primary"
                          >
                            Adicionar identificação
                          </button>
                        )}
                      </div>
                      {!identifiersAvailable ? (
                        <p className="mt-2 rounded-lg bg-warning-soft p-3 text-sm text-warning">
                          Esta área ficará disponível após a próxima
                          actualização controlada da base de dados.
                        </p>
                      ) : identifiers.length === 0 ? (
                        <p className="mt-2 text-sm text-text-secondary">
                          Sem documentos de identificação registados.
                        </p>
                      ) : (
                        identifiers.map((item, index) => (
                          <div
                            key={item.id ?? index}
                            className="mt-3 grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2"
                          >
                            <label className="text-sm font-semibold">
                              Tipo
                              <select
                                value={item.identifier_type}
                                onChange={(e) =>
                                  updateIdentifier(index, {
                                    identifier_type: e.target
                                      .value as Identifier["identifier_type"],
                                  })
                                }
                                className="control mt-1 w-full px-3"
                              >
                                {Object.entries(identifierLabels).map(
                                  ([value, text]) => (
                                    <option key={value} value={value}>
                                      {text}
                                    </option>
                                  ),
                                )}
                              </select>
                            </label>
                            <label className="text-sm font-semibold">
                              Número
                              <input
                                required
                                maxLength={100}
                                value={item.identifier_number}
                                onChange={(e) =>
                                  updateIdentifier(index, {
                                    identifier_number: e.target.value,
                                  })
                                }
                                className="control mt-1 w-full px-3"
                              />
                            </label>
                            <label className="text-sm font-semibold">
                              País emissor
                              <input
                                maxLength={100}
                                value={item.issuing_country}
                                onChange={(e) =>
                                  updateIdentifier(index, {
                                    issuing_country: e.target.value,
                                  })
                                }
                                className="control mt-1 w-full px-3"
                              />
                            </label>
                            <label className="text-sm font-semibold">
                              Entidade emissora
                              <input
                                maxLength={160}
                                value={item.issuing_authority}
                                onChange={(e) =>
                                  updateIdentifier(index, {
                                    issuing_authority: e.target.value,
                                  })
                                }
                                className="control mt-1 w-full px-3"
                              />
                            </label>
                            <label className="text-sm font-semibold">
                              Data de emissão
                              <input
                                type="date"
                                value={item.issued_on}
                                onChange={(e) =>
                                  updateIdentifier(index, {
                                    issued_on: e.target.value,
                                  })
                                }
                                className="control mt-1 w-full px-3"
                              />
                            </label>
                            <label className="text-sm font-semibold">
                              Validade
                              <input
                                type="date"
                                value={item.expires_on}
                                onChange={(e) =>
                                  updateIdentifier(index, {
                                    expires_on: e.target.value,
                                  })
                                }
                                className="control mt-1 w-full px-3"
                              />
                            </label>
                            <label className="text-sm font-semibold sm:col-span-2">
                              Notas do documento
                              <input
                                maxLength={500}
                                value={item.notes}
                                onChange={(e) =>
                                  updateIdentifier(index, {
                                    notes: e.target.value,
                                  })
                                }
                                className="control mt-1 w-full px-3"
                              />
                            </label>
                            {mode === "edit" && (
                              <button
                                type="button"
                                onClick={() => void removeIdentifier(index)}
                                className="min-h-10 rounded-lg border border-danger/40 px-3 font-semibold text-danger sm:col-span-2 sm:justify-self-end"
                              >
                                Eliminar identificação
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </fieldset>
                  </>
                )}
              </fieldset>
              {section === "billing_entities" && (
                <>
                  <fieldset disabled={mode === "view"} className="mt-6">
                    <legend className="font-semibold">
                      Dados da Sociedade
                    </legend>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {(
                        [
                          ["legal_name", "Denominação legal"],
                          ["tax_number", "NIF"],
                          ["email", "Correio electrónico"],
                          ["phone", "Telefone"],
                        ] as const
                      ).map(([key, text]) => (
                        <label key={key} className="text-sm font-semibold">
                          {text}
                          <input
                            value={billingDetails[key]}
                            onChange={(e) =>
                              setBillingDetails({
                                ...billingDetails,
                                [key]: e.target.value,
                              })
                            }
                            className="control mt-1 w-full px-3"
                          />
                        </label>
                      ))}
                      <label className="text-sm font-semibold">
                        Moeda predefinida
                        <input
                          value={billingDetails.default_currency}
                          onChange={(e) =>
                            setBillingDetails({
                              ...billingDetails,
                              default_currency: e.target.value,
                            })
                          }
                          className="control mt-1 w-full px-3"
                        />
                      </label>
                      <label className="text-sm font-semibold">
                        IVA predefinido (%)
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={billingDetails.default_vat_rate}
                          onChange={(e) =>
                            setBillingDetails({
                              ...billingDetails,
                              default_vat_rate: e.target.value,
                            })
                          }
                          className="control mt-1 w-full px-3"
                        />
                      </label>
                      <label className="text-sm font-semibold sm:col-span-2">
                        Morada
                        <textarea
                          value={billingDetails.address}
                          onChange={(e) =>
                            setBillingDetails({
                              ...billingDetails,
                              address: e.target.value,
                            })
                          }
                          className="control mt-1 min-h-20 w-full p-3"
                        />
                      </label>
                    </div>
                  </fieldset>
                  <SocietyLogoCropper
                    disabled={mode === "view"}
                    existingUrl={logoUrl}
                    onChange={(blob) => {
                      setLogoBlob(blob);
                      setRemoveLogo(false);
                      setDirty(true);
                    }}
                    onRemove={() => {
                      setLogoBlob(null);
                      setRemoveLogo(true);
                      setLogoUrl("");
                      setDirty(true);
                    }}
                  />
                  <fieldset disabled={mode === "view"} className="mt-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <legend className="font-semibold">Dados bancários</legend>
                      {mode === "edit" && (
                        <button
                          type="button"
                          onClick={() => {
                            setBankAccounts((current) => [
                              ...current,
                              emptyBankAccount(),
                            ]);
                            setDirty(true);
                          }}
                          className="min-h-10 rounded-lg border border-border px-3 font-semibold text-primary"
                        >
                          Adicionar dados bancários
                        </button>
                      )}
                    </div>
                    {bankAccounts.length === 0 ? (
                      <p className="mt-2 text-sm text-text-secondary">
                        Sem dados bancários registados.
                      </p>
                    ) : (
                      bankAccounts.map((account, index) => (
                        <div
                          key={index}
                          className="mt-3 grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2"
                        >
                          <p className="font-semibold sm:col-span-2">
                            Conta bancária {index + 1}
                            {index === 0 ? " · principal" : ""}
                          </p>
                          {(
                            [
                              ["account_holder", "Titular da conta"],
                              ["bank_name", "Banco"],
                              ["account_number", "Número da conta"],
                              ["iban", "IBAN"],
                              ["bic_swift", "BIC / SWIFT"],
                              ["currency", "Moeda"],
                            ] as const
                          ).map(([key, text]) => (
                            <label key={key} className="text-sm font-semibold">
                              {text}
                              <input
                                value={account[key]}
                                onChange={(event) =>
                                  updateBankAccount(index, {
                                    [key]: event.target.value,
                                  })
                                }
                                className="control mt-1 w-full px-3"
                              />
                            </label>
                          ))}
                          {mode === "edit" && (
                            <button
                              type="button"
                              onClick={() => {
                                setBankAccounts((current) =>
                                  current.filter(
                                    (_, itemIndex) => itemIndex !== index,
                                  ),
                                );
                                setDirty(true);
                              }}
                              className="min-h-10 rounded-lg border border-danger/40 px-3 font-semibold text-danger sm:col-span-2 sm:justify-self-end"
                            >
                              Remover dados bancários
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </fieldset>
                </>
              )}
              {section === "clients" && editing && clientPage === "retainer" && (
                <>
                  <ClientRetainerPanel
                    firmId={editing.firm_id}
                    clientId={editing.id}
                    readOnly={mode === "view"}
                    onRequestEdit={() => setMode("edit")}
                  />
                </>
              )}{" "}
              {section === "clients" && editing && clientPage === "provisions" && <ClientCreditPanel key={editing.id} clientId={editing.id} readOnly={mode === "view"} onRequestEdit={()=>setMode("edit")}/>}
              {section === "clients" && editing && clientPage === "credentials" && <ClientCredentialsPanel clientId={editing.id} readOnly={mode === "view"}/>}
              {section === "clients" && editing && clientPage === "documents" && <ClientDocumentsPanel firmId={editing.firm_id} clientId={editing.id} readOnly={mode === "view"}/>}
              {error && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg bg-danger-soft p-3 text-sm text-danger"
                >
                  {error}
                </p>
              )}
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-border bg-surface px-4 py-3 sm:flex sm:justify-end sm:px-6">
              <button
                type="button"
                data-close-record disabled={saving} onClick={closeEditor}
                className="min-h-11 rounded-lg border border-border px-4 font-semibold"
              >
                Fechar
              </button>
              {(
                <button
                  type="button"
                  disabled={saving || !dirty}
                  onClick={() => void cancelChanges()}
                  className="record-cancel min-h-11 rounded-lg border px-4 font-semibold"
                >
                  Cancelar alterações
                </button>
              )}
              {mode === "view" ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    setMode("edit");
                  }}
                  className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-surface"
                >
                  Editar
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={saving || !dirty || !editName.trim() || (section==="clients"&&!clientDetailsReady)}
                  className="record-save min-h-11 rounded-lg border px-4 font-semibold"
                >
                  {saving ? "A guardar…" : "Guardar alterações"}
                </button>
              )}
            </div>
          </form>
        </div>
      )}
      {documentClient && (
        <Suspense
          fallback={
            <div
              role="status"
              className="app-safe-fixed fixed z-[80] grid place-items-center bg-navigation/55"
            >
              <div className="card flex items-center gap-3 p-5">
                <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="font-semibold">A preparar o documento…</span>
              </div>
            </div>
          }
        >
          <HonorariumNoteModal
            clientId={documentClient.row.id}
            clientName={documentClient.row.display_name ?? "Cliente"}
            documentKind={documentClient.kind}
            onClose={() => setDocumentClient(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
