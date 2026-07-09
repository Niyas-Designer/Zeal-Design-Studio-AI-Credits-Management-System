import { DEFAULT_AI_TOOLS } from "@/lib/ai-tools";
import { SUPPLIERS, USAGE_CATEGORIES } from "@/lib/constants";
import {
  firebaseGetCurrentProfile,
  firebaseGetUsers,
  firebaseGoogleSignIn,
  firebaseLogout,
  firebaseOnAuthChange,
  firebaseResetPassword,
  firebaseSetUserDisabled,
  firebaseSignIn,
  firebaseSignUp,
  firebaseUpdateUserRole
} from "@/lib/firebase";
import { ensureSupabase, supabase } from "@/lib/supabase";
import type {
  AiUsage,
  AiUsageInput,
  AiTool,
  AiToolInput,
  CreditLedgerEntry,
  CreditPurchase,
  CreditPurchaseInput,
  Payment,
  PaymentInput,
  Profile,
  UserRole
} from "@/lib/types";

function now() {
  return new Date().toISOString();
}

function isAdminRole(role?: string | null) {
  return role === "super_admin" || role === "admin" || role === "manager";
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
  return base || crypto.randomUUID();
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

function legacyPlatformKey() {
  return ["fr", "eepik"].join("");
}

export async function getCurrentUser() {
  return firebaseGetCurrentProfile();
}

export async function signIn(email: string, password: string, _remember = true) {
  return firebaseSignIn(email, password, _remember);
}

export async function signUp(email: string, password: string, fullName: string) {
  return firebaseSignUp(email, password, fullName);
}

export async function signInWithGoogle(_remember = true) {
  return firebaseGoogleSignIn(_remember);
}

export async function simulatePasswordReset(email: string) {
  return firebaseResetPassword(email);
}

export async function signOut() {
  await firebaseLogout();
}

export function onAuthChange(callback: (profile: Profile | null) => void) {
  return firebaseOnAuthChange(callback);
}

export async function getUsers() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];
  if (!isAdminRole(currentUser.role)) return [currentUser];
  return firebaseGetUsers();
}

export async function updateUserRole(userId: string, role: UserRole) {
  await firebaseUpdateUserRole(userId, role);
}

export async function setUserDisabled(userId: string, disabled: boolean) {
  await firebaseSetUserDisabled(userId, disabled);
}

function normalizeUsageRecord(record: AiUsage): AiUsage {
  return {
    ...record,
    platform: normalizePlatformLabel(record.platform),
    category: normalizeUsageCategory(record.category),
    supplier_requirements: normalizeSupplier(record.supplier_requirements)
  };
}

export async function getUsage(currentUser: Profile) {
  const query = ensureSupabase()
    .from("ai_usage")
    .select("*, profiles:user_id(email, full_name)")
    .order("date", { ascending: false });
  if (!isAdminRole(currentUser.role)) query.eq("user_id", currentUser.id);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => normalizeUsageRecord(row as AiUsage));
}

export async function saveUsage(input: AiUsageInput, recordId?: string) {
  const client = ensureSupabase();
  const numberOfStyles = Number(input.number_of_styles) || 0;
  const calculatedImages = numberOfStyles * 6;
  const calculatedCreditsUsed = calculatedImages * 150;
  const { data: purchases, error: purchaseError } = await client
    .from("credit_purchases")
    .select("total_credits_purchased")
    .eq("user_id", input.user_id)
    .eq("platform", input.platform);
  if (purchaseError) throw purchaseError;
  const purchasedCredits = (purchases ?? []).reduce((sum, item) => sum + Number(item.total_credits_purchased || 0), 0);

  let usageQuery = client
    .from("ai_usage")
    .select("credits_used")
    .eq("user_id", input.user_id)
    .eq("platform", input.platform);
  if (recordId) usageQuery = usageQuery.neq("id", recordId);
  const { data: usage, error: usageError } = await usageQuery;
  if (usageError) throw usageError;
  const previousUsage = (usage ?? []).reduce((sum, item) => sum + Number(item.credits_used || 0), 0);
  const remainingCredits = purchasedCredits - previousUsage - calculatedCreditsUsed;
  if (remainingCredits < 0) throw new Error("Insufficient Credits. Please purchase more credits.");

  const payload = {
    ...input,
    category: normalizeUsageCategory(input.category),
    supplier_requirements: normalizeSupplier(input.supplier_requirements),
    buy_credits: purchasedCredits,
    number_of_images: calculatedImages,
    credits_used: calculatedCreditsUsed,
    remaining_credits: remainingCredits,
    updated_at: now()
  };

  const { error } = recordId
    ? await client.from("ai_usage").update(payload).eq("id", recordId)
    : await client.from("ai_usage").insert(payload);
  if (error) throw error;
}

