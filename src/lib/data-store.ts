import { DEFAULT_AI_TOOLS } from "@/lib/ai-tools";
import { SUPPLIERS, USAGE_CATEGORIES } from "@/lib/constants";
import type {
  AiTool,
  AiToolInput,
  AiUsage,
  AiUsageInput,
  CreditLedgerEntry,
  CreditPurchase,
  CreditPurchaseInput,
  Payment,
  PaymentInput,
  Profile,
  UserRole
} from "@/lib/types";

const DB_KEY = "zeal_offline_local_database_v1";
const SESSION_KEY = "zeal_offline_authenticated";
const LOCAL_PASSWORD = "@arddesign6Z";
const CHANGE_EVENT = "zeal-local-data-change";
const LOCAL_PROFILE_EMAIL = "niyas.zealdesigner@gmail.com";
const LOCAL_PROFILE_NAME = "Niyas Zeal Designer";
const CREDITS_PER_IMAGE = 150;

type LocalDatabase = {
  version: 1;
  profiles: Profile[];
  usage: AiUsage[];
  purchases: CreditPurchase[];
  payments: Payment[];
  ledger: CreditLedgerEntry[];
  aiTools: AiTool[];
};

function now() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function makeToolId(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || makeId("tool");
}

function legacyPlatformKey() {
  return ["fr", "eepik"].join("");
}

function normalizePlatformLabel<T extends string>(value: T) {
  return value.toLowerCase() === legacyPlatformKey() ? "Magnific" as T : value;
}

function normalizeUsageCategory(value: string | null | undefined) {
  return USAGE_CATEGORIES.includes(value as (typeof USAGE_CATEGORIES)[number])
    ? value as (typeof USAGE_CATEGORIES)[number]
    : "Design Studio";
}

function normalizeSupplier(value: string | null | undefined) {
  return SUPPLIERS.includes(value as (typeof SUPPLIERS)[number])
    ? value as (typeof SUPPLIERS)[number]
    : "Syad";
}

function getTotalUsageCredits(record: Pick<AiUsage, "number_of_images" | "wastage">) {
  return (Number(record.number_of_images || 0) + Number(record.wastage || 0)) * CREDITS_PER_IMAGE;
}

function defaultProfile(): Profile {
  const timestamp = now();
  return {
    id: "local_admin",
    email: LOCAL_PROFILE_EMAIL,
    full_name: LOCAL_PROFILE_NAME,
    role: "super_admin",
    disabled: false,
    credits: 0,
    created_at: timestamp,
    updated_at: timestamp
  };
}

function createDatabase(): LocalDatabase {
  return {
    version: 1,
    profiles: [defaultProfile()],
    usage: [],
    purchases: [],
    payments: [],
    ledger: [],
    aiTools: DEFAULT_AI_TOOLS
  };
}

function sanitizeDatabase(value: unknown): LocalDatabase {
  const fallback = createDatabase();
  if (!value || typeof value !== "object") return fallback;
  const input = value as Partial<LocalDatabase>;
  const profiles = Array.isArray(input.profiles) && input.profiles.length ? input.profiles : fallback.profiles;
  const database: LocalDatabase = {
    version: 1,
    profiles,
    usage: Array.isArray(input.usage) ? input.usage : [],
    purchases: Array.isArray(input.purchases) ? input.purchases : [],
    payments: Array.isArray(input.payments) ? input.payments : [],
    ledger: Array.isArray(input.ledger) ? input.ledger : [],
    aiTools: Array.isArray(input.aiTools) && input.aiTools.length ? input.aiTools : fallback.aiTools
  };
  database.profiles = database.profiles.map((profile, index) => {
    const normalized = {
      ...fallback.profiles[0],
      ...profile,
      disabled: Boolean(profile.disabled),
      credits: Number(profile.credits || 0)
    };
    return index === 0
      ? { ...normalized, id: "local_admin", email: LOCAL_PROFILE_EMAIL, full_name: LOCAL_PROFILE_NAME, role: "super_admin" }
      : normalized;
  });
  database.purchases = database.purchases.map(normalizePurchaseRecord);
  database.usage = recalculateUsageBalances(database.usage.map(normalizeUsageRecord), database.purchases);
  database.payments = database.payments.map(normalizePaymentRecord);
  database.ledger = database.ledger.map((entry) => ({
    ...entry,
    credits_added: Number(entry.credits_added || 0),
    total_credits: Number(entry.total_credits || 0)
  }));
  return database;
}

function readDatabase() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    const database = raw ? sanitizeDatabase(JSON.parse(raw)) : createDatabase();
    localStorage.setItem(DB_KEY, JSON.stringify(database));
    return database;
  } catch (error) {
    console.warn("Local database was corrupted and has been reset.", error);
    const database = createDatabase();
    localStorage.setItem(DB_KEY, JSON.stringify(database));
    return database;
  }
}

