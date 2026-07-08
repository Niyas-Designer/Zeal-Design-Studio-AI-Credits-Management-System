import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AI_TOOL_CATEGORIES, AI_TOOL_LOGOS, DEFAULT_AI_TOOLS } from "@/lib/ai-tools";
import { SUPPLIERS, USAGE_CATEGORIES } from "@/lib/constants";
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

const USERS_STATE_KEY = "zeal_frontend_user_state";
const USER_CREDITS_KEY = "zeal_user_credits";
const USAGE_KEY = "zeal_ai_usage_records";
const PAYMENTS_KEY = "zeal_payment_records";
const CREDIT_LEDGER_KEY = "zeal_credit_ledger";
const AI_TOOLS_KEY = "zeal_ai_studio_tools";
const PURCHASES_KEY = "zeal_credit_purchases";
const USAGE_CATEGORIES_KEY = "zeal_usage_categories";
const ADMIN_EMAILS = new Set(["niyas.zealdesigner@gmail.com"]);

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function ensureAuth() {
  if (!auth) {
    throw new Error("Firebase is not configured yet. Add your Firebase environment variables and restart the app.");
  }
  return auth;
}

function friendlyAuthError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";

  const messages: Record<string, string> = {
    "auth/account-exists-with-different-credential": "An account already exists with another sign-in method.",
    "auth/email-already-in-use": "This email is already registered. Please sign in instead.",
    "auth/invalid-credential": "Invalid Email or Password.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/network-request-failed": "Network error. Please check your connection and try again.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/user-not-found": "No account was found for this email.",
    "auth/weak-password": "Password is too weak. Use at least 8 characters.",
    "auth/wrong-password": "Invalid Email or Password."
  };

  return messages[code] ?? (error instanceof Error ? error.message : "Authentication failed. Please try again.");
}

function passwordProviderNeedsVerification(user: User) {
  return user.providerData.some((provider) => provider.providerId === "password") && !user.emailVerified;
}

function profileFromAuthUser(user: User): Profile {
  const email = user.email ?? "";
  const credits = readJson<Record<string, number>>(USER_CREDITS_KEY, {});
  const state = readJson<Record<string, Partial<Pick<Profile, "role" | "disabled" | "updated_at">>>>(
    USERS_STATE_KEY,
    {}
  );
  const overrides = state[user.uid] ?? {};
  const createdAt = user.metadata.creationTime ? new Date(user.metadata.creationTime).toISOString() : now();
  const updatedAt = user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toISOString() : createdAt;

  return {
    id: user.uid,
    email,
    full_name: user.displayName || email.split("@")[0] || "Fashion User",
    role: (overrides.role ?? (ADMIN_EMAILS.has(email) ? "admin" : "user")) as UserRole,
    disabled: overrides.disabled ?? false,
    credits: credits[email.toLowerCase()] ?? 0,
    created_at: createdAt,
    updated_at: overrides.updated_at ?? updatedAt
  };
}

function withProfile<T extends { user_id: string; profiles?: Pick<Profile, "email" | "full_name"> | null }>(
  record: T,
  currentUser?: Profile
) {
  const profile = currentUser?.id === record.user_id ? currentUser : null;
  return {
    ...record,
    profiles: profile ? { email: profile.email, full_name: profile.full_name } : record.profiles ?? null
  };
}

export async function getCurrentUser() {
  const user = auth?.currentUser;
  if (!user || passwordProviderNeedsVerification(user)) return null;

  const profile = profileFromAuthUser(user);
  return profile.disabled ? null : profile;
}

export async function signIn(email: string, password: string, remember = true) {
  try {
    const client = ensureAuth();
    await setPersistence(client, remember ? browserLocalPersistence : browserSessionPersistence);
    const credential = await signInWithEmailAndPassword(client, email, password);
    if (passwordProviderNeedsVerification(credential.user)) {
      await sendEmailVerification(credential.user);
      await firebaseSignOut(client);
      throw new Error("Please verify your email before signing in. We sent a new verification email.");
    }
    const profile = profileFromAuthUser(credential.user);
    if (profile.disabled) throw new Error("This account has been disabled.");
    return profile;
  } catch (error) {
    throw new Error(friendlyAuthError(error));
  }
}

export async function signUp(email: string, password: string, fullName: string) {
  try {
    const client = ensureAuth();
    const credential = await createUserWithEmailAndPassword(client, email, password);
    await updateProfile(credential.user, { displayName: fullName });
    await sendEmailVerification(credential.user);
    await firebaseSignOut(client);
  } catch (error) {
    throw new Error(friendlyAuthError(error));
  }
}