export async function deleteUsage(recordId: string) {
  const { error } = await ensureSupabase().from("ai_usage").delete().eq("id", recordId);
  if (error) throw error;
}

export async function getPurchases(currentUser?: Profile) {
  let query = ensureSupabase()
    .from("credit_purchases")
    .select("*, profiles:user_id(email, full_name)")
    .order("purchase_date", { ascending: false });
  if (currentUser && !isAdminRole(currentUser.role)) query = query.eq("user_id", currentUser.id);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    platform: normalizePlatformLabel(row.platform),
    invoice_name: row.invoice_name ?? row.invoice_number ?? "Imported invoice",
    due_date: row.due_date ?? null,
    subtotal: Number(row.subtotal || 0),
    tax_amount: Number(row.tax_amount || 0),
    discount_amount: Number(row.discount_amount || 0),
    amount_paid: Number(row.amount_paid || row.purchase_amount || 0),
    balance_due: Number(row.balance_due || 0),
    payment_status: row.payment_status ?? "Unknown",
    customer_name: row.customer_name ?? null,
    billing_address: row.billing_address ?? null,
    extracted_json: row.extracted_json ?? null,
    ocr_text: row.ocr_text ?? null
  })) as CreditPurchase[];
}

export async function savePurchase(input: CreditPurchaseInput, purchaseId?: string, options?: { allowDuplicateInvoice?: boolean }) {
  const client = ensureSupabase();
  if (!options?.allowDuplicateInvoice && input.invoice_number) {
    let duplicateQuery = client
      .from("credit_purchases")
      .select("id")
      .eq("invoice_number", input.invoice_number)
      .limit(1);
    if (purchaseId) duplicateQuery = duplicateQuery.neq("id", purchaseId);
    const { data, error } = await duplicateQuery;
    if (error) throw error;
    if (data?.length) throw new Error("Duplicate invoice uploaded. Please use a unique invoice number.");
  }
  const payload = { ...input, updated_at: now() };
  const { error } = purchaseId
    ? await client.from("credit_purchases").update(payload).eq("id", purchaseId)
    : await client.from("credit_purchases").insert(payload);
  if (error) throw error;
}

export async function deletePurchase(purchaseId: string) {
  const { error } = await ensureSupabase().from("credit_purchases").delete().eq("id", purchaseId);
  if (error) throw error;
}

export async function getPayments(currentUser?: Profile) {
  let query = ensureSupabase()
    .from("payments")
    .select("*, profiles:user_id(email, full_name)")
    .order("paid_at", { ascending: false });
  if (currentUser && !isAdminRole(currentUser.role)) query = query.eq("user_id", currentUser.id);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((payment) => ({
    ...payment,
    tax_amount: Number(payment.tax_amount || 0),
    total_amount: Number(payment.total_amount || payment.amount || 0)
  })) as Payment[];
}