function writeDatabase(database: LocalDatabase) {
  localStorage.setItem(DB_KEY, JSON.stringify(sanitizeDatabase(database)));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function getSessionProfile(database = readDatabase()) {
  return localStorage.getItem(SESSION_KEY) === "true" ? database.profiles[0] ?? null : null;
}

function attachProfiles<T extends { user_id: string }>(records: T[], profiles: Profile[]) {
  return records.map((record) => {
    const profile = profiles.find((item) => item.id === record.user_id);
    return {
      ...record,
      profiles: profile ? { email: profile.email, full_name: profile.full_name } : null
    };
  });
}

function normalizeUsageRecord(record: AiUsage): AiUsage {
  const numberOfImages = Number(record.number_of_images || 0);
  const wastage = Number(record.wastage || 0);
  return {
    ...record,
    platform: normalizePlatformLabel(record.platform),
    category: normalizeUsageCategory(record.category),
    supplier_requirements: normalizeSupplier(record.supplier_requirements),
    buy_credits: Number(record.buy_credits || 0),
    number_of_styles: Number(record.number_of_styles || 0),
    number_of_images: numberOfImages,
    wastage,
    credits_used: getTotalUsageCredits({ number_of_images: numberOfImages, wastage }),
    remaining_credits: Number(record.remaining_credits || 0)
  };
}

function recalculateUsageBalances(records: AiUsage[], purchases: CreditPurchase[]) {
  const purchasedByUserPlatform = new Map<string, number>();
  purchases.forEach((purchase) => {
    const key = `${purchase.user_id}:${purchase.platform}`;
    purchasedByUserPlatform.set(key, (purchasedByUserPlatform.get(key) ?? 0) + Number(purchase.total_credits_purchased || 0));
  });

  const runningByUserPlatform = new Map<string, number>();
  return records
    .slice()
    .sort((a, b) => `${a.date}-${a.created_at}`.localeCompare(`${b.date}-${b.created_at}`))
    .map((record) => {
      const key = `${record.user_id}:${record.platform}`;
      const creditsUsed = getTotalUsageCredits(record);
      const running = (runningByUserPlatform.get(key) ?? 0) + creditsUsed;
      runningByUserPlatform.set(key, running);
      const purchasedCredits = purchasedByUserPlatform.get(key) ?? Number(record.buy_credits || 0);
      return {
        ...record,
        buy_credits: purchasedCredits,
        credits_used: creditsUsed,
        remaining_credits: purchasedCredits - running
      };
    });
}

function normalizePurchaseRecord(record: CreditPurchase): CreditPurchase {
  return {
    ...record,
    platform: normalizePlatformLabel(record.platform),
    invoice_name: record.invoice_name ?? record.invoice_number ?? "Imported invoice",
    due_date: record.due_date ?? null,
    subtotal: Number(record.subtotal || 0),
    tax_amount: Number(record.tax_amount || 0),
    discount_amount: Number(record.discount_amount || 0),
    purchase_amount: Number(record.purchase_amount || 0),
    amount_paid: Number(record.amount_paid || record.purchase_amount || 0),
    balance_due: Number(record.balance_due || 0),
    payment_status: record.payment_status ?? "Unknown",
    total_credits_purchased: Number(record.total_credits_purchased || 0),
    customer_name: record.customer_name ?? null,
    billing_address: record.billing_address ?? null,
    extracted_json: record.extracted_json ?? null,
    ocr_text: record.ocr_text ?? null
  };
}

function normalizePaymentRecord(payment: Payment): Payment {
  return {
    ...payment,
    amount: Number(payment.amount || 0),
    credits: Number(payment.credits || 0),
    tax_amount: Number(payment.tax_amount || 0),
    total_amount: Number(payment.total_amount || payment.amount || 0)
  };
}

function sortDesc<T>(records: T[], field: keyof T) {
  return records.slice().sort((a, b) => String(b[field] ?? "").localeCompare(String(a[field] ?? "")));
}

function isAdminRole(role?: string | null) {
  return role === "super_admin" || role === "admin" || role === "manager";
}

export async function getCurrentUser() {
  return getSessionProfile();
}

export async function signIn(_email: string, password: string) {
  if (password !== LOCAL_PASSWORD) throw new Error("Invalid password.");
  const database = readDatabase();
  const profile = database.profiles[0] ?? defaultProfile();
  if (profile.disabled) throw new Error("Local user is disabled.");
  localStorage.setItem(SESSION_KEY, "true");
  return profile;
}

export async function signOut() {
  localStorage.removeItem(SESSION_KEY);
}

export function onAuthChange(callback: (profile: Profile | null) => void) {
  callback(getSessionProfile());
  const onStorage = () => callback(getSessionProfile());
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onStorage);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onStorage);
  };
}

