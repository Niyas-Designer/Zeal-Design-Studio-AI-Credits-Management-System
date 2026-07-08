import { z } from "zod";
import { AI_TOOL_CATEGORIES } from "@/lib/ai-tools";
import { PLATFORMS } from "@/lib/constants";

const nonNegative = z.coerce.number().min(0, "Value cannot be negative");
const optionalUrl = z.string().trim().optional().refine((value) => !value || z.string().url().safeParse(value).success, "Enter a valid URL");

export const aiUsageSchema = z
  .object({
    date: z.string().min(1, "Date is required"),
    platform: z.enum(PLATFORMS, { required_error: "Platform is required" }),
    category: z.string().trim().min(2, "Category is required"),
    buy_credits: nonNegative,
    description: z.string().trim().min(3, "Description is required"),
    number_of_styles: z.coerce.number().int().min(0, "Styles cannot be negative"),
    number_of_images: z.coerce.number().int().min(0, "Images cannot be negative"),
    credits_used: nonNegative,
    supplier_requirements: z.string().trim().optional().nullable()
  })
  .refine((data) => data.credits_used <= data.buy_credits, {
    message: "Credits used must not exceed buy credits",
    path: ["credits_used"]
  });

export type AiUsageFormValues = z.infer<typeof aiUsageSchema>;

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email")
});

export const signupSchema = z
  .object({
    full_name: z.string().trim().min(2, "Full name is required"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(8, "Confirm your password")
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"]
  });

export const paymentSchema = z.object({
  customer_name: z.string().trim().min(2, "Customer name is required"),
  customer_email: z.string().email("Enter a valid email"),
  payment_id: z.string().trim().min(2, "Payment ID is required"),
  transaction_id: z.string().trim().min(2, "Transaction ID is required"),
  order_id: z.string().trim().min(2, "Order ID is required"),
  amount: z.coerce.number().min(0, "Amount cannot be negative"),
  credits: z.coerce.number().int().min(1, "Credits purchased is required"),
  tax_amount: z.coerce.number().min(0, "Tax cannot be negative").optional(),
  total_amount: z.coerce.number().min(0, "Total amount cannot be negative").optional(),
  currency: z.string().trim().min(2, "Currency is required"),
  payment_method: z.enum(["UPI", "Credit Card", "Debit Card", "Net Banking", "Bank Transfer"]),
  vendor: z.string().trim().min(2, "Vendor name is required"),
  paid_at: z.string().min(1, "Date and time is required"),
  invoice_number: z.string().trim().min(2, "Invoice number is required"),
  notes: z.string().trim().optional().nullable()
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;

export const purchaseSchema = z.object({
  platform: z.enum(PLATFORMS, { required_error: "Platform is required" }),
  purchase_date: z.string().min(1, "Purchase date is required"),
  subscription_plan: z.string().trim().min(2, "Subscription plan is required"),
  invoice_number: z.string().trim().min(2, "Invoice number is required"),
  currency: z.string().trim().min(2, "Currency is required"),
  purchase_amount: z.coerce.number().min(0, "Purchase amount cannot be negative"),
  total_credits_purchased: z.coerce.number().min(1, "Credits purchased is required"),
  expiry_date: z.string().optional().nullable(),
  payment_method: z.enum(["UPI", "Credit Card", "Debit Card", "Net Banking", "Bank Transfer"]),
  vendor: z.string().trim().min(2, "Vendor is required"),
  notes: z.string().trim().optional().nullable()
});

export type PurchaseFormValues = z.infer<typeof purchaseSchema>;

export const aiToolSchema = z.object({
  name: z.string().trim().min(2, "Tool name is required"),
  category: z.enum(AI_TOOL_CATEGORIES, { required_error: "Category is required" }),
  description: z.string().trim().min(12, "Description is required"),
  long_description: z.string().trim().min(24, "Long description is required"),
  logo_url: z.string().trim().min(1, "Logo URL is required"),
  pricing_type: z.enum(["Free", "Freemium", "Paid"]),
  monthly_pricing: z.string().trim().min(2, "Pricing summary is required"),
  update_status: z.enum(["Latest", "Recently Updated", "Stable", "Beta", "New Release"]),
  rating: z.coerce.number().min(0).max(5),
  popularity: z.coerce.number().min(0).max(100),
  featured: z.boolean(),
  trending: z.boolean(),
  recommended: z.boolean(),
  new_release: z.boolean(),
  latest_update: z.string().trim().min(3, "Latest update is required"),
  features: z.string().trim().min(2, "Add at least one feature"),
  pricing_plans: z.string().trim().min(2, "Add at least one pricing plan"),
  pros: z.string().trim().min(2, "Add at least one pro"),
  cons: z.string().trim().min(2, "Add at least one con"),
  use_cases: z.string().trim().min(2, "Add at least one use case"),
  alternatives: z.string().trim().optional(),
  website_url: z.string().url("Enter an official website URL"),
  pricing_url: z.string().url("Enter an official pricing URL"),
  docs_url: z.string().url("Enter an official documentation URL"),
  api_url: optionalUrl,
  download_url: optionalUrl,
  active: z.boolean()
});

export type AiToolFormValues = z.infer<typeof aiToolSchema>;
