import { z } from "zod";
import { AI_TOOL_CATEGORIES } from "@/lib/ai-tools";
import { PLATFORMS, SUPPLIERS, USAGE_CATEGORIES } from "@/lib/constants";

const nonNegative = z.coerce.number().min(0, "Value cannot be negative");
const optionalUrl = z.string().trim().optional().refine((value) => !value || z.string().url().safeParse(value).success, "Enter a valid URL");

export const aiUsageSchema = z
  .object({
    date: z.string().min(1, "Date is required"),
    platform: z.enum(PLATFORMS, { required_error: "Platform is required" }),
    category: z.enum(USAGE_CATEGORIES, { required_error: "Category is required" }),
    buy_credits: nonNegative,
    description: z.string().trim().min(3, "Description is required"),
    number_of_styles: z.coerce.number().int().min(0, "Styles cannot be negative"),
    number_of_images: z.coerce.number().int().min(0, "Images cannot be negative"),
    wastage: nonNegative,
    credits_used: nonNegative,
    supplier_requirements: z.enum(SUPPLIERS, { required_error: "Supplier is required" })
  })
  .refine((data) => data.credits_used <= data.buy_credits, {
    message: "Credits used must not exceed buy credits",
    path: ["credits_used"]
  });

export type AiUsageFormValues = z.infer<typeof aiUsageSchema>;

export const loginSchema = z.object({
  password: z.string().min(1, "Password is required")
});

export const paymentSchema = z.object({
  customer_name: z.string().trim().min(2, "Purchased by is required"),
  customer_email: z.string().email("Enter a valid email").optional(),
  payment_id: z.string().trim().optional(),
  transaction_id: z.string().trim().optional(),
  order_id: z.string().trim().optional(),
  amount: z.coerce.number().min(0.01, "Amount paid is required"),
  credits: z.coerce.number().int().min(1, "Credits purchased is required"),
  tax_amount: z.coerce.number().min(0, "Value cannot be negative").optional(),
  total_amount: z.coerce.number().min(0, "Value cannot be negative").optional(),
  currency: z.string().trim().optional(),
  payment_method: z.enum(["UPI", "Credit Card", "Debit Card", "PayPal", "Bank Transfer", "Net Banking", "Other"]),
  vendor: z.string().trim().min(2, "Platform name is required"),
  paid_at: z.string().min(1, "Purchase date is required"),
  invoice_number: z.string().trim().optional(),
  notes: z.string().trim().optional().nullable()
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;

export const purchaseSchema = z.object({
  platform: z.enum(PLATFORMS, { required_error: "Platform is required" }),
  invoice_name: z.string().trim().optional(),
  purchase_date: z.string().min(1, "Purchase date is required"),
  due_date: z.string().optional().nullable(),
  subscription_plan: z.string().trim().optional(),
  invoice_number: z.string().trim().optional(),
  currency: z.string().trim().optional(),
  subtotal: z.coerce.number().min(0, "Subtotal cannot be negative").optional(),
  tax_amount: z.coerce.number().min(0, "Tax cannot be negative").optional(),
  discount_amount: z.coerce.number().min(0, "Discount cannot be negative").optional(),
  purchase_amount: z.coerce.number().min(0.01, "Amount paid is required"),
  amount_paid: z.coerce.number().min(0, "Amount paid cannot be negative").optional(),
  balance_due: z.coerce.number().min(0, "Balance due cannot be negative").optional(),
  payment_status: z.enum(["Paid", "Unpaid", "Partially Paid", "Unknown"]).optional(),
  total_credits_purchased: z.coerce.number().min(1, "Credits purchased is required"),
  expiry_date: z.string().optional().nullable(),
  payment_method: z.enum(["UPI", "Credit Card", "Debit Card", "PayPal", "Bank Transfer", "Net Banking", "Other"]),
  vendor: z.string().trim().optional(),
  customer_name: z.string().trim().optional().nullable(),
  billing_address: z.string().trim().optional().nullable(),
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