export async function getUsers() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];
  if (!isAdminRole(currentUser.role)) return [currentUser];
  return readDatabase().profiles;
}

export async function updateUserRole(userId: string, role: UserRole) {
  const database = readDatabase();
  database.profiles = database.profiles.map((profile) =>
    profile.id === userId ? { ...profile, role, updated_at: now() } : profile
  );
  writeDatabase(database);
}

export async function setUserDisabled(userId: string, disabled: boolean) {
  const database = readDatabase();
  database.profiles = database.profiles.map((profile) =>
    profile.id === userId ? { ...profile, disabled, updated_at: now() } : profile
  );
  writeDatabase(database);
}

export async function getUsage(currentUser: Profile) {
  const database = readDatabase();
  const records = isAdminRole(currentUser.role)
    ? database.usage
    : database.usage.filter((record) => record.user_id === currentUser.id);
  return sortDesc(attachProfiles(records, database.profiles), "date");
}

export async function saveUsage(input: AiUsageInput, recordId?: string) {
  const database = readDatabase();
  const numberOfStyles = Number(input.number_of_styles) || 0;
  const calculatedImages = numberOfStyles * 6;
  const calculatedWastage = Number(input.wastage || 0);
  const calculatedCreditsUsed = (calculatedImages + calculatedWastage) * CREDITS_PER_IMAGE;
  const purchasedCredits = database.purchases
    .filter((purchase) => purchase.user_id === input.user_id && purchase.platform === input.platform)
    .reduce((sum, item) => sum + Number(item.total_credits_purchased || 0), 0);
  const previousUsage = database.usage
    .filter((record) => record.user_id === input.user_id && record.platform === input.platform && record.id !== recordId)
    .reduce((sum, item) => sum + Number(item.credits_used || 0), 0);
  const remainingCredits = purchasedCredits - previousUsage - calculatedCreditsUsed;
  if (remainingCredits < 0) throw new Error("Insufficient Credits. Please purchase more credits.");

  const timestamp = now();
  const payload: AiUsage = {
    ...input,
    id: recordId ?? makeId("usage"),
    category: normalizeUsageCategory(input.category),
    supplier_requirements: normalizeSupplier(input.supplier_requirements),
    buy_credits: purchasedCredits,
    number_of_images: calculatedImages,
    wastage: calculatedWastage,
    credits_used: calculatedCreditsUsed,
    remaining_credits: remainingCredits,
    created_at: database.usage.find((record) => record.id === recordId)?.created_at ?? timestamp,
    updated_at: timestamp
  };

  database.usage = recordId
    ? database.usage.map((record) => record.id === recordId ? payload : record)
    : [payload, ...database.usage];
  writeDatabase(database);
}

export async function deleteUsage(recordId: string) {
  const database = readDatabase();
  database.usage = database.usage.filter((record) => record.id !== recordId);
  writeDatabase(database);
}

export async function getPurchases(currentUser?: Profile) {
  const database = readDatabase();
  const records = currentUser && !isAdminRole(currentUser.role)
    ? database.purchases.filter((record) => record.user_id === currentUser.id)
    : database.purchases;
  return sortDesc(attachProfiles(records.map(normalizePurchaseRecord), database.profiles), "purchase_date");
}

export async function savePurchase(input: CreditPurchaseInput, purchaseId?: string, options?: { allowDuplicateInvoice?: boolean }) {
  const database = readDatabase();
  if (!options?.allowDuplicateInvoice && input.invoice_number) {
    const duplicate = database.purchases.find((purchase) =>
      normalizeKey(purchase.invoice_number) === normalizeKey(input.invoice_number) && purchase.id !== purchaseId
    );
    if (duplicate) throw new Error("Duplicate invoice uploaded. Please use a unique invoice number.");
  }
  const timestamp = now();
  const previous = database.purchases.find((purchase) => purchase.id === purchaseId);
  const payload = normalizePurchaseRecord({
    ...input,
    id: purchaseId ?? makeId("purchase"),
    created_at: previous?.created_at ?? timestamp,
    updated_at: timestamp
  });
  database.purchases = purchaseId
    ? database.purchases.map((purchase) => purchase.id === purchaseId ? payload : purchase)
    : [payload, ...database.purchases];
  writeDatabase(database);
}

export async function deletePurchase(purchaseId: string) {
  const database = readDatabase();
  database.purchases = database.purchases.filter((purchase) => purchase.id !== purchaseId);
  writeDatabase(database);
}