export async function signInWithGoogle(remember = true) {
  try {
    const client = ensureAuth();
    await setPersistence(client, remember ? browserLocalPersistence : browserSessionPersistence);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const credential = await signInWithPopup(client, provider);
    const profile = profileFromAuthUser(credential.user);
    if (profile.disabled) {
      await firebaseSignOut(client);
      throw new Error("This account has been disabled.");
    }
    return profile;
  } catch (error) {
    throw new Error(friendlyAuthError(error));
  }
}

export async function simulatePasswordReset(email: string) {
  try {
    await sendPasswordResetEmail(ensureAuth(), email);
  } catch (error) {
    throw new Error(friendlyAuthError(error));
  }
}

export async function signOut() {
  await firebaseSignOut(ensureAuth());
}

export function onAuthChange(callback: (profile: Profile | null) => void) {
  if (!auth) {
    callback(null);
    return () => undefined;
  }

  return onAuthStateChanged(auth, (user) => {
    if (!user || passwordProviderNeedsVerification(user)) {
      callback(null);
      return;
    }

    const profile = profileFromAuthUser(user);
    callback(profile.disabled ? null : profile);
  });
}

export async function getUsers() {
  const currentUser = await getCurrentUser();
  return currentUser ? [currentUser] : [];
}

export async function updateUserRole(_userId: string, _role: UserRole) {
  const state = readJson<Record<string, Partial<Pick<Profile, "role" | "disabled" | "updated_at">>>>(
    USERS_STATE_KEY,
    {}
  );
  writeJson(USERS_STATE_KEY, {
    ...state,
    [_userId]: {
      ...state[_userId],
      role: _role,
      updated_at: now()
    }
  });
}

export async function setUserDisabled(_userId: string, _disabled: boolean) {
  const state = readJson<Record<string, Partial<Pick<Profile, "role" | "disabled" | "updated_at">>>>(
    USERS_STATE_KEY,
    {}
  );
  writeJson(USERS_STATE_KEY, {
    ...state,
    [_userId]: {
      ...state[_userId],
      disabled: _disabled,
      updated_at: now()
    }
  });
}

