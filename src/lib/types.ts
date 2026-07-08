import type { PLATFORMS } from "@/lib/constants";

export type UserRole = "admin" | "user";
export type Platform = (typeof PLATFORMS)[number];
export type InvoiceFile = {
  name: string;
  type: string;
  size: number;
  data_url: string;
  uploaded_at: string;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  disabled: boolean;
  credits: number;
  created_at: string;
  updated_at: string;
};

export type AiUsage = {
  id: string;
  date: string;
  platform: Platform;
  category: string;
  buy_credits: number;
  description: string;
  number_of_styles: number;
  number_of_images: number;
  credits_used: number;
  remaining_credits: number;
  supplier_requirements: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, "email" | "full_name"> | null;
};

export type AiUsageInput = Omit<
  AiUsage,
  "id" | "remaining_credits" | "created_at" | "updated_at" | "profiles"
>;

export type PaymentMethod =
  | "UPI"
  | "Credit Card"
  | "Debit Card"
  | "Net Banking"
  | "Bank Transfer";

export type PaymentStatus = "Pending" | "Paid" | "Failed" | "Refunded";

export type Payment = {
  id: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
  payment_id: string;
  transaction_id: string;
  order_id: string;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  payment_detail: string | null;
  payment_status: PaymentStatus;
  credits: number;
  tax_amount: number;
  total_amount: number;
  invoice_file_url: string | null;
  invoice_file: InvoiceFile | null;
  vendor: string;
  paid_at: string;
  invoice_number: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, "email" | "full_name"> | null;
};

export type PaymentInput = Omit<
  Payment,
  "id" | "created_at" | "updated_at" | "profiles"
>;

export type CreditLedgerEntry = {
  id: string;
  customer_email: string;
  payment_id: string;
  invoice_number: string;
  credits_added: number;
  total_credits: number;
  created_at: string;
};

export type CreditPurchase = {
  id: string;
  user_id: string;
  platform: Platform;
  purchase_date: string;
  subscription_plan: string;
  invoice_number: string;
  currency: string;
  purchase_amount: number;
  total_credits_purchased: number;
  expiry_date: string | null;
  payment_method: PaymentMethod;
  vendor: string;
  notes: string | null;
  invoice_file: InvoiceFile | null;
  extracted_json: Record<string, unknown> | null;
  ocr_text: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, "email" | "full_name"> | null;
};

export type CreditPurchaseInput = Omit<
  CreditPurchase,
  "id" | "created_at" | "updated_at" | "profiles"
>;

export type AiToolCategory =
  | "AI Chat"
  | "AI Coding"
  | "AI Image Generation"
  | "AI Video Generation"
  | "AI Voice"
  | "AI Music"
  | "AI Writing"
  | "AI Presentations"
  | "AI Productivity"
  | "AI Automation"
  | "AI Design"
  | "AI Development"
  | "Documentation"
  | "Database"
  | "API Platforms";

export type AiToolPricingType = "Free" | "Freemium" | "Paid";
export type AiToolUpdateStatus = "Latest" | "Recently Updated" | "Stable" | "Beta" | "New Release";

export type AiTool = {
  id: string;
  name: string;
  category: AiToolCategory;
  description: string;
  long_description: string;
  logo_url: string;
  pricing_type: AiToolPricingType;
  monthly_pricing: string;
  update_status: AiToolUpdateStatus;
  rating: number;
  popularity: number;
  featured: boolean;
  trending: boolean;
  recommended: boolean;
  new_release: boolean;
  latest_update: string;
  features: string[];
  pricing_plans: string[];
  pros: string[];
  cons: string[];
  use_cases: string[];
  alternatives: string[];
  website_url: string;
  pricing_url: string;
  docs_url: string;
  api_url: string;
  download_url: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type AiToolInput = Omit<AiTool, "id" | "created_at" | "updated_at">;