export async function getPayments(currentUser?: Profile) {
  const database = readDatabase();
  const records = currentUser && !isAdminRole(currentUser.role)
    ? database.payments.filter((record) => record.user_id === currentUser.id || normalizeKey(record.customer_email) === normalizeKey(currentUser.email))
    : database.payments;
  return sortDesc(attachProfiles(records.map(normalizePaymentRecord), database.profiles), "paid_at");
}

export async function savePayment(input: PaymentInput, paymentId?: string) {
  const database = readDatabase();
  const duplicate = database.payments.find((payment) => {
    if (payment.id === paymentId) return false;
    return [payment.invoice_number, payment.payment_id, payment.transaction_id]
      .filter(Boolean)
      .some((value) => [input.invoice_number, input.payment_id, input.transaction_id].filter(Boolean).map(normalizeKey).includes(normalizeKey(value)));
  });
  if (duplicate) throw new Error("Invoice already uploaded. Credits were not added.");

  const previous = database.payments.find((payment) => payment.id === paymentId) ?? null;
  const timestamp = now();
  const payload = normalizePaymentRecord({
    ...input,
    id: paymentId ?? makeId("payment"),
    created_at: previous?.created_at ?? timestamp,
    updated_at: timestamp
  });
  database.payments = paymentId
    ? database.payments.map((payment) => payment.id === paymentId ? payload : payment)
    : [payload, ...database.payments];

  const delta = Number(input.credits || 0) - Number(previous?.credits || 0);
  if (delta !== 0 || !paymentId) addCredits(database, input.customer_email, delta, input.payment_id, input.invoice_number);
  writeDatabase(database);
  window.dispatchEvent(new Event("credits-updated"));
}

export async function deletePayment(paymentId: string) {
  const database = readDatabase();
  const payment = database.payments.find((item) => item.id === paymentId);
  database.payments = database.payments.filter((item) => item.id !== paymentId);
  if (payment) addCredits(database, payment.customer_email, -Number(payment.credits || 0), payment.payment_id, payment.invoice_number);
  writeDatabase(database);
  window.dispatchEvent(new Event("credits-updated"));
}

function addCredits(database: LocalDatabase, email: string, delta: number, paymentId: string, invoiceNumber: string) {
  const normalizedEmail = normalizeKey(email);
  let profile = database.profiles.find((item) => normalizeKey(item.email) === normalizedEmail);
  if (!profile) {
    const timestamp = now();
    profile = {
      id: makeId("profile"),
      email: normalizedEmail,
      full_name: normalizedEmail.split("@")[0] || "Local User",
      role: "customer",
      disabled: false,
      credits: 0,
      created_at: timestamp,
      updated_at: timestamp
    };
    database.profiles.push(profile);
  }
  const total = Math.max(0, Number(profile.credits || 0) + delta);
  database.profiles = database.profiles.map((item) =>
    item.id === profile?.id ? { ...item, credits: total, updated_at: now() } : item
  );
  database.ledger = [{
    id: makeId("ledger"),
    customer_email: normalizedEmail,
    payment_id: paymentId,
    invoice_number: invoiceNumber,
    credits_added: delta,
    total_credits: total,
    created_at: now()
  }, ...database.ledger];
}

export async function getUserCredits(email: string) {
  const profile = readDatabase().profiles.find((item) => normalizeKey(item.email) === normalizeKey(email));
  return Number(profile?.credits || 0);
}

export async function getCreditLedger(email?: string) {
  const database = readDatabase();
  const records = email
    ? database.ledger.filter((entry) => normalizeKey(entry.customer_email) === normalizeKey(email))
    : database.ledger;
  return sortDesc(records, "created_at");
}

export async function getUsageCategories() {
  return [...USAGE_CATEGORIES];
}

export async function saveUsageCategory(_category: string) {
  return;
}

export async function getAiTools() {
  return readDatabase().aiTools.slice().sort((a, b) => b.popularity - a.popularity);
}

export async function saveAiTool(input: AiToolInput, toolId?: string) {
  const database = readDatabase();
  const timestamp = now();
  const previous = database.aiTools.find((tool) => tool.id === toolId);
  const payload: AiTool = {
    ...input,
    id: toolId ?? makeToolId(input.name),
    created_at: previous?.created_at ?? timestamp,
    updated_at: timestamp
  };
  database.aiTools = toolId
    ? database.aiTools.map((tool) => tool.id === toolId ? payload : tool)
    : [payload, ...database.aiTools.filter((tool) => tool.id !== payload.id)];
  writeDatabase(database);
}

export async function deleteAiTool(toolId: string) {
  const database = readDatabase();
  database.aiTools = database.aiTools.filter((tool) => tool.id !== toolId);
  writeDatabase(database);
}

export async function resetAiTools() {
  const database = readDatabase();
  database.aiTools = DEFAULT_AI_TOOLS;
  writeDatabase(database);
  return getAiTools();
}

export function subscribeToBusinessChanges(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