export async function getUsage(currentUser: Profile) {
  const rawRecords = readJson<AiUsage[]>(USAGE_KEY, []);
  const records = rawRecords.map(normalizeUsageRecord);
  if (JSON.stringify(rawRecords) !== JSON.stringify(records)) writeJson(USAGE_KEY, records);
  const visible = currentUser.role === "admin" ? records : records.filter((record) => record.user_id === currentUser.id);
  return visible
    .map((record) => withProfile(record, currentUser))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveUsage(input: AiUsageInput, recordId?: string) {
  const records = readJson<AiUsage[]>(USAGE_KEY, []).map(normalizeUsageRecord);
  const timestamp = now();
  const numberOfStyles = Number(input.number_of_styles) || 0;
  const calculatedImages = numberOfStyles * 6;
  const calculatedCreditsUsed = calculatedImages * 150;
  const purchases = readJson<CreditPurchase[]>(PURCHASES_KEY, []).map(normalizePurchasePlatform);
  const purchasedCredits = purchases
    .filter((purchase) => purchase.user_id === input.user_id && purchase.platform === input.platform)
    .reduce((sum, purchase) => sum + Number(purchase.total_credits_purchased || 0), 0);
  const previousPlatformUsage = records
    .filter((record) => record.id !== recordId && record.user_id === input.user_id && record.platform === input.platform)
    .reduce((sum, record) => sum + Number(record.credits_used || 0), 0);
  const remainingCredits = purchasedCredits - previousPlatformUsage - calculatedCreditsUsed;
  if (remainingCredits < 0) {
    throw new Error("Insufficient Credits. Please purchase more credits.");
  }
  const calculatedInput = {
    ...input,
    category: normalizeUsageCategory(input.category),
    supplier_requirements: normalizeSupplier(input.supplier_requirements),
    buy_credits: purchasedCredits,
    number_of_images: calculatedImages,
    credits_used: calculatedCreditsUsed
  };

  if (recordId) {
    writeJson(
      USAGE_KEY,
      records.map((record) =>
        record.id === recordId
          ? {
              ...record,
              ...calculatedInput,
              remaining_credits: remainingCredits,
              updated_at: timestamp
            }
          : record
      )
    );
    return;
  }

  const record: AiUsage = {
    ...calculatedInput,
    id: id("usage"),
    remaining_credits: remainingCredits,
    created_at: timestamp,
    updated_at: timestamp,
    profiles: null
  };
  writeJson(USAGE_KEY, [record, ...records]);
}

export async function deleteUsage(recordId: string) {
  writeJson(
    USAGE_KEY,
    readJson<AiUsage[]>(USAGE_KEY, []).filter((record) => record.id !== recordId)
  );
}

export async function getPayments(currentUser?: Profile) {
  const payments = readJson<Payment[]>(PAYMENTS_KEY, []);
  const visible = currentUser?.role === "user" ? payments.filter((payment) => payment.user_id === currentUser.id) : payments;
  return visible
    .map((payment) =>
      withProfile(
        {
          ...payment,
          tax_amount: Number(payment.tax_amount || 0),
          total_amount: Number(payment.total_amount || payment.amount || 0)
        },
        currentUser
      )
    )
    .sort((a, b) => b.paid_at.localeCompare(a.paid_at));
}

export async function savePayment(input: PaymentInput, paymentId?: string) {
  const payments = readJson<Payment[]>(PAYMENTS_KEY, []);
  const timestamp = now();
  const duplicate = payments.find((payment) => {
    if (payment.id === paymentId) return false;
    const sameInvoice = normalizeKey(payment.invoice_number) === normalizeKey(input.invoice_number);
    const samePayment = normalizeKey(payment.payment_id) === normalizeKey(input.payment_id);
    const sameTransaction = normalizeKey(payment.transaction_id) === normalizeKey(input.transaction_id);
    return sameInvoice || samePayment || sameTransaction;
  });
  if (duplicate) throw new Error("Invoice already uploaded. Credits were not added.");
  const previousPayment = paymentId ? payments.find((payment) => payment.id === paymentId) : null;

  if (paymentId) {
    const previousCredits = Number(previousPayment?.credits || 0);
    const nextCredits = Number(input.credits || 0);
    const customerChanged =
      previousPayment && normalizeKey(previousPayment.customer_email) !== normalizeKey(input.customer_email);
    writeJson(
      PAYMENTS_KEY,
      payments.map((payment) =>
        payment.id === paymentId
          ? {
              ...payment,
              ...input,
              updated_at: timestamp
            }
          : payment
      )
    );
    if (customerChanged && previousPayment) {
      updateCredits(previousPayment.customer_email, -previousCredits);
      const totalCredits = updateCredits(input.customer_email, nextCredits);
      appendCreditLedger({
        customer_email: input.customer_email,
        payment_id: input.payment_id,
        invoice_number: input.invoice_number,
        credits_added: nextCredits,
        total_credits: totalCredits,
        created_at: timestamp
      });
    } else {
      const delta = nextCredits - previousCredits;
      const totalCredits = updateCredits(input.customer_email, delta);
      if (delta !== 0) {
        appendCreditLedger({
          customer_email: input.customer_email,
          payment_id: input.payment_id,
          invoice_number: input.invoice_number,
          credits_added: delta,
          total_credits: totalCredits,
          created_at: timestamp
        });
      }
    }
    window.dispatchEvent(new Event("credits-updated"));
    return;
  }

  const payment: Payment = {
    ...input,
    id: id("payment"),
    created_at: timestamp,
    updated_at: timestamp,
    profiles: null
  };
  writeJson(PAYMENTS_KEY, [payment, ...payments]);
  const totalCredits = updateCredits(input.customer_email, Number(input.credits || 0));
  appendCreditLedger({
    customer_email: input.customer_email,
    payment_id: input.payment_id,
    invoice_number: input.invoice_number,
    credits_added: Number(input.credits || 0),
    total_credits: totalCredits,
    created_at: timestamp
  });
  window.dispatchEvent(new Event("credits-updated"));
}

export async function deletePayment(paymentId: string) {
  const payments = readJson<Payment[]>(PAYMENTS_KEY, []);
  const payment = payments.find((item) => item.id === paymentId);
  if (payment) updateCredits(payment.customer_email, -Number(payment.credits || 0));
  writeJson(
    PAYMENTS_KEY,
    payments.filter((payment) => payment.id !== paymentId)
  );
}

export async function getUserCredits(email: string) {
  return readJson<Record<string, number>>(USER_CREDITS_KEY, {})[email.toLowerCase()] ?? 0;
}

function updateCredits(email: string, delta: number) {
  const key = email.toLowerCase();
  const credits = readJson<Record<string, number>>(USER_CREDITS_KEY, {});
  const total = Math.max(0, Number(credits[key] || 0) + delta);
  writeJson(USER_CREDITS_KEY, {
    ...credits,
    [key]: total
  });
  return total;
}

function appendCreditLedger(entry: Omit<CreditLedgerEntry, "id">) {
  const ledger = readJson<CreditLedgerEntry[]>(CREDIT_LEDGER_KEY, []);
  writeJson(CREDIT_LEDGER_KEY, [{ ...entry, id: id("ledger") }, ...ledger]);
}

export async function getCreditLedger(email?: string) {
  const ledger = readJson<CreditLedgerEntry[]>(CREDIT_LEDGER_KEY, []);
  const normalizedEmail = email?.toLowerCase();
  return (normalizedEmail ? ledger.filter((entry) => entry.customer_email.toLowerCase() === normalizedEmail) : ledger).sort(
    (a, b) => b.created_at.localeCompare(a.created_at)
  );
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function normalizePlatformLabel(value: string) {
  return value.toLowerCase() === legacyPlatformKey() ? "Magnific" : value;
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

function normalizeUsageRecord(record: AiUsage): AiUsage {
  return {
    ...record,
    platform: normalizePlatformLabel(record.platform) as AiUsage["platform"],
    category: normalizeUsageCategory(record.category),
    supplier_requirements: normalizeSupplier(record.supplier_requirements)
  };
}

function normalizePurchasePlatform(purchase: CreditPurchase): CreditPurchase {
  return {
    ...purchase,
    platform: normalizePlatformLabel(purchase.platform) as CreditPurchase["platform"],
  };
}

function normalizeAiToolName(tool: AiTool): AiTool {
  const legacy = legacyPlatformKey();
  const legacyTitle = `${legacy.charAt(0).toUpperCase()}${legacy.slice(1)}`;
  const legacyAi = `${legacyTitle} AI`;
  const replaceText = (value: string) =>
    value
      .replaceAll(legacyAi, "Magnific")
      .replaceAll(legacyTitle, "Magnific")
      .replaceAll(legacy, "magnific");
  if (!JSON.stringify(tool).toLowerCase().includes(legacy)) return tool;
  const legacyToolId = `${legacy}-ai`;
  const legacyDomain = `${legacy}.com`;
  return {
    ...tool,
    id: tool.id === legacyToolId ? "magnific" : tool.id,
    name: replaceText(tool.name),
    description: replaceText(tool.description),
    long_description: replaceText(tool.long_description),
    logo_url: replaceText(tool.logo_url),
    monthly_pricing: replaceText(tool.monthly_pricing),
    latest_update: replaceText(tool.latest_update),
    features: tool.features.map(replaceText),
    pricing_plans: tool.pricing_plans.map(replaceText),
    pros: tool.pros.map(replaceText),
    cons: tool.cons.map(replaceText),
    use_cases: tool.use_cases.map(replaceText),
    alternatives: tool.alternatives.map(replaceText),
    website_url: tool.website_url.includes(legacyDomain) ? "https://magnific.ai/" : replaceText(tool.website_url),
    pricing_url: tool.pricing_url.includes(legacyDomain) ? "https://magnific.ai/pricing" : replaceText(tool.pricing_url),
    docs_url: tool.docs_url.includes(legacyDomain) ? "https://magnific.ai/" : replaceText(tool.docs_url),
    api_url: replaceText(tool.api_url),
    download_url: replaceText(tool.download_url)
  };
}

function legacyPlatformKey() {
  return ["fr", "eepik"].join("");
}

export async function getPurchases(currentUser?: Profile) {
  const purchases = readJson<CreditPurchase[]>(PURCHASES_KEY, []).map(normalizePurchasePlatform);
  const visible = currentUser?.role === "user" ? purchases.filter((purchase) => purchase.user_id === currentUser.id) : purchases;
  return visible
    .map((purchase) =>
      withProfile(
        {
          ...purchase,
          invoice_name: purchase.invoice_name ?? purchase.invoice_number ?? "Imported invoice",
          due_date: purchase.due_date ?? null,
          subtotal: Number(purchase.subtotal || 0),
          tax_amount: Number(purchase.tax_amount || 0),
          discount_amount: Number(purchase.discount_amount || 0),
          amount_paid: Number(purchase.amount_paid || purchase.purchase_amount || 0),
          balance_due: Number(purchase.balance_due || 0),
          payment_status: purchase.payment_status ?? "Unknown",
          customer_name: purchase.customer_name ?? null,
          billing_address: purchase.billing_address ?? null,
          extracted_json: purchase.extracted_json ?? null,
          ocr_text: purchase.ocr_text ?? null
        },
        currentUser
      )
    )
    .sort((a, b) => b.purchase_date.localeCompare(a.purchase_date));
}

export async function savePurchase(input: CreditPurchaseInput, purchaseId?: string, options?: { allowDuplicateInvoice?: boolean }) {
  const purchases = readJson<CreditPurchase[]>(PURCHASES_KEY, []).map(normalizePurchasePlatform);
  const timestamp = now();
  const duplicate = purchases.find((purchase) => purchase.id !== purchaseId && purchase.invoice_number.toLowerCase() === input.invoice_number.toLowerCase());
  if (duplicate && !options?.allowDuplicateInvoice) throw new Error("Duplicate invoice uploaded. Please use a unique invoice number.");

  if (purchaseId) {
    writeJson(
      PURCHASES_KEY,
      purchases.map((purchase) =>
        purchase.id === purchaseId
          ? {
              ...purchase,
              ...input,
              updated_at: timestamp
            }
          : purchase
      )
    );
    return;
  }

  const purchase: CreditPurchase = {
    ...input,
    id: id("purchase"),
    created_at: timestamp,
    updated_at: timestamp,
    profiles: null
  };
  writeJson(PURCHASES_KEY, [purchase, ...purchases]);
}

export async function deletePurchase(purchaseId: string) {
  writeJson(
    PURCHASES_KEY,
    readJson<CreditPurchase[]>(PURCHASES_KEY, []).filter((purchase) => purchase.id !== purchaseId)
  );
}

export async function getUsageCategories() {
  writeJson(USAGE_CATEGORIES_KEY, [...USAGE_CATEGORIES]);
  return [...USAGE_CATEGORIES];
}

export async function saveUsageCategory(category: string) {
  const value = category.trim();
  if (!USAGE_CATEGORIES.includes(value as (typeof USAGE_CATEGORIES)[number])) return;
  const categories = readJson<string[]>(USAGE_CATEGORIES_KEY, []);
  if (!categories.some((item) => item.toLowerCase() === value.toLowerCase())) {
    writeJson(USAGE_CATEGORIES_KEY, [...categories, value].sort((a, b) => a.localeCompare(b)));
  }
}

export async function getAiTools() {
  const saved = readJson<AiTool[] | null>(AI_TOOLS_KEY, null);
  if (saved?.length) {
    const validCategories = new Set<string>(AI_TOOL_CATEGORIES);
    const needsReset = saved.some((tool) => !validCategories.has(tool.category) || typeof tool.active !== "boolean");
    const migrated = saved.map((tool) => {
      const logo = AI_TOOL_LOGOS[tool.id];
      const normalizedTool = normalizeAiToolName(tool);
      return logo ? { ...normalizedTool, logo_url: logo } : normalizedTool;
    });
    const changed = migrated.some((tool, index) => JSON.stringify(tool) !== JSON.stringify(saved[index]));
    if (changed) writeJson(AI_TOOLS_KEY, migrated);
    if (!needsReset) return migrated;
  }
  writeJson(AI_TOOLS_KEY, DEFAULT_AI_TOOLS);
  return DEFAULT_AI_TOOLS;
}

export async function saveAiTool(input: AiToolInput, toolId?: string) {
  const tools = await getAiTools();
  const timestamp = now();

  if (toolId) {
    writeJson(
      AI_TOOLS_KEY,
      tools.map((tool) =>
        tool.id === toolId
          ? {
              ...tool,
              ...input,
              updated_at: timestamp
            }
          : tool
      )
    );
    return;
  }

  const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const record: AiTool = {
    ...input,
    id: `${slug || "tool"}_${crypto.randomUUID?.() ?? Date.now()}`,
    created_at: timestamp,
    updated_at: timestamp
  };
  writeJson(AI_TOOLS_KEY, [record, ...tools]);
}

export async function deleteAiTool(toolId: string) {
  writeJson(
    AI_TOOLS_KEY,
    (await getAiTools()).filter((tool) => tool.id !== toolId)
  );
}

export async function resetAiTools() {
  writeJson(AI_TOOLS_KEY, DEFAULT_AI_TOOLS);
  return DEFAULT_AI_TOOLS;
}