export async function savePayment(input: PaymentInput, paymentId?: string) {
  const client = ensureSupabase();
  const { data: duplicate, error: duplicateError } = await client
    .from("payments")
    .select("id")
    .or(`invoice_number.eq.${input.invoice_number},payment_id.eq.${input.payment_id},transaction_id.eq.${input.transaction_id}`)
    .neq("id", paymentId ?? "00000000-0000-0000-0000-000000000000")
    .limit(1);
  if (duplicateError) throw duplicateError;
  if (duplicate?.length) throw new Error("Invoice already uploaded. Credits were not added.");

  const previous = paymentId ? (await client.from("payments").select("*").eq("id", paymentId).maybeSingle()).data as Payment | null : null;
  const { error } = paymentId
    ? await client.from("payments").update({ ...input, updated_at: now() }).eq("id", paymentId)
    : await client.from("payments").insert(input);
  if (error) throw error;

  const delta = Number(input.credits || 0) - Number(previous?.credits || 0);
  if (delta !== 0 || !paymentId) await addCredits(input.customer_email, delta, input.payment_id, input.invoice_number);
  window.dispatchEvent(new Event("credits-updated"));
}

export async function deletePayment(paymentId: string) {
  const client = ensureSupabase();
  const { data: payment, error: readError } = await client.from("payments").select("*").eq("id", paymentId).maybeSingle();
  if (readError) throw readError;
  const { error } = await client.from("payments").delete().eq("id", paymentId);
  if (error) throw error;
  if (payment) await addCredits(payment.customer_email, -Number(payment.credits || 0), payment.payment_id, payment.invoice_number);
}

async function addCredits(email: string, delta: number, paymentId: string, invoiceNumber: string) {
  const client = ensureSupabase();
  const normalizedEmail = email.toLowerCase();
  const { data: profile, error: readError } = await client
    .from("profiles")
    .select("id, credits")
    .eq("email", normalizedEmail)
    .maybeSingle();
  if (readError) throw readError;
  const total = Math.max(0, Number(profile?.credits || 0) + delta);
  if (profile) {
    const { error } = await client.from("profiles").update({ credits: total, updated_at: now() }).eq("id", profile.id);
    if (error) throw error;
  }
  const { error: ledgerError } = await client.from("credit_ledger").insert({
    customer_email: normalizedEmail,
    payment_id: paymentId,
    invoice_number: invoiceNumber,
    credits_added: delta,
    total_credits: total
  });
  if (ledgerError) throw ledgerError;
}

export async function getUserCredits(email: string) {
  const { data, error } = await ensureSupabase()
    .from("profiles")
    .select("credits")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return Number(data?.credits || 0);
}

export async function getCreditLedger(email?: string) {
  let query = ensureSupabase()
    .from("credit_ledger")
    .select("*")
    .order("created_at", { ascending: false });
  if (email) query = query.eq("customer_email", email.toLowerCase());
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CreditLedgerEntry[];
}

export async function getUsageCategories() {
  return [...USAGE_CATEGORIES];
}

export async function saveUsageCategory(_category: string) {
  return;
}

export async function getAiTools() {
  const { data, error } = await ensureSupabase()
    .from("ai_tools")
    .select("*")
    .order("popularity", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AiTool[];
}

export async function saveAiTool(input: AiToolInput, toolId?: string) {
  const payload = { ...input, updated_at: now() };
  const { error } = toolId
    ? await ensureSupabase().from("ai_tools").update(payload).eq("id", toolId)
    : await ensureSupabase().from("ai_tools").insert({ id: makeToolId(input.name), ...payload });
  if (error) throw error;
}

export async function deleteAiTool(toolId: string) {
  const { error } = await ensureSupabase().from("ai_tools").delete().eq("id", toolId);
  if (error) throw error;
}

export async function resetAiTools() {
  const client = ensureSupabase();
  const { error: deleteError } = await client.from("ai_tools").delete().neq("id", "");
  if (deleteError) throw deleteError;
  const { error } = await client.from("ai_tools").insert(DEFAULT_AI_TOOLS);
  if (error) throw error;
  return getAiTools();
}

export function subscribeToBusinessChanges(callback: () => void) {
  if (!supabase) return () => undefined;
  const client = supabase;
  const channel = client
    .channel("business-data")
    .on("postgres_changes", { event: "*", schema: "public", table: "ai_usage" }, callback)
    .on("postgres_changes", { event: "*", schema: "public", table: "credit_purchases" }, callback)
    .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, callback)
    .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, callback)
    .on("postgres_changes", { event: "*", schema: "public", table: "ai_tools" }, callback)
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}
