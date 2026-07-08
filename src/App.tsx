import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Coins,
  CreditCard,
  Download,
  FileText,
  FileUp,
  ImageIcon,
  Layers,
  LayoutDashboard,
  ListChecks,
  Lock,
  LogOut,
  Mail,
  Moon,
  Eye,
  EyeOff,
  PiggyBank,
  Plus,
  Search,
  Sparkles,
  Star,
  Sun,
  Table2,
  TrendingDown,
  UserPlus,
  Wallet
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import tesseractWorkerUrl from "tesseract.js/dist/worker.min.js?url";
import tesseractCoreUrl from "tesseract.js-core/tesseract-core-simd-lstm.wasm.js?url";
import { createWorker } from "tesseract.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { DailyActivityChart, MonthlyUsageChart, PlatformChart, ProductivityChart } from "@/components/dashboard/charts";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { AiStudioPage } from "@/components/ai-studio/ai-studio-page";
import { ReportsDashboard } from "@/components/reports/reports-dashboard";
import { getCategorySeries, getDailyActivity, getDashboardStats, getMonthlySeries, getPlatformSeries, getSupplierUsage } from "@/lib/analytics";
import {
  deletePayment,
  deletePurchase,
  deleteUsage,
  getCreditLedger,
  getPayments,
  getPurchases,
  getUsage,
  getUserCredits,
  getUsers,
  onAuthChange,
  savePayment,
  savePurchase,
  saveUsage,
  setUserDisabled,
  simulatePasswordReset,
  signIn,
  signInWithGoogle,
  signOut,
  signUp,
  updateUserRole
} from "@/lib/data-store";
import { PLATFORMS, SUPPLIERS, USAGE_CATEGORIES } from "@/lib/constants";
import type { AiUsage, CreditLedgerEntry, CreditPurchase, InvoiceFile, Payment, PaymentMethod, Platform, Profile } from "@/lib/types";
import {
  aiUsageSchema,
  forgotPasswordSchema,
  loginSchema,
  paymentSchema,
  purchaseSchema,
  signupSchema,
  type AiUsageFormValues,
  type PaymentFormValues,
  type PurchaseFormValues
} from "@/lib/validation";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import type { z } from "zod";

type View = "dashboard" | "studio" | "usage" | "purchases" | "reports" | "payments" | "users";
type PurchaseDuplicateState = {
  kind: "same" | "different";
  existing: CreditPurchase;
  input: Parameters<typeof savePurchase>[0];
} | null;

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const FULL_LOGO = "/logo-full.png";
const MARK_LOGO = "/favicon.png";
const APPLE_LOGO = "/apple-logo-black.svg";
const IMAGES_PER_STYLE = 6;
const CREDITS_PER_IMAGE = 150;
const DEFAULT_PLATFORM_CREDIT_PACKS: Partial<Record<Platform, number>> = {
  Magnific: 45000
};
const PAYMENT_METHODS: PaymentMethod[] = ["UPI", "Credit Card", "Debit Card", "PayPal", "Bank Transfer", "Net Banking", "Other"];
const TESSERACT_LANG_PATH = "/tessdata";

const FASHION_SLIDES = [
  {
    title: "Women's Fashion",
    subtitle: "Premium studio editorials for modern womenswear campaigns.",
    image: "/fashion-slides/womens-fashion.png",
    position: "center top"
  },
  {
    title: "Men's Fashion",
    subtitle: "Luxury streetwear and tailored menswear photography at scale.",
    image: "/fashion-slides/mens-fashion.png",
    position: "center top"
  },
  {
    title: "Kids Fashion Collection",
    subtitle: "Bright lifestyle images for premium children's apparel.",
    image: "/fashion-slides/kids-collection.png",
    position: "center top"
  },
  {
    title: "Baby Apparel",
    subtitle: "Soft natural-light visuals for infant collections and baby products.",
    image: "/fashion-slides/baby-apparel.png",
    position: "center top"
  },
  {
    title: "Sportswear",
    subtitle: "Sharp activewear imagery for performance and lifestyle brands.",
    image: "/fashion-slides/sportswear.png",
    position: "center top"
  },
  {
    title: "Accessories",
    subtitle: "Editorial product photography for bags, jewelry, and styling pieces.",
    image: "/fashion-slides/accessories.png",
    position: "center"
  },
  {
    title: "Innerwear",
    subtitle: "Tasteful premium visuals for refined innerwear and loungewear.",
    image: "/fashion-slides/innerwear.png",
    position: "center top"
  }
];

function AppInner() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("dashboard");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = onAuthChange((nextProfile) => {
      if (!mounted) return;
      setProfile(nextProfile);
      setLoading(false);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  async function handleLogout() {
    await signOut();
    setProfile(null);
    setView("dashboard");
    toast({ title: "Logout Successful", description: "You have been signed out securely." });
  }

  if (loading) return <AppLoader />;
  if (!profile) {
    return <AuthScreen onSignedIn={setProfile} />;
  }

  const admin = profile.role === "admin";

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <aside className="no-print sticky top-0 hidden h-screen w-72 shrink-0 border-r bg-card lg:flex lg:flex-col">
          <div className="flex h-20 items-center gap-3 border-b px-5">
            <img src={MARK_LOGO} alt="Zeal Design Studio" className="h-11 w-11 rounded-md object-contain" />
            <div>
              <p className="text-sm font-bold">Zeal Design Studio</p>
              <p className="text-xs text-muted-foreground">AI Credits</p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            <NavButton view="dashboard" active={view} setView={setView} icon={LayoutDashboard} label="Dashboard" />
            <NavButton view="studio" active={view} setView={setView} icon={Sparkles} label="AI Studio" />
            <NavButton view="usage" active={view} setView={setView} icon={Table2} label="AI Usage" />
            <NavButton view="purchases" active={view} setView={setView} icon={FileUp} label="Purchase Credits" />
            <NavButton view="reports" active={view} setView={setView} icon={FileText} label="Reports" />
            <NavButton view="payments" active={view} setView={setView} icon={CreditCard} label="Payments" />
            {admin ? <NavButton view="users" active={view} setView={setView} icon={UserPlus} label="Users" /> : null}
          </nav>
          <div className="border-t p-4">
            <div className="mb-3 rounded-md bg-muted p-3">
              <p className="truncate text-sm font-semibold">{profile.full_name || profile.email}</p>
              <p className="text-xs capitalize text-muted-foreground">{profile.role}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setDark((value) => !value)}>
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                Theme
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="no-print mb-4 flex gap-2 overflow-x-auto lg:hidden">
            {(["dashboard", "studio", "usage", "purchases", "reports", "payments"] as View[]).map((item) => (
              <Button key={item} variant={view === item ? "default" : "outline"} onClick={() => setView(item)}>
                {item}
              </Button>
            ))}
            {admin ? (
              <Button variant={view === "users" ? "default" : "outline"} onClick={() => setView("users")}>
                users
              </Button>
            ) : null}
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          {view === "dashboard" ? <DashboardPage profile={profile} /> : null}
          {view === "studio" ? <AiStudioPage profile={profile} /> : null}
          {view === "usage" ? <UsagePage profile={profile} /> : null}
          {view === "purchases" ? <PurchaseCreditsPage profile={profile} /> : null}
          {view === "reports" ? <ReportsPage profile={profile} /> : null}
          {view === "payments" ? <PaymentsPage profile={profile} /> : null}
          {view === "users" && admin ? <UsersPage currentUser={profile} /> : null}
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}

function AuthScreen({ onSignedIn }: { onSignedIn: (profile: Profile) => void }) {
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setSlide((current) => (current + 1) % FASHION_SLIDES.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [paused]);

  function previousSlide() {
    setSlide((current) => (current - 1 + FASHION_SLIDES.length) % FASHION_SLIDES.length);
  }

  function nextSlide() {
    setSlide((current) => (current + 1) % FASHION_SLIDES.length);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowLeft") previousSlide();
    if (event.key === "ArrowRight") nextSlide();
  }

  function handlePointerUp(clientX: number) {
    if (dragStart == null) return;
    const delta = clientX - dragStart;
    if (Math.abs(delta) > 48) {
      if (delta > 0) previousSlide();
      else nextSlide();
    }
    setDragStart(null);
  }

  return (
    <main className="min-h-screen bg-[#F7F7F7] px-4 py-5 text-[#111111] sm:px-8 sm:py-8 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-[1440px] grid-cols-1 gap-8 rounded-[32px] bg-white p-6 shadow-2xl shadow-black/[0.06] sm:p-10 lg:grid-cols-12 lg:gap-12 lg:p-12 xl:p-[56px]">
        <section className="flex min-h-[560px] flex-col bg-white lg:col-span-5 xl:col-span-5">
          <img src={FULL_LOGO} alt="Zeal Design Studio" className="h-12 w-fit object-contain" />

          <div className="flex flex-1 items-center py-10 lg:py-0">
            <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h1 className="text-[34px] font-bold leading-[1.05] tracking-tight text-[#111111] sm:text-[42px] xl:text-[56px]">
                Welcome Back
              </h1>
              <p className="mt-4 max-w-[420px] text-base leading-7 text-[#666666]">
                Sign in to access your AI Fashion Photoshoot Dashboard.
              </p>
              <div className="mt-10">
                <LoginForm onSignedIn={onSignedIn} />
              </div>
            </div>
          </div>
        </section>

        <section className="lg:col-span-7 xl:col-span-7">
          <div
            aria-label="AI fashion campaign image slider"
            className="relative h-[540px] overflow-hidden rounded-[32px] bg-[#111111] shadow-2xl shadow-black/20 outline-none sm:h-[620px] lg:h-full lg:min-h-[720px]"
            onFocus={() => setPaused(true)}
            onKeyDown={handleKeyDown}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onPointerDown={(event) => setDragStart(event.clientX)}
            onPointerUp={(event) => handlePointerUp(event.clientX)}
            tabIndex={0}
          >
            {FASHION_SLIDES.map((item, index) => (
              <img
                alt={`${item.title} AI fashion photoshoot campaign`}
                aria-hidden={slide !== index}
                className={cn("fashion-slide absolute inset-0 h-full w-full scale-100 object-cover opacity-0", slide === index && "scale-[1.04] opacity-100")}
                decoding={index === 0 ? "sync" : "async"}
                key={item.title}
                loading={index === 0 ? "eager" : "lazy"}
                src={item.image}
                style={{ objectPosition: item.position }}
              />
            ))}

            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.45),rgba(0,0,0,.15))]" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

            <div className="relative z-10 flex h-full flex-col justify-between p-6 text-white sm:p-8 lg:p-10 xl:p-12">
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-full border border-white/25 bg-white/14 px-4 py-2 text-xs font-semibold tracking-[0.16em] text-white/90 backdrop-blur-md">
                  AI Fashion Photoshoot Platform
                </div>
                <div className="hidden items-center gap-1 rounded-full border border-white/25 bg-white/14 px-4 py-2 text-sm font-semibold backdrop-blur-md sm:flex">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star className="h-3.5 w-3.5 fill-[#E10600] text-[#E10600]" key={index} />
                  ))}
                  <span className="ml-1">4.9/5</span>
                </div>
              </div>

              <div className="max-w-xl animate-in fade-in slide-in-from-bottom-3 duration-300">
                <h2 className="max-w-lg text-4xl font-bold leading-tight tracking-tight sm:text-5xl xl:text-[60px]">
                  {FASHION_SLIDES[slide].title}
                </h2>
                <p className="mt-4 max-w-[520px] text-base leading-7 text-white/82">
                  {FASHION_SLIDES[slide].subtitle}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button className="h-12 rounded-full bg-[#E10600] px-6 text-white hover:scale-[1.03] hover:bg-[#C70000]">
                    Generate Photos
                  </Button>
                  <Button className="h-12 rounded-full border-white/30 bg-white/14 px-6 text-white backdrop-blur hover:scale-[1.03] hover:bg-white/25" variant="outline">
                    Explore Gallery
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {FASHION_SLIDES.map((item, index) => (
                    <button
                      aria-label={`Show ${item.title}`}
                      aria-current={slide === index ? "true" : undefined}
                      className={cn("h-2 rounded-full bg-white/40 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white", slide === index ? "w-9 bg-[#E10600]" : "w-4 hover:bg-white/75")}
                      key={item.title}
                      onClick={() => setSlide(index)}
                      type="button"
                    />
                  ))}
                </div>
                <div className="flex gap-3">
                  <button
                    aria-label="Previous slide"
                    className="grid h-12 w-12 place-items-center rounded-full border border-white/25 bg-white/14 text-white backdrop-blur-xl transition hover:scale-[1.03] hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                    onClick={previousSlide}
                    type="button"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    aria-label="Next slide"
                    className="grid h-12 w-12 place-items-center rounded-full border border-white/25 bg-white/14 text-white backdrop-blur-xl transition hover:scale-[1.03] hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                    onClick={nextSlide}
                    type="button"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function LoginForm({ onSignedIn }: { onSignedIn: (profile: Profile) => void }) {
  const { toast } = useToast();
  const [forgotOpen, setForgotOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [shake, setShake] = useState(false);
  const [remember, setRemember] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });
  const forgotForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" }
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    try {
      const profile = await signIn(values.email, values.password, remember);
      toast({ title: "Login Successful", description: "Welcome back." });
      onSignedIn(profile);
    } catch (error) {
      setShake(true);
      window.setTimeout(() => setShake(false), 450);
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Unable to login.",
        variant: "destructive"
      });
    }
  }

  async function onForgot(values: z.infer<typeof forgotPasswordSchema>) {
    try {
      await simulatePasswordReset(values.email);
      forgotForm.reset();
      setForgotOpen(false);
      toast({
        title: "Password Reset Email Sent",
        description: "Check your inbox to continue securely."
      });
    } catch (error) {
      toast({
        title: "Reset failed",
        description: error instanceof Error ? error.message : "Unable to process reset.",
        variant: "destructive"
      });
    }
  }

  async function onGoogle() {
    try {
      setGoogleLoading(true);
      const profile = await signInWithGoogle(remember);
      toast({ title: "Login Successful", description: "Signed in with Google." });
      onSignedIn(profile);
    } catch (error) {
      toast({
        title: "Google sign in failed",
        description: error instanceof Error ? error.message : "Unable to start sign in.",
        variant: "destructive"
      });
    } finally {
      setGoogleLoading(false);
    }
  }

  function onProviderUnavailable(provider: string) {
    toast({
      title: `${provider} sign in is not enabled`,
      description: "Google authentication is ready. Add this provider in Firebase to activate it."
    });
  }

  return (
    <>
      <form className={cn("space-y-6", shake && "animate-shake")} onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <Field label="Email Address" error={form.formState.errors.email?.message}>
          <Input className="h-14 rounded-[14px] border-[#E5E5E5] bg-white px-[18px] text-[#111111] placeholder:text-[#9CA3AF] transition focus-visible:border-[#E10600] focus-visible:ring-[#E10600]/25 focus-visible:ring-offset-0" type="email" autoComplete="email" placeholder="name@company.com" {...form.register("email")} />
        </Field>
        <Field label="Password" error={form.formState.errors.password?.message}>
          <div className="relative">
            <Input
              className="h-14 rounded-[14px] border-[#E5E5E5] bg-white px-[18px] pr-12 text-[#111111] placeholder:text-[#9CA3AF] transition focus-visible:border-[#E10600] focus-visible:ring-[#E10600]/25 focus-visible:ring-offset-0"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              onKeyUp={(event) => setCapsLock(event.getModifierState("CapsLock"))}
              {...form.register("password")}
            />
            <button
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md text-[#666666] transition hover:text-[#111111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E10600]"
              onClick={() => setShowPassword((value) => !value)}
              type="button"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {capsLock ? (
            <p className="mt-2 flex items-center gap-2 text-xs font-medium text-[#B45309]">
              <AlertTriangle className="h-3.5 w-3.5" />
              Caps Lock is on
            </p>
          ) : null}
        </Field>
        <div className="flex items-center justify-between gap-4 text-sm leading-none">
          <label className="flex cursor-pointer items-center gap-2 text-[#666666]">
            <input
              checked={remember}
              className="h-4 w-4 rounded border-[#E5E5E5] accent-[#E10600]"
              onChange={(event) => setRemember(event.target.checked)}
              type="checkbox"
            />
            Remember Me
          </label>
          <button className="font-semibold text-[#E10600] transition hover:text-[#111111] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E10600]" onClick={() => setForgotOpen(true)} type="button">
            Forgot Password
          </button>
        </div>
        <Button className="h-14 w-full rounded-[14px] bg-[#E10600] font-bold text-white shadow-lg shadow-red-100 transition duration-300 hover:scale-[1.03] hover:bg-[#C70000] hover:shadow-xl hover:shadow-red-100 active:scale-[0.98]" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Lock className="h-4 w-4" />}
          Sign In
        </Button>

        <div className="flex items-center gap-4 pt-1">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#E5E5E5]" />
          <span className="whitespace-nowrap text-[11px] font-medium text-[#9CA3AF]">or continue with</span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#E5E5E5]" />
        </div>

        <div className="flex items-center justify-center gap-5">
          <SocialIconButton
            ariaLabel="Continue with Google"
            disabled={form.formState.isSubmitting || googleLoading}
            icon={googleLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#E10600]/20 border-t-[#E10600]" /> : <GoogleIcon />}
            onClick={onGoogle}
          />
          <SocialIconButton
            ariaLabel="Continue with Apple"
            featured
            icon={<img alt="" className="h-5 w-5 object-contain" src={APPLE_LOGO} />}
            onClick={() => onProviderUnavailable("Apple")}
          />
          <SocialIconButton
            ariaLabel="Continue with Facebook"
            icon={<FacebookIcon />}
            onClick={() => onProviderUnavailable("Facebook")}
          />
        </div>

        <p className="pt-2 text-center text-sm text-[#6f6f6f]">
          Don't have an account?{" "}
          <button className="font-bold text-[#E10600] transition hover:text-[#111111] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E10600]" onClick={() => setSignupOpen(true)} type="button">
            Create Account
          </button>
        </p>
        <p className="text-center text-xs text-[#8a8a8a]">Secure authentication powered by Firebase.</p>
      </form>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="border-[#EAEAEA] bg-white text-[#111111]">
          <DialogHeader>
            <DialogTitle>Forgot Password</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={forgotForm.handleSubmit(onForgot)}>
            <Field label="Email Address" error={forgotForm.formState.errors.email?.message}>
              <Input className="h-14 rounded-[14px] border-[#E5E5E5] bg-white text-[#111111] focus-visible:border-[#E10600] focus-visible:ring-[#E10600]/25" type="email" placeholder="name@company.com" {...forgotForm.register("email")} />
            </Field>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button disabled={forgotForm.formState.isSubmitting}>
                <Mail className="h-4 w-4" />
                Send Reset Link
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <SignupDialog open={signupOpen} onOpenChange={setSignupOpen} onSignedIn={onSignedIn} remember={remember} />
    </>
  );
}

function SignupDialog({
  open,
  onOpenChange,
  onSignedIn,
  remember
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignedIn: (profile: Profile) => void;
  remember: boolean;
}) {
  const { toast } = useToast();
  const [googleLoading, setGoogleLoading] = useState(false);
  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { full_name: "", email: "", password: "", confirm_password: "" }
  });

  async function onSubmit(values: z.infer<typeof signupSchema>) {
    try {
      await signUp(values.email, values.password, values.full_name);
      form.reset();
      onOpenChange(false);
      toast({
        title: "Account Created Successfully",
        description: "A verification email has been sent. Verify your email, then sign in."
      });
    } catch (error) {
      toast({
        title: "Create account failed",
        description: error instanceof Error ? error.message : "Unable to create account.",
        variant: "destructive"
      });
    }
  }

  async function onGoogle() {
    try {
      setGoogleLoading(true);
      const profile = await signInWithGoogle(remember);
      onOpenChange(false);
      toast({ title: "Account Created Successfully", description: "Signed in with Google." });
      onSignedIn(profile);
    } catch (error) {
      toast({
        title: "Google sign in failed",
        description: error instanceof Error ? error.message : "Unable to continue with Google.",
        variant: "destructive"
      });
    } finally {
      setGoogleLoading(false);
    }
  }

  function onProviderUnavailable(provider: string) {
    toast({
      title: `${provider} sign in is not enabled`,
      description: "Google authentication is ready. Add this provider in Firebase to activate it."
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[#EAEAEA] bg-white text-[#111111]">
        <DialogHeader>
          <DialogTitle>Create Account</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <Field label="Full Name" error={form.formState.errors.full_name?.message}>
            <Input className="h-14 rounded-[14px] border-[#E5E5E5] bg-white text-[#111111] focus-visible:border-[#E10600] focus-visible:ring-[#E10600]/25" autoComplete="name" {...form.register("full_name")} />
          </Field>
          <Field label="Email Address" error={form.formState.errors.email?.message}>
            <Input className="h-14 rounded-[14px] border-[#E5E5E5] bg-white text-[#111111] focus-visible:border-[#E10600] focus-visible:ring-[#E10600]/25" type="email" autoComplete="email" {...form.register("email")} />
          </Field>
          <Field label="Password" error={form.formState.errors.password?.message}>
            <Input className="h-14 rounded-[14px] border-[#E5E5E5] bg-white text-[#111111] focus-visible:border-[#E10600] focus-visible:ring-[#E10600]/25" type="password" autoComplete="new-password" {...form.register("password")} />
          </Field>
          <Field label="Confirm Password" error={form.formState.errors.confirm_password?.message}>
            <Input className="h-14 rounded-[14px] border-[#E5E5E5] bg-white text-[#111111] focus-visible:border-[#E10600] focus-visible:ring-[#E10600]/25" type="password" autoComplete="new-password" {...form.register("confirm_password")} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button className="bg-[#E10600] hover:bg-[#C70000]" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <UserPlus className="h-4 w-4" />}
              Create Account
            </Button>
          </div>

          <div className="flex items-center gap-4 py-1">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#E5E5E5]" />
            <span className="whitespace-nowrap text-[11px] font-medium text-[#9CA3AF]">or continue with</span>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#E5E5E5]" />
          </div>

          <div className="flex items-center justify-center gap-5">
            <SocialIconButton
              ariaLabel="Continue with Google"
              disabled={form.formState.isSubmitting || googleLoading}
              icon={googleLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#E10600]/20 border-t-[#E10600]" /> : <GoogleIcon />}
              onClick={onGoogle}
            />
            <SocialIconButton
              ariaLabel="Continue with Apple"
              featured
              icon={<img alt="" className="h-5 w-5 object-contain" src={APPLE_LOGO} />}
              onClick={() => onProviderUnavailable("Apple")}
            />
            <SocialIconButton
              ariaLabel="Continue with Facebook"
              icon={<FacebookIcon />}
              onClick={() => onProviderUnavailable("Facebook")}
            />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SocialIconButton({
  ariaLabel,
  disabled,
  featured,
  icon,
  onClick
}: {
  ariaLabel: string;
  disabled?: boolean;
  featured?: boolean;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className={cn(
        "grid h-9 w-12 place-items-center rounded-lg border border-[#EAEAEA] bg-white text-[#111111] shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-[#F7F7F7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E10600] disabled:pointer-events-none disabled:opacity-60",
        featured && "h-12 w-16 rounded-xl shadow-xl shadow-black/15 hover:bg-white"
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path d="M21.6 12.23c0-.78-.07-1.53-.2-2.23H12v4.22h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.32 2.98-7.52Z" fill="#4285F4" />
      <path d="M12 22c2.7 0 4.97-.9 6.62-2.45l-3.24-2.51c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.41 13.88A6.01 6.01 0 0 1 6.1 12c0-.65.11-1.28.31-1.88V7.53H3.07A10 10 0 0 0 2 12c0 1.61.39 3.14 1.07 4.47l3.34-2.59Z" fill="#FBBC05" />
      <path d="M12 6c1.47 0 2.78.51 3.82 1.5l2.87-2.87A9.61 9.61 0 0 0 12 2a10 10 0 0 0-8.93 5.53l3.34 2.59C7.2 7.76 9.4 6 12 6Z" fill="#EA4335" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06C2 17.08 5.66 21.25 10.44 22v-7.03H7.9v-2.91h2.54V9.84c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.48h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.77l-.44 2.91h-2.33V22C18.34 21.25 22 17.08 22 12.06Z" fill="#1877F2" />
      <path d="m15.89 14.97.44-2.91h-2.77v-1.88c0-.8.39-1.57 1.63-1.57h1.26V6.13s-1.14-.2-2.24-.2c-2.29 0-3.78 1.39-3.78 3.91v2.22H7.9v2.91h2.54V22a10.18 10.18 0 0 0 3.12 0v-7.03h2.33Z" fill="#FFFFFF" />
    </svg>
  );
}

function DashboardPage({ profile }: { profile: Profile }) {
  const [records, setRecords] = useState<AiUsage[]>([]);
  const [purchases, setPurchases] = useState<CreditPurchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [ledger, setLedger] = useState<CreditLedgerEntry[]>([]);
  const [currentCredits, setCurrentCredits] = useState(0);

  useEffect(() => {
    const refreshDashboard = async () => {
      try {
        const [nextUsage, nextPurchases, nextPayments, nextLedger, credits] = await Promise.all([
          getUsage(profile),
          getPurchases(profile),
          getPayments(profile),
          getCreditLedger(profile.role === "admin" ? undefined : profile.email),
          getUserCredits(profile.email)
        ]);
        setRecords(nextUsage);
        setPurchases(nextPurchases);
        setPayments(nextPayments);
        setLedger(nextLedger);
        setCurrentCredits(credits);
      } catch (error) {
        console.error(error);
      }
    };
    refreshDashboard();
    window.addEventListener("credits-updated", refreshDashboard);
    return () => window.removeEventListener("credits-updated", refreshDashboard);
  }, [profile]);

  const stats = getDashboardStats(records, purchases);
  const monthly = getMonthlySeries(records);
  const platform = getPlatformSeries(records);
  const daily = getDailyActivity(records);
  const categories = getCategorySeries(records);
  const suppliers = getSupplierUsage(records);
  const today = new Date().toISOString().slice(0, 10);
  const creditsAddedToday = ledger
    .filter((entry) => entry.created_at.slice(0, 10) === today && entry.credits_added > 0)
    .reduce((sum, entry) => sum + entry.credits_added, 0);
  const lastPayment = payments[0];
  const nextExpiry = purchases
    .filter((purchase) => purchase.expiry_date)
    .sort((a, b) => String(a.expiry_date).localeCompare(String(b.expiry_date)))[0];

  return (
    <>
      <PageHeader title="Executive Dashboard" description="Live AI credit usage, productivity, purchasing, and balance insights." />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Total Purchased Credits" value={stats.totalBuyCredits} icon={Wallet} />
        <KpiCard title="Total Credits Used" value={stats.totalCreditsUsed} icon={TrendingDown} />
        <KpiCard title="Remaining Credits" value={stats.remainingCredits} icon={PiggyBank} />
        <KpiCard title="Total Styles Created" value={stats.totalStyles} icon={Layers} />
        <KpiCard title="Total Images Generated" value={stats.totalImages} icon={ImageIcon} />
        <KpiCard title="Total Entries" value={stats.totalEntries} icon={ListChecks} />
        <KpiCard title="Monthly Usage" value={stats.monthlyUsage} icon={CalendarDays} />
        <KpiCard title="Monthly Purchase" value={stats.monthlyPurchase} icon={Coins} />
        <KpiCard title="Current Credits" value={currentCredits} icon={CreditCard} />
        <KpiCard title="Credits Added Today" value={creditsAddedToday} icon={Plus} />
        <KpiCard title="Last Purchase Credits" value={lastPayment?.credits ?? 0} icon={Wallet} />
      </section>
      <CreditProgressCard purchased={stats.totalBuyCredits} used={stats.totalCreditsUsed} remaining={stats.remainingCredits} percentage={stats.usagePercentage} />
      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <MonthlyUsageChart data={monthly} />
        <ProductivityChart data={monthly} />
        <PlatformChart data={platform} />
        <DailyActivityChart data={daily} />
      </section>
      <section className="mt-6">
        <RecentActivity records={records.slice(0, 10)} />
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        <SummaryList title="Top Categories" rows={categories.slice(0, 6).map((item) => [item.category, formatNumber(item.creditsUsed)])} />
        <SummaryList title="Top Suppliers" rows={suppliers.slice(0, 6).map((item) => [item.supplier, formatNumber(item.creditsUsed)])} />
        <SummaryList title="Latest Purchases" rows={purchases.slice(0, 6).map((item) => [`${item.platform} · ${item.invoice_number}`, formatNumber(item.total_credits_purchased)])} empty="No purchases yet." />
        <SummaryList
          title="Recent Payment"
          rows={lastPayment ? [
            ["Invoice", lastPayment.invoice_number],
            ["Vendor", lastPayment.vendor],
            ["Amount", `${lastPayment.currency} ${formatNumber(lastPayment.total_amount || lastPayment.amount)}`],
            ["Next Expiry", nextExpiry?.expiry_date ? formatDate(nextExpiry.expiry_date) : "Not set"]
          ] : []}
          empty="No recent payment."
        />
      </section>
    </>
  );
}

function SummaryList({ title, rows, empty = "No data yet." }: { title: string; rows: string[][]; empty?: string }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {rows.length ? rows.map(([label, value]) => (
          <div className="flex items-center justify-between gap-3 text-sm" key={label}>
            <span className="truncate font-medium">{label}</span>
            <span className="text-muted-foreground">{value}</span>
          </div>
        )) : <p className="text-sm text-muted-foreground">{empty}</p>}
      </CardContent>
    </Card>
  );
}

function PurchaseCreditsPage({ profile }: { profile: Profile }) {
  const [purchases, setPurchases] = useState<CreditPurchase[]>([]);
  const [usage, setUsage] = useState<AiUsage[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CreditPurchase | null>(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  async function refresh() {
    try {
      setPurchases(await getPurchases(profile));
      setUsage(await getUsage(profile));
    } catch (error) {
      toast({ title: "Purchases failed", description: getError(error), variant: "destructive" });
    }
  }

  useEffect(() => {
    refresh();
  }, [profile]);

  const purchaseUsage = useMemo(() => allocatePurchaseUsage(purchases, usage), [purchases, usage]);
  const filtered = purchases.filter((purchase) =>
    `${purchase.platform} ${purchase.invoice_number} ${purchase.vendor} ${purchase.subscription_plan}`.toLowerCase().includes(search.toLowerCase())
  );

  async function remove(purchase: CreditPurchase) {
    if (!confirm(`Delete purchase ${purchase.invoice_number}?`)) return;
    await deletePurchase(purchase.id);
    toast({ title: "Purchase deleted" });
    refresh();
  }

  return (
    <>
      <PageHeader
        title="Purchase Credits"
        description="Upload invoices, record AI subscriptions, and create platform credit balances."
        action={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" />New Purchase</Button>}
      />
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search platform, invoice, vendor, plan" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
        </CardContent>
      </Card>
      <PurchaseAlerts purchases={purchases} usage={usage} />
      <DataTable
        headers={["Date", "Platform", "Invoice Number", "Credits Purchased", "Used", "Remaining", "Status", "Actions"]}
        empty="No credit purchases yet."
        rows={filtered.map((purchase) => {
          const used = purchaseUsage.get(purchase.id) ?? 0;
          const remaining = purchase.total_credits_purchased - used;
          const status = purchase.expiry_date && purchase.expiry_date < new Date().toISOString().slice(0, 10) ? "Expired" : remaining <= 0 ? "Exhausted" : remaining / purchase.total_credits_purchased < 0.2 ? "Low" : "Active";
          return [
            formatDate(purchase.purchase_date),
            purchase.platform,
            purchase.invoice_number,
            formatNumber(purchase.total_credits_purchased),
            formatNumber(used),
            formatNumber(Math.max(remaining, 0)),
            status,
            <div className="flex justify-end gap-2" key={purchase.id}>
              <Button variant="outline" size="sm" onClick={() => { setEditing(purchase); setOpen(true); }}>Edit</Button>
              <Button variant="destructive" size="sm" onClick={() => remove(purchase)}>Delete</Button>
            </div>
          ];
        })}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={cn("max-h-[92vh] overflow-y-auto", editing ? "sm:max-w-2xl" : "sm:max-w-3xl")}>
          <DialogHeader><DialogTitle>{editing ? "Edit Purchase" : "New Credit Purchase"}</DialogTitle></DialogHeader>
          <PurchaseForm currentUser={profile} purchase={editing} onDone={() => { setOpen(false); refresh(); }} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function allocatePurchaseUsage(purchases: CreditPurchase[], usage: AiUsage[]) {
  const usageByPlatform = new Map<string, number>();
  usage.forEach((record) => usageByPlatform.set(record.platform, (usageByPlatform.get(record.platform) ?? 0) + Number(record.credits_used || 0)));
  const allocation = new Map<string, number>();
  const byPlatform = new Map<string, CreditPurchase[]>();
  purchases.forEach((purchase) => {
    byPlatform.set(purchase.platform, [...(byPlatform.get(purchase.platform) ?? []), purchase]);
  });
  byPlatform.forEach((items, platform) => {
    let remainingUsage = usageByPlatform.get(platform) ?? 0;
    items
      .slice()
      .sort((a, b) => a.purchase_date.localeCompare(b.purchase_date))
      .forEach((purchase) => {
        const used = Math.min(remainingUsage, Number(purchase.total_credits_purchased || 0));
        allocation.set(purchase.id, used);
        remainingUsage -= used;
      });
  });
  return allocation;
}

function PurchaseAlerts({ purchases, usage }: { purchases: CreditPurchase[]; usage: AiUsage[] }) {
  const allocation = allocatePurchaseUsage(purchases, usage);
  const today = new Date();
  const soon = new Date();
  soon.setDate(today.getDate() + 14);
  const alerts = purchases.flatMap((purchase) => {
    const used = allocation.get(purchase.id) ?? 0;
    const remaining = purchase.total_credits_purchased - used;
    const ratio = purchase.total_credits_purchased ? remaining / purchase.total_credits_purchased : 0;
    const items: string[] = [];
    if (remaining <= 0) items.push(`${purchase.platform} ${purchase.invoice_number}: credits exhausted.`);
    else if (ratio < 0.2) items.push(`${purchase.platform} ${purchase.invoice_number}: credits below 20%.`);
    if (purchase.expiry_date) {
      const expiry = new Date(purchase.expiry_date);
      if (expiry >= today && expiry <= soon) items.push(`${purchase.platform} ${purchase.invoice_number}: subscription expires soon.`);
    }
    return items;
  });
  if (!alerts.length) return null;
  return (
    <Card className="mb-4 border-[#E53935]/30 bg-[#E53935]/5">
      <CardContent className="space-y-2 p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-[#E53935]"><AlertTriangle className="h-4 w-4" />Alerts</p>
        {alerts.slice(0, 6).map((alert) => <p className="text-sm text-muted-foreground" key={alert}>{alert}</p>)}
      </CardContent>
    </Card>
  );
}

function PurchaseForm({ currentUser, purchase, onDone }: { currentUser: Profile; purchase: CreditPurchase | null; onDone: () => void }) {
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<InvoiceFile | null>(purchase?.invoice_file ?? null);
  const [extractedJson, setExtractedJson] = useState<Record<string, unknown> | null>(purchase?.extracted_json ?? null);
  const [ocrText, setOcrText] = useState(purchase?.ocr_text ?? "");
  const [extractionStep, setExtractionStep] = useState("");
  const [extractionConfidence, setExtractionConfidence] = useState<number | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [forceEditableFields, setForceEditableFields] = useState<string[]>([]);
  const [duplicateState, setDuplicateState] = useState<PurchaseDuplicateState>(null);
  const [isDraggingInvoice, setIsDraggingInvoice] = useState(false);
  const extractedLocked = Boolean(invoice && extractedJson);
  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: purchase
      ? {
          platform: purchase.platform,
          invoice_name: purchase.invoice_name,
          purchase_date: purchase.purchase_date,
          due_date: purchase.due_date ?? "",
          subscription_plan: purchase.subscription_plan,
          invoice_number: purchase.invoice_number,
          currency: purchase.currency,
          subtotal: purchase.subtotal ?? 0,
          tax_amount: purchase.tax_amount ?? 0,
          discount_amount: purchase.discount_amount ?? 0,
          purchase_amount: purchase.purchase_amount,
          amount_paid: purchase.amount_paid ?? purchase.purchase_amount,
          balance_due: purchase.balance_due ?? 0,
          payment_status: purchase.payment_status ?? "Unknown",
          total_credits_purchased: purchase.total_credits_purchased,
          expiry_date: purchase.expiry_date ?? "",
          payment_method: purchase.payment_method,
          vendor: purchase.vendor,
          customer_name: purchase.customer_name ?? "",
          billing_address: purchase.billing_address ?? "",
          notes: purchase.notes ?? ""
        }
      : {
          platform: "Magnific",
          invoice_name: "",
          purchase_date: new Date().toISOString().slice(0, 10),
          due_date: "",
          subscription_plan: "",
          invoice_number: "",
          currency: "INR",
          subtotal: 0,
          tax_amount: 0,
          discount_amount: 0,
          purchase_amount: 0,
          amount_paid: 0,
          balance_due: 0,
          payment_status: "Unknown",
          total_credits_purchased: 0,
          expiry_date: "",
          payment_method: "UPI",
          vendor: "",
          customer_name: "",
          billing_address: "",
          notes: ""
        }
  });

  async function handlePurchaseInvoiceUpload(file?: File) {
    if (!file) return;
    if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "Invalid invoice file", description: "Upload PDF, PNG, JPG, JPEG, or WEBP only.", variant: "destructive" });
      return;
    }

    setExtractionStep("Uploading...");
    const data_url = await fileToDataUrl(file);
    const nextInvoice: InvoiceFile = { name: file.name, type: file.type, size: file.size, data_url, uploaded_at: new Date().toISOString() };
    setInvoice(nextInvoice);

    setExtractionStep("Reading PDF...");
    const extraction = await extractTextFromInvoiceFile(file, (message) => setExtractionStep(message));
    setExtractionStep("Extracting Invoice Details...");
    await wait(250);

    const extracted = extractCreditPurchaseInvoice(file.name, extraction.text, extraction.method, extraction.ocrConfidence);
    Object.entries(extracted.values).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        form.setValue(key as keyof PurchaseFormValues, value as never, { shouldValidate: true, shouldDirty: true });
      }
    });
    form.setValue("notes", extracted.notes, { shouldValidate: true, shouldDirty: true });
    setExtractedJson(extracted.extractedJson);
    setOcrText(extracted.ocrText);
    setExtractionConfidence(extracted.confidence);
    setMissingFields(extracted.missingFields);
    setExtractionStep("Populating Form...");
    await wait(250);
    setExtractionStep("Done");
    await wait(500);
    setExtractionStep("");

    toast({
      title: "Invoice extracted",
      description: extracted.missingFields.length ? `Missing: ${extracted.missingFields.slice(0, 4).join(", ")}` : "Form populated from invoice details."
    });
  }

  function handlePurchaseInvoiceDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDraggingInvoice(false);
    handlePurchaseInvoiceUpload(event.dataTransfer.files?.[0]);
  }

  function buildPurchaseInput(values: PurchaseFormValues) {
    return {
      ...values,
      user_id: purchase?.user_id ?? currentUser.id,
      invoice_name: values.invoice_name || invoice?.name || "Imported invoice",
      due_date: values.due_date || null,
      subscription_plan: values.subscription_plan || "Imported invoice",
      invoice_number: values.invoice_number || `IMP-${Date.now()}`,
      currency: values.currency || "INR",
      subtotal: Number(values.subtotal || 0),
      tax_amount: Number(values.tax_amount || 0),
      discount_amount: Number(values.discount_amount || 0),
      purchase_amount: Number(values.purchase_amount || 0),
      amount_paid: Number(values.purchase_amount || values.amount_paid || 0),
      balance_due: Number(values.balance_due || 0),
      payment_status: values.payment_status || "Unknown",
      expiry_date: values.expiry_date || null,
      notes: values.notes || null,
      vendor: values.vendor || values.platform || "Not detected",
      customer_name: values.customer_name || currentUser.full_name || null,
      billing_address: values.billing_address || null,
      invoice_file: invoice,
      extracted_json: extractedJson,
      ocr_text: ocrText || null
    };
  }

  function validateRequiredPurchase(values: PurchaseFormValues) {
    const missing: string[] = [];
    if (!values.platform) missing.push("Platform Name");
    if (!values.purchase_date) missing.push("Purchase Date");
    if (!values.payment_method) missing.push("Payment Method");
    if (!Number(values.purchase_amount || 0)) missing.push("Amount Paid");
    if (!Number(values.total_credits_purchased || 0)) missing.push("Credits");
    if (missing.length) {
      setMissingFields((current) => Array.from(new Set([...current, ...missing])));
      toast({ title: "Required fields missing", description: `Please fill: ${missing.join(", ")}`, variant: "destructive" });
      return false;
    }
    return true;
  }

  async function findDuplicateInvoice(values: PurchaseFormValues) {
    const invoiceNumber = values.invoice_number?.trim();
    if (!invoiceNumber) return null;
    const purchases = await getPurchases(currentUser);
    return purchases.find((item) => item.id !== purchase?.id && item.invoice_number.trim().toLowerCase() === invoiceNumber.toLowerCase()) ?? null;
  }

  function isSameInvoice(existing: CreditPurchase, values: PurchaseFormValues) {
    return (
      existing.vendor.trim().toLowerCase() === String(values.vendor || "").trim().toLowerCase() &&
      existing.purchase_date === values.purchase_date &&
      Number(existing.purchase_amount || 0) === Number(values.purchase_amount || 0)
    );
  }

  async function savePurchaseInput(input: Parameters<typeof savePurchase>[0], purchaseId?: string, allowDuplicateInvoice = false) {
    try {
      await savePurchase(input, purchaseId, { allowDuplicateInvoice });
      toast({ title: purchaseId ? "Purchase updated" : "Purchase saved", description: "Purchase credits saved successfully." });
      onDone();
    } catch (error) {
      toast({ title: "Purchase save failed", description: getError(error), variant: "destructive" });
    }
  }

  async function onSubmit(values: PurchaseFormValues) {
    if (!validateRequiredPurchase(values)) return;
    const input = buildPurchaseInput(values);
    const duplicate = await findDuplicateInvoice(values);
    if (duplicate) {
      setDuplicateState({ kind: isSameInvoice(duplicate, values) ? "same" : "different", existing: duplicate, input });
      return;
    }
    await savePurchaseInput(input, purchase?.id);
  }

  function canEdit(label: string) {
    return Boolean(purchase) || label === "Credits" || label === "Notes" || label === "Invoice Number" || !extractedLocked || missingFields.includes(label) || forceEditableFields.includes(label);
  }

  function missingInputClass(label: string) {
    return missingFields.includes(label) ? "border-[#E53935] focus-visible:ring-[#E53935]/30" : undefined;
  }

  return (
    <>
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
      {!purchase ? (
      <div className="sm:col-span-2">
        <Label>Upload Invoice</Label>
        <div className="mt-2 rounded-md border border-dashed p-5">
          <label
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md bg-muted/35 p-6 text-center text-sm text-muted-foreground transition",
              isDraggingInvoice && "border border-[#E53935] bg-[#E53935]/10 text-foreground"
            )}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDraggingInvoice(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setIsDraggingInvoice(false)}
            onDrop={handlePurchaseInvoiceDrop}
          >
            <FileUp className="h-8 w-8 text-[#E53935]" />
            <span className="font-semibold text-foreground">Upload PDF invoice</span>
            <span>Drag & Drop or Choose File</span>
            <span className="text-xs">Supported Files: PDF, PNG, JPG, JPEG, WEBP</span>
            <input className="hidden" type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={(event) => handlePurchaseInvoiceUpload(event.target.files?.[0])} />
          </label>
          {extractionStep ? <p className="mt-3 text-sm font-medium text-[#E53935]">{extractionStep}</p> : null}
          {extractionConfidence != null ? (
            <p className={cn("mt-3 text-xs", extractionConfidence < 70 ? "text-[#E53935]" : "text-muted-foreground")}>
              OCR Confidence: {extractionConfidence}%{extractionConfidence < 70 ? " - Some fields could not be detected. Please verify before saving." : ""}
            </p>
          ) : null}
          {missingFields.length ? (
            <p className="mt-2 text-xs text-muted-foreground">Could not detect: {missingFields.join(", ")}</p>
          ) : null}
          {invoice ? (
            <div className="mt-4 space-y-4">
              <div className="flex flex-col gap-3 rounded-md border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{invoice.name}</p>
                  <p className="text-xs text-muted-foreground">{invoice.type} · {formatNumber(Math.round(invoice.size / 1024))} KB</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => downloadInvoice(invoice)}><Download className="h-4 w-4" />Download</Button>
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium">
                    Replace
                    <input className="hidden" type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={(event) => handlePurchaseInvoiceUpload(event.target.files?.[0])} />
                  </label>
                  <Button type="button" variant="destructive" onClick={() => { setInvoice(null); setExtractedJson(null); setOcrText(""); setExtractionConfidence(null); setMissingFields([]); }}>Delete</Button>
                </div>
              </div>
              <InvoicePreview invoice={invoice} />
            </div>
          ) : null}
        </div>
      </div>
      ) : null}
      <Field label="Platform Name" error={form.formState.errors.platform?.message}>
        <Select disabled={!canEdit("Platform Name")} value={form.watch("platform")} onValueChange={(value) => form.setValue("platform", value as Platform, { shouldValidate: true })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{PLATFORMS.map((platform) => <SelectItem key={platform} value={platform}>{platform}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Purchase Date" error={form.formState.errors.purchase_date?.message}><Input disabled={!canEdit("Purchase Date")} className={missingInputClass("Purchase Date")} type="date" {...form.register("purchase_date")} /></Field>
      <Field label="Invoice Number" error={form.formState.errors.invoice_number?.message}><Input disabled={!canEdit("Invoice Number")} className={missingInputClass("Invoice Number")} placeholder="INV-C-2026-16226061" {...form.register("invoice_number")} /></Field>
      <Field label="Payment Method">
        <Select disabled={!canEdit("Payment Method")} value={form.watch("payment_method")} onValueChange={(value) => form.setValue("payment_method", value as PaymentMethod, { shouldValidate: true })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{PAYMENT_METHODS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Amount Paid" error={form.formState.errors.purchase_amount?.message}><Input disabled={!canEdit("Amount Paid")} className={missingInputClass("Amount Paid")} type="number" min="0" step="0.01" {...form.register("purchase_amount")} /></Field>
      <Field label="Credits" error={form.formState.errors.total_credits_purchased?.message}><Input type="number" min="1" {...form.register("total_credits_purchased")} /></Field>
      <Field label="Notes" className="sm:col-span-2"><Textarea className={missingInputClass("Notes")} {...form.register("notes")} /></Field>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button disabled={form.formState.isSubmitting}>Save</Button>
      </div>
    </form>
    <Dialog open={!!duplicateState} onOpenChange={(open) => !open && setDuplicateState(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{duplicateState?.kind === "same" ? "This invoice already exists." : "Invoice number already exists but the invoice details are different."}</DialogTitle>
        </DialogHeader>
        {duplicateState ? (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/35 p-4 text-sm text-muted-foreground">
              <p><span className="font-semibold text-foreground">Existing:</span> {duplicateState.existing.vendor} · {duplicateState.existing.purchase_date} · {duplicateState.existing.currency} {formatNumber(duplicateState.existing.purchase_amount)}</p>
              <p><span className="font-semibold text-foreground">Uploaded:</span> {duplicateState.input.vendor} · {duplicateState.input.purchase_date} · {duplicateState.input.currency} {formatNumber(duplicateState.input.purchase_amount)}</p>
            </div>
            {duplicateState.kind === "same" ? (
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDuplicateState(null)}>Cancel</Button>
                <Button type="button" onClick={() => savePurchaseInput(duplicateState.input, duplicateState.existing.id)}>Update Existing Invoice</Button>
              </div>
            ) : (
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => savePurchaseInput(duplicateState.input, undefined, true)}>Create as New Invoice</Button>
                <Button type="button" onClick={() => savePurchaseInput(duplicateState.input, duplicateState.existing.id)}>Replace Existing Record</Button>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
    </>
  );
}

function InvoiceUpload({ invoice, onInvoice }: { invoice: InvoiceFile | null; onInvoice: (invoice: InvoiceFile | null) => void }) {
  const { toast } = useToast();
  async function handleFile(file?: File) {
    if (!file) return;
    if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "Invalid invoice file", description: "Upload PDF, JPG, PNG, or WEBP only.", variant: "destructive" });
      return;
    }
    const data_url = await fileToDataUrl(file);
    onInvoice({ name: file.name, type: file.type, size: file.size, data_url, uploaded_at: new Date().toISOString() });
  }

  return (
    <div className="rounded-md border border-dashed p-4">
      {invoice ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">{invoice.name}</p>
            <p className="text-xs text-muted-foreground">{invoice.type} · {formatNumber(Math.round(invoice.size / 1024))} KB</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => downloadInvoice(invoice)}><Download className="h-4 w-4" />Download</Button>
            <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium">
              Replace
              <input className="hidden" type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={(event) => handleFile(event.target.files?.[0])} />
            </label>
            <Button type="button" variant="destructive" onClick={() => onInvoice(null)}>Delete</Button>
          </div>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 py-6 text-center text-sm text-muted-foreground">
          <FileUp className="h-6 w-6" />
          Upload invoice PDF, JPG, PNG, or WEBP
          <input className="hidden" type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={(event) => handleFile(event.target.files?.[0])} />
        </label>
      )}
    </div>
  );
}

function InvoiceViewer({ purchase, onOpenChange, onReplaced }: { purchase: CreditPurchase | null; onOpenChange: (open: boolean) => void; onReplaced: () => void }) {
  const [zoom, setZoom] = useState(1);
  if (!purchase) return null;
  const invoice = purchase.invoice_file;
  return (
    <Dialog open={!!purchase} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader><DialogTitle>Invoice {purchase.invoice_number}</DialogTitle></DialogHeader>
        {invoice ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setZoom((value) => Math.min(value + 0.15, 2))}>Zoom In</Button>
              <Button type="button" variant="outline" onClick={() => setZoom((value) => Math.max(value - 0.15, 0.6))}>Zoom Out</Button>
              <Button type="button" variant="outline" onClick={() => downloadInvoice(invoice)}><Download className="h-4 w-4" />Download</Button>
              <Button type="button" variant="outline" onClick={() => window.print()}>Print</Button>
            </div>
            <div className="overflow-auto rounded-md border bg-muted p-3">
              {invoice.type === "application/pdf" ? (
                <iframe title={invoice.name} src={invoice.data_url} className="h-[70vh] w-full rounded bg-white" style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }} />
              ) : (
                <img src={invoice.data_url} alt={invoice.name} className="mx-auto max-h-[70vh] rounded bg-white object-contain" style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }} />
              )}
            </div>
          </div>
        ) : <p className="text-sm text-muted-foreground">No invoice uploaded for this purchase.</p>}
      </DialogContent>
    </Dialog>
  );
}

function PaymentInvoiceViewer({ invoice, onOpenChange }: { invoice: InvoiceFile | null; onOpenChange: (open: boolean) => void }) {
  const [zoom, setZoom] = useState(1);
  return (
    <Dialog open={!!invoice} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader><DialogTitle>{invoice?.name ?? "Invoice"}</DialogTitle></DialogHeader>
        {invoice ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setZoom((value) => Math.min(value + 0.15, 2))}>Zoom In</Button>
              <Button type="button" variant="outline" onClick={() => setZoom((value) => Math.max(value - 0.15, 0.6))}>Zoom Out</Button>
              <Button type="button" variant="outline" onClick={() => downloadInvoice(invoice)}><Download className="h-4 w-4" />Download</Button>
              <Button type="button" variant="outline" onClick={() => window.print()}>Print</Button>
            </div>
            <InvoicePreview invoice={invoice} zoom={zoom} large />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function InvoicePreview({ invoice, zoom = 1, large }: { invoice: InvoiceFile; zoom?: number; large?: boolean }) {
  return (
    <div className={cn("overflow-auto rounded-md border bg-muted p-3", large ? "max-h-[72vh]" : "max-h-80")}>
      {invoice.type === "application/pdf" ? (
        <iframe title={invoice.name} src={invoice.data_url} className={cn("w-full rounded bg-white", large ? "h-[70vh]" : "h-72")} style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }} />
      ) : (
        <img src={invoice.data_url} alt={invoice.name} className="mx-auto max-h-[70vh] rounded bg-white object-contain" style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }} />
      )}
    </div>
  );
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function downloadInvoice(invoice: InvoiceFile) {
  const anchor = document.createElement("a");
  anchor.href = invoice.data_url;
  anchor.download = invoice.name;
  anchor.click();
}

async function extractTextFromInvoiceFile(file: File, onStep: (message: string) => void) {
  if (file.type === "application/pdf") {
    return extractPdfInvoiceText(file, onStep);
  }
  onStep("Running OCR...");
  return {
    text: await recognizeImageText(file, onStep),
    method: "ocr" as const,
    ocrConfidence: 80
  };
}

async function extractPdfInvoiceText(file: File, onStep: (message: string) => void) {
  const data = await file.arrayBuffer();
  const document = await pdfjsLib.getDocument({ data }).promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    onStep(`Reading PDF page ${pageNumber} of ${document.numPages}...`);
    const page = await document.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) pageTexts.push(text);
  }

  const digitalText = pageTexts.join("\n").trim();
  if (digitalText.length > 80) {
    return { text: digitalText, method: "pdf-text" as const, ocrConfidence: 100 };
  }

  onStep("Running OCR...");
  const ocrTexts: string[] = [];
  const confidences: number[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    onStep(`Running OCR page ${pageNumber} of ${document.numPages}...`);
    const page = await document.getPage(pageNumber);
    const canvas = await documentPageToCanvas(page);
    const result = await recognizeCanvasText(canvas, onStep);
    ocrTexts.push(result.text);
    if (result.confidence) confidences.push(result.confidence);
  }

  return {
    text: ocrTexts.join("\n").trim(),
    method: "ocr" as const,
    ocrConfidence: confidences.length ? Math.round(confidences.reduce((sum, value) => sum + value, 0) / confidences.length) : 0
  };
}

async function documentPageToCanvas(page: pdfjsLib.PDFPageProxy) {
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create canvas context for OCR.");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  await page.render({ canvas, canvasContext: context, viewport }).promise;
  return canvas;
}

async function recognizeImageText(file: File, onStep: (message: string) => void) {
  const result = await recognizeCanvasText(file, onStep);
  return result.text;
}

async function recognizeCanvasText(image: HTMLCanvasElement | File, onStep: (message: string) => void) {
  const worker = await createWorker("eng", undefined, {
    workerPath: tesseractWorkerUrl,
    corePath: tesseractCoreUrl,
    langPath: TESSERACT_LANG_PATH,
    gzip: true,
    logger: (message) => {
      if (message.status) {
        const progress = Math.round((message.progress || 0) * 100);
        onStep(progress ? `Running OCR... ${progress}%` : "Running OCR...");
      }
    }
  });
  try {
    const result = await worker.recognize(image);
    return {
      text: result.data.text.replace(/\s+/g, " ").trim(),
      confidence: Math.round(result.data.confidence || 0)
    };
  } finally {
    await worker.terminate();
  }
}

function generateInvoiceNumber() {
  return `INV-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function extractCreditPurchaseInvoice(filename: string, rawText: string, method: "pdf-text" | "ocr", ocrConfidence: number) {
  const source = `${filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ")} ${rawText}`.replace(/\s+/g, " ").trim();
  const platform = detectPlatform(source);
  const vendor = detectVendor(source) || platform;
  const invoiceName = pickMatch(source, [
    /(?:invoice name|description|item|product|service)[:\s-]*([a-z0-9 &+./-]{3,60})/i,
    /\b([a-z0-9 &+.-]{3,40}\s+(?:invoice|subscription|plan))\b/i
  ]) || `${vendor} Invoice`;
  const invoiceNumber = pickMatch(source, [
    /\b(?:invoice|inv|receipt)\s*(?:number|no|#|id)?[:\s-]*([a-z0-9][a-z0-9./-]{3,})/i,
    /\b(?:invoice|inv|receipt)[\s#:.-]+([a-z]{1,8}[-/]?\d[a-z0-9./-]{2,})\b/i,
    /\b((?:INV|FP|OPENAI|ANT|MID|RUN|CUR|GEM|MAG|STB|REP)[-/]?\d{3,}[-/]?\d*)\b/i
  ]);
  const credits = 0;
  const totalAmount = pickNumber(source, [
    /(?:amount paid|paid|total due|total amount|grand total|invoice total|total|amount)[:\s-]*(?:₹|rs\.?|inr|usd|\$|aed|eur|€)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:₹|rs\.?|inr|usd|\$|aed|eur|€)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:total|paid|due)?/i,
    /(?:₹|rs\.?|inr|usd|\$|aed)\s*([\d,]+(?:\.\d{1,2})?)/i
  ]);
  const subtotal = pickNumber(source, [
    /(?:subtotal|sub total|net amount|before tax|taxable amount)[:\s-]*(?:₹|rs\.?|inr|usd|\$|aed|eur|€)?\s*([\d,]+(?:\.\d{1,2})?)/i
  ]);
  const tax = pickNumber(source, [
    /(?:tax|gst|vat|cgst|sgst|igst|sales tax|tax amount)[:\s@%()-]*(?:₹|rs\.?|inr|usd|\$|aed|eur|€)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:₹|rs\.?|inr|usd|\$|aed|eur|€)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:tax|gst|vat|cgst|sgst|igst)/i,
    /(?:tax|gst|vat|cgst|sgst|igst)[^\d]{0,24}([\d,]+(?:\.\d{1,2})?)/i
  ]);
  const discount = pickNumber(source, [
    /(?:discount|coupon|credit applied)[:\s-]*(?:₹|rs\.?|inr|usd|\$|aed)?\s*([\d,]+(?:\.\d{1,2})?)/i
  ]);
  const amountPaid = pickNumber(source, [
    /(?:amount paid|paid|payment received|charged|card charged)[:\s-]*(?:₹|rs\.?|inr|usd|\$|aed|eur|€)?\s*([\d,]+(?:\.\d{1,2})?)/i
  ]) || totalAmount;
  const balanceDue = pickNumber(source, [
    /(?:balance due|amount due|due amount|outstanding)[:\s-]*(?:₹|rs\.?|inr|usd|\$|aed)?\s*([\d,]+(?:\.\d{1,2})?)/i
  ]);
  const currency = detectCurrency(source);
  const purchaseDate = normalizeInvoiceDate(
    pickMatch(source, [
      /(?:invoice date|payment date|purchase date|date)[:\s-]*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i,
      /(?:invoice date|payment date|purchase date|date)[:\s-]*([a-z]{3,9}\s+\d{1,2},?\s+20\d{2})/i,
      /(?:invoice date|payment date|purchase date|date)[:\s-]*(\d{1,2}\s+[a-z]{3,9},?\s+20\d{2})/i,
      /(?:issued|created|billed on|receipt date)[:\s-]*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i,
      /(?:issued|created|billed on|receipt date)[:\s-]*([a-z]{3,9}\s+\d{1,2},?\s+20\d{2})/i,
      /(?:issued|created|billed on|receipt date)[:\s-]*(\d{1,2}\s+[a-z]{3,9},?\s+20\d{2})/i,
      /\b(20\d{2}[./-]\d{1,2}[./-]\d{1,2})\b/
    ])
  );
  const expiryDate = normalizeInvoiceDate(
    pickMatch(source, [
      /(?:expiry|expires|valid until|renews on)[:\s-]*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i,
      /(?:expiry|expires|valid until|renews on)[:\s-]*([a-z]{3,9}\s+\d{1,2},?\s+20\d{2})/i
    ])
  );
  const dueDate = normalizeInvoiceDate(
    pickMatch(source, [
      /(?:due date|payment due)[:\s-]*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i,
      /(?:due date|payment due)[:\s-]*([a-z]{3,9}\s+\d{1,2},?\s+20\d{2})/i,
      /(?:due date|payment due)[:\s-]*(\d{1,2}\s+[a-z]{3,9},?\s+20\d{2})/i
    ])
  );
  const plan = pickMatch(source, [
    /(?:subscription plan|plan name|plan)[:\s-]*([a-z0-9 &+./-]{3,40})/i,
    /\b(premium monthly|premium yearly|pro monthly|pro yearly|standard monthly|business monthly|enterprise)\b/i
  ]);
  const paymentMethod = detectPaymentMethod(source);
  const paymentStatus = detectPaymentStatus(source, balanceDue, amountPaid, totalAmount);
  const customerName = pickMatch(source, [
    /(?:customer name|customer|bill to|billed to|client|name)[:\s-]*([a-z][a-z .'-]{2,60})/i,
    /(?:billing details|billing information)[:\s-]*([a-z][a-z .'-]{2,60})/i
  ]);
  const billingAddress = pickMatch(source, [
    /(?:billing address|bill to address|billing details|billing information|address)[:\s-]*([a-z0-9, .#/\-]{8,180}?)(?:\s+(?:invoice|payment|subtotal|total|tax|gst|vat|email|phone)\b|$)/i,
    /(?:bill to|billed to)[:\s-]*[a-z .'-]{2,60}\s+([a-z0-9, .#/\-]{8,160}?)(?:\s+(?:invoice|payment|subtotal|total|tax|gst|vat|email|phone)\b|$)/i
  ]);
  const extractedValues: Partial<PurchaseFormValues> = {
    platform,
    invoice_name: invoiceName,
    subscription_plan: cleanExtractedText(plan) || `${platform} Subscription`,
    purchase_date: purchaseDate || new Date().toISOString().slice(0, 10),
    due_date: dueDate || "",
    invoice_number: invoiceNumber ? invoiceNumber.toUpperCase() : generateInvoiceNumber(),
    currency,
    subtotal: subtotal || Math.max(totalAmount - tax + discount, 0),
    tax_amount: tax,
    discount_amount: discount,
    purchase_amount: totalAmount,
    amount_paid: amountPaid,
    balance_due: balanceDue,
    payment_status: paymentStatus,
    total_credits_purchased: undefined,
    expiry_date: expiryDate || "",
    vendor: vendor || platform,
    payment_method: paymentMethod,
    customer_name: customerName,
    billing_address: billingAddress
  };
  const confidenceFields = [
    platform,
    plan,
    purchaseDate,
    dueDate,
    invoiceNumber,
    currency,
    totalAmount,
    tax,
    amountPaid,
    paymentStatus !== "Unknown",
    vendor,
    paymentMethod,
    customerName,
    billingAddress
  ].filter(Boolean).length;
  const confidence = method === "ocr" && ocrConfidence ? Math.round((ocrConfidence + Math.min(100, (confidenceFields / 13) * 100)) / 2) : Math.min(99, Math.max(45, Math.round((confidenceFields / 13) * 100)));
  const requiredDetections: Array<[string, unknown]> = [
    ["Platform Name", platform],
    ["Purchased By", customerName],
    ["Purchase Date", purchaseDate],
    ["Payment Method", paymentMethod !== "Other"],
    ["Amount Paid", amountPaid],
  ];
  const missingFields = requiredDetections.filter(([, value]) => !value).map(([label]) => label);
  const notes = buildPurchaseInvoiceNotes(extractedValues, confidence, rawText, method, missingFields);
  return {
    values: extractedValues,
    notes,
    confidence,
    missingFields,
    extractedJson: {
      extraction_method: method,
      missing_fields: missingFields,
      platform: extractedValues.platform,
      invoice_name: extractedValues.invoice_name,
      plan: extractedValues.subscription_plan,
      invoice_number: extractedValues.invoice_number,
      invoice_date: extractedValues.purchase_date,
      due_date: extractedValues.due_date || null,
      subtotal: extractedValues.subtotal,
      tax: extractedValues.tax_amount,
      discount: extractedValues.discount_amount,
      total_amount: extractedValues.purchase_amount,
      amount_paid: extractedValues.amount_paid,
      balance_due: extractedValues.balance_due,
      payment_status: extractedValues.payment_status,
      purchase_amount: extractedValues.purchase_amount,
      currency: extractedValues.currency,
      credits: extractedValues.total_credits_purchased,
      vendor: extractedValues.vendor,
      payment_method: extractedValues.payment_method,
      customer_name: extractedValues.customer_name || null,
      billing_address: extractedValues.billing_address || null,
      purchase_date: extractedValues.purchase_date,
      expiry_date: extractedValues.expiry_date || null
    },
    ocrText: rawText || source
  };
}

function buildPurchaseInvoiceNotes(values: Partial<PurchaseFormValues>, confidence: number, rawText: string, method: "pdf-text" | "ocr", missingFields: string[]) {
  const summary = [
    `Invoice imported automatically from uploaded PDF.`,
    ``,
    `Platform Name:`,
    `${values.platform ?? "Not detected"}`,
    ``,
    `Purchased By:`,
    `${values.customer_name || "Not detected"}`,
    ``,
    `Purchase Date:`,
    `${values.purchase_date ? formatDate(values.purchase_date) : "Not detected"}`,
    ``,
    `Payment Method:`,
    `${values.payment_method ?? "Not detected"}`,
    ``,
    `Amount Paid:`,
    `${values.currency ?? ""} ${values.purchase_amount ? formatNumber(values.purchase_amount) : "Not detected"}`.trim(),
    ``,
    `Extraction Method:`,
    method === "pdf-text" ? "PDF text extraction" : "Tesseract OCR",
    ``,
    `Missing Fields:`,
    missingFields.length ? missingFields.join(", ") : "None",
    ``,
    `OCR Confidence:`,
    `${confidence}%`
  ].join("\n");
  const appendix = rawText ? `\n\nExtracted Invoice Text:\n${rawText.slice(0, 2500)}` : "";
  return `${summary}${appendix}`;
}

function detectPlatform(text: string): Platform {
  const lower = text.toLowerCase();
  const match = PLATFORMS.find((platform) => lower.includes(platform.toLowerCase().replace(" ai", "")));
  if (match) return match;
  if (lower.includes(["fr", "eepik"].join(""))) return "Magnific";
  if (lower.includes("openai") || lower.includes("chatgpt")) return "ChatGPT";
  if (lower.includes("anthropic") || lower.includes("claude")) return "Claude";
  if (lower.includes("google") || lower.includes("gemini")) return "Gemini";
  if (lower.includes("stability") || lower.includes("stable diffusion")) return "Stable Diffusion";
  if (lower.includes("leonardo")) return "Leonardo AI";
  return "Other";
}

function detectCurrency(text: string) {
  const lower = text.toLowerCase();
  if (text.includes("₹") || lower.includes("inr") || lower.includes("rs")) return "INR";
  if (text.includes("$") || lower.includes("usd")) return "USD";
  if (lower.includes("aed")) return "AED";
  if (lower.includes("eur") || text.includes("€")) return "EUR";
  return "INR";
}

function detectPaymentMethod(text: string): PaymentMethod {
  const lower = text.toLowerCase();
  if (lower.includes("upi")) return "UPI";
  if (lower.includes("paypal")) return "PayPal";
  if (lower.includes("bank card") || lower.includes("card ending") || lower.includes("ending in")) return "Credit Card";
  if (lower.includes("debit")) return "Debit Card";
  if (lower.includes("credit card") || lower.includes("visa") || lower.includes("mastercard") || lower.includes("amex")) return "Credit Card";
  if (lower.includes("net banking")) return "Net Banking";
  if (lower.includes("bank transfer") || lower.includes("wire transfer") || lower.includes("ach") || lower.includes("sepa")) return "Bank Transfer";
  return "Other";
}

function detectPaymentStatus(text: string, balanceDue: number, amountPaid: number, totalAmount: number): PurchaseFormValues["payment_status"] {
  const lower = text.toLowerCase();
  if (lower.includes("partially paid") || (balanceDue > 0 && amountPaid > 0 && amountPaid < totalAmount)) return "Partially Paid";
  if (lower.includes("unpaid") || lower.includes("payment due") || balanceDue > 0) return "Unpaid";
  if (lower.includes("paid") || lower.includes("payment received") || (totalAmount > 0 && amountPaid >= totalAmount)) return "Paid";
  return "Unknown";
}

function pickMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern)?.[1];
    if (match) return cleanExtractedText(match);
  }
  return "";
}

function pickNumber(text: string, patterns: RegExp[]) {
  const value = pickMatch(text, patterns);
  return value ? Number(value.replace(/,/g, "")) || 0 : 0;
}

function cleanExtractedText(value: string) {
  return value.replace(/\s{2,}/g, " ").replace(/[|()[\]{}]+/g, "").trim();
}

function normalizeInvoiceDate(value: string) {
  if (!value) return "";
  const normalized = value.trim().replace(/\./g, "/");
  const monthNames: Record<string, string> = {
    jan: "01", january: "01",
    feb: "02", february: "02",
    mar: "03", march: "03",
    apr: "04", april: "04",
    may: "05",
    jun: "06", june: "06",
    jul: "07", july: "07",
    aug: "08", august: "08",
    sep: "09", sept: "09", september: "09",
    oct: "10", october: "10",
    nov: "11", november: "11",
    dec: "12", december: "12"
  };
  const dayMonthYear = normalized.match(/^(\d{1,2})\s+([a-z]{3,9}),?\s+(20\d{2})$/i);
  if (dayMonthYear) {
    const [, day, month, year] = dayMonthYear;
    const numericMonth = monthNames[month.toLowerCase()];
    if (numericMonth) return `${year}-${numericMonth}-${day.padStart(2, "0")}`;
  }
  const monthDayYear = normalized.match(/^([a-z]{3,9})\s+(\d{1,2}),?\s+(20\d{2})$/i);
  if (monthDayYear) {
    const [, month, day, year] = monthDayYear;
    const numericMonth = monthNames[month.toLowerCase()];
    if (numericMonth) return `${year}-${numericMonth}-${day.padStart(2, "0")}`;
  }
  const numeric = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (numeric) {
    const [, first, second, year] = numeric;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${second.padStart(2, "0")}-${first.padStart(2, "0")}`;
  }
  const iso = normalized.match(/^(20\d{2})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function detectVendor(text: string) {
  const genericVendor = pickMatch(text, [
    /(?:vendor|supplier|merchant|seller|from|issued by|billed by)[:\s-]*([a-z0-9 .,&+'-]{2,60})/i,
    /^([a-z0-9 .,&+'-]{2,50})\s+(?:invoice|receipt)/i
  ]);
  if (genericVendor) return genericVendor;
  const legacyProvider = ["fr", "eepik"].join("");
  const vendors = ["OpenAI", "ChatGPT", "Anthropic", "Claude", "Google", "Google Gemini", "Gemini", "Grok", "Midjourney", "Magnific", legacyProvider, "Replicate", "Runway", "ElevenLabs", "Fal.ai", "Leonardo AI", "Adobe Firefly", "Stability AI", "Flux", "Cursor", "GitHub Copilot"];
  return vendors.find((vendor) => text.toLowerCase().includes(vendor.toLowerCase().replace(" ai", ""))) ?? "";
}

function UsagePage({ profile }: { profile: Profile }) {
  const [records, setRecords] = useState<AiUsage[]>([]);
  const [purchases, setPurchases] = useState<CreditPurchase[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AiUsage | null>(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  async function refresh() {
    await loadUsage(profile, setRecords);
    setPurchases(await getPurchases(profile));
  }

  useEffect(() => {
    refresh();
  }, [profile]);

  const filtered = records.filter((record) =>
    `${record.platform} ${record.category ?? ""} ${record.description} ${record.supplier_requirements ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  async function remove(record: AiUsage) {
    if (!confirm(`Delete ${record.platform} usage from ${formatDate(record.date)}?`)) return;
    try {
      await deleteUsage(record.id);
      toast({ title: "Usage deleted" });
      refresh();
    } catch (error) {
      toast({ title: "Delete failed", description: getError(error), variant: "destructive" });
    }
  }

  return (
    <>
      <PageHeader
        title="AI Usage"
        description="Create, review, update, filter, and delete AI usage records."
        action={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" />New Usage</Button>}
      />
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search platform, description, supplier" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
        </CardContent>
      </Card>
      <DataTable
        headers={["S.No", "Date", "Platform", "Category", "Purchased", "Used", "Remaining", "Styles", "Images", "Purpose", ""]}
        empty="No usage records yet."
        rows={filtered.map((record, index) => [
          index + 1,
          formatDate(record.date),
          record.platform,
          record.category || "Custom",
          formatNumber(record.buy_credits),
          formatNumber(record.credits_used),
          formatNumber(record.remaining_credits),
          record.number_of_styles,
          record.number_of_images,
          record.description,
          <div className="flex gap-2" key={record.id}>
            <Button variant="outline" size="sm" onClick={() => { setEditing(record); setOpen(true); }}>Edit</Button>
            <Button variant="destructive" size="sm" onClick={() => remove(record)}>Delete</Button>
          </div>
        ])}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Usage" : "New Usage"}</DialogTitle></DialogHeader>
          <UsageForm currentUser={profile} record={editing} records={records} purchases={purchases} onDone={() => { setOpen(false); refresh(); }} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function CreditProgressCard({
  purchased,
  used,
  remaining,
  percentage
}: {
  purchased: number;
  used: number;
  remaining: number;
  percentage: number;
}) {
  const safePercentage = Math.min(Math.max(percentage || 0, 0), 100);
  return (
    <Card className="mt-6 overflow-hidden">
      <CardContent className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Usage Percentage</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Credits Used: {formatNumber(used)} / {formatNumber(purchased)}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-2xl font-bold">{safePercentage.toFixed(0)}%</p>
            <p className="text-sm text-muted-foreground">Remaining: {formatNumber(Math.max(remaining, 0))}</p>
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-[#E53935] transition-all duration-500" style={{ width: `${safePercentage}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}

function UsageForm({ currentUser, record, records, purchases, onDone }: { currentUser: Profile; record: AiUsage | null; records: AiUsage[]; purchases: CreditPurchase[]; onDone: () => void }) {
  const { toast } = useToast();
  const form = useForm<AiUsageFormValues>({
    resolver: zodResolver(aiUsageSchema),
    defaultValues: record
      ? {
          date: record.date,
          platform: record.platform,
          category: USAGE_CATEGORIES.includes(record.category as (typeof USAGE_CATEGORIES)[number])
            ? record.category as (typeof USAGE_CATEGORIES)[number]
            : "Design Studio",
          buy_credits: record.buy_credits,
          description: record.description,
          number_of_styles: record.number_of_styles,
          number_of_images: record.number_of_images,
          credits_used: record.credits_used,
          supplier_requirements: SUPPLIERS.includes(record.supplier_requirements as (typeof SUPPLIERS)[number])
            ? record.supplier_requirements as (typeof SUPPLIERS)[number]
            : "Syad"
        }
      : {
          date: new Date().toISOString().slice(0, 10),
          platform: "ChatGPT",
          category: "Design Studio",
          buy_credits: DEFAULT_PLATFORM_CREDIT_PACKS.ChatGPT ?? 0,
          description: "",
          number_of_styles: 0,
          number_of_images: 0,
          credits_used: 0,
          supplier_requirements: "Syad"
        }
  });
  const selectedPlatform = form.watch("platform");
  const selectedCategory = form.watch("category");
  const purchasedCredits = Number(form.watch("buy_credits") || 0);
  const numberOfStyles = Number(form.watch("number_of_styles") || 0);
  const totalImages = numberOfStyles * IMAGES_PER_STYLE;
  const creditsUsed = totalImages * CREDITS_PER_IMAGE;
  const previousPlatformCreditsUsed = records
    .filter((item) => item.id !== record?.id && item.user_id === (record?.user_id ?? currentUser.id) && item.platform === selectedPlatform)
    .reduce((sum, item) => sum + Number(item.credits_used || 0), 0);
  const remainingCredits = purchasedCredits - previousPlatformCreditsUsed - creditsUsed;
  const usagePercentage = purchasedCredits > 0 ? ((previousPlatformCreditsUsed + creditsUsed) / purchasedCredits) * 100 : 0;
  const insufficientCredits = remainingCredits < 0;

  useEffect(() => {
    form.setValue("number_of_images", totalImages, { shouldValidate: true });
    form.setValue("credits_used", creditsUsed, { shouldValidate: true });
  }, [creditsUsed, form, totalImages]);

  useEffect(() => {
    form.setValue("buy_credits", getPlatformPurchasedCredits(selectedPlatform), { shouldValidate: true });
  }, [purchases, selectedPlatform]);

  function getPlatformPurchasedCredits(platform: Platform) {
    return purchases
      .filter((purchase) => purchase.user_id === (record?.user_id ?? currentUser.id) && purchase.platform === platform)
      .reduce((sum, purchase) => sum + Number(purchase.total_credits_purchased || 0), 0);
  }

  async function onSubmit(values: AiUsageFormValues) {
    if (insufficientCredits) {
      toast({
        title: "Insufficient Credits. Please purchase more credits.",
        description: `${selectedPlatform} needs ${formatNumber(Math.abs(remainingCredits))} more credits for this usage.`,
        variant: "destructive"
      });
      return;
    }
    try {
      await saveUsage(
        {
          ...values,
          category: values.category,
          buy_credits: purchasedCredits,
          number_of_images: totalImages,
          credits_used: creditsUsed,
          supplier_requirements: values.supplier_requirements,
          user_id: record?.user_id ?? currentUser.id
        },
        record?.id
      );
      toast({ title: record ? "Usage updated" : "Usage created" });
      onDone();
    } catch (error) {
      toast({ title: "Save failed", description: getError(error), variant: "destructive" });
    }
  }

  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
      <Field label="Date" error={form.formState.errors.date?.message}><Input type="date" {...form.register("date")} /></Field>
      <Field label="Platform" error={form.formState.errors.platform?.message}>
        <Select
          value={selectedPlatform}
          onValueChange={(value) => {
            const platform = value as Platform;
            form.setValue("platform", platform, { shouldValidate: true });
            form.setValue("buy_credits", getPlatformPurchasedCredits(platform), { shouldValidate: true });
          }}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{PLATFORMS.map((platform) => <SelectItem key={platform} value={platform}>{platform}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Category" error={form.formState.errors.category?.message}>
        <Select value={selectedCategory} onValueChange={(value) => form.setValue("category", value as (typeof USAGE_CATEGORIES)[number], { shouldValidate: true })}>
          <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
          <SelectContent>
            {USAGE_CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Number of Styles" error={form.formState.errors.number_of_styles?.message}><Input type="number" min="0" {...form.register("number_of_styles")} /></Field>
      <div className="grid gap-3 rounded-md border bg-muted/35 p-4 sm:col-span-2 sm:grid-cols-3">
        <CalculationItem label="Purchased Credits" value={purchasedCredits} />
        <CalculationItem label="Total Images" value={totalImages} />
        <CalculationItem label="Credits Used" value={creditsUsed} />
        <CalculationItem label="Remaining Credits" value={Math.max(remainingCredits, 0)} danger={insufficientCredits} />
        <div className="sm:col-span-3">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>{formatNumber(previousPlatformCreditsUsed + creditsUsed)} / {formatNumber(purchasedCredits)} used</span>
            <span>{Math.min(Math.max(usagePercentage, 0), 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full transition-all duration-300", insufficientCredits ? "bg-destructive" : "bg-[#E53935]")} style={{ width: `${Math.min(Math.max(usagePercentage, 0), 100)}%` }} />
          </div>
          {insufficientCredits ? (
            <p className="mt-3 flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Insufficient Credits. Please purchase more credits.
            </p>
          ) : null}
        </div>
      </div>
      <Field label="Description / Purpose" error={form.formState.errors.description?.message} className="sm:col-span-2"><Textarea {...form.register("description")} /></Field>
      <Field label="Supplier" className="sm:col-span-2">
        <Select value={form.watch("supplier_requirements")} onValueChange={(value) => form.setValue("supplier_requirements", value as (typeof SUPPLIERS)[number], { shouldValidate: true })}>
          <SelectTrigger><SelectValue placeholder="Select Supplier" /></SelectTrigger>
          <SelectContent>
            {SUPPLIERS.map((supplier) => <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button disabled={form.formState.isSubmitting || insufficientCredits}>Save</Button>
      </div>
    </form>
  );
}

function CalculationItem({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-lg font-bold", danger && "text-destructive")}>{formatNumber(value)}</p>
    </div>
  );
}

function ReportsPage({ profile }: { profile: Profile }) {
  const [records, setRecords] = useState<AiUsage[]>([]);
  const [purchases, setPurchases] = useState<CreditPurchase[]>([]);
  useEffect(() => {
    loadUsage(profile, setRecords);
    getPurchases(profile).then(setPurchases).catch(console.error);
  }, [profile]);
  return (
    <>
      <PageHeader title="Reports" description="Monthly, platform, date range, and supplier reports with export options." />
      <ReportsDashboard records={records} purchases={purchases} />
    </>
  );
}

function PaymentsPage({ profile }: { profile: Profile }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [ledger, setLedger] = useState<CreditLedgerEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [invoicePreview, setInvoicePreview] = useState<InvoiceFile | null>(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  async function refresh() {
    try {
      const [nextPayments, nextLedger] = await Promise.all([
        getPayments(profile),
        getCreditLedger(profile.role === "admin" ? undefined : profile.email)
      ]);
      setPayments(nextPayments);
      setLedger(nextLedger);
    } catch (error) {
      toast({ title: "Payments failed", description: getError(error), variant: "destructive" });
    }
  }

  useEffect(() => {
    refresh();
  }, [profile]);

  const filtered = payments.filter((payment) =>
    `${payment.customer_name} ${payment.customer_email} ${payment.invoice_number} ${payment.vendor} ${payment.payment_method}`.toLowerCase().includes(search.toLowerCase())
  );
  const filteredLedger = ledger.filter((entry) =>
    `${entry.customer_email} ${entry.payment_id} ${entry.invoice_number}`.toLowerCase().includes(search.toLowerCase())
  );

  function exportPayments() {
    const header = ["Purchased By", "Email", "Platform", "Purchase Date", "Amount Paid", "Currency", "Credits", "Method", "Invoice"];
    const rows = filtered.map((p) => [p.customer_name, p.customer_email, p.vendor, p.paid_at, p.amount, p.currency, p.credits, p.payment_method, p.invoice_number]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "zeal-payments.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="Payments"
        description={profile.role === "admin" ? "Upload invoices and add AI credits without accounting clutter." : "View your payment history."}
        action={<div className="flex gap-2"><Button variant="outline" onClick={exportPayments}>Export</Button><Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" />New Credit Purchase</Button></div>}
      />
      <Card className="mb-4">
        <CardContent className="p-4">
          <Input placeholder="Search payments" value={search} onChange={(event) => setSearch(event.target.value)} />
        </CardContent>
      </Card>
      <DataTable
        headers={["Purchased By", "Platform", "Purchase Date", "Amount Paid", "Credits", "Method", "Invoice", ""]}
        empty="No payments found."
        rows={filtered.map((payment) => [
          payment.customer_name,
          payment.vendor,
          formatDate(payment.paid_at),
          `${payment.currency} ${formatNumber(payment.amount)}`,
          formatNumber(payment.credits ?? 0),
          payment.payment_method,
          payment.invoice_file ? (
            <div className="flex gap-2" key={`${payment.id}-invoice`}>
              <Button size="sm" variant="outline" onClick={() => setInvoicePreview(payment.invoice_file)}>View Invoice</Button>
              <Button size="sm" variant="outline" onClick={() => downloadInvoice(payment.invoice_file!)}>Download</Button>
            </div>
          ) : payment.invoice_number,
          <div className="flex gap-2" key={payment.id}>
            <Button variant="outline" size="sm" onClick={() => { setEditing(payment); setOpen(true); }}>View/Edit</Button>
            {profile.role === "admin" ? <Button variant="destructive" size="sm" onClick={async () => { await deletePayment(payment.id); refresh(); }}>Delete</Button> : null}
          </div>
        ])}
      />
      <div className="mt-6 space-y-3">
        <h2 className="text-lg font-semibold">Credit Ledger</h2>
        <DataTable
          headers={["Date", "Customer", "Invoice", "Credits Added", "Total Credits"]}
          empty="No credit ledger entries found."
          rows={filteredLedger.map((entry) => [
            formatDate(entry.created_at),
            entry.customer_email,
            entry.invoice_number,
            `${entry.credits_added >= 0 ? "+" : ""}${formatNumber(entry.credits_added)}`,
            formatNumber(entry.total_credits)
          ])}
        />
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Credit Purchase Details" : "New Credit Purchase"}</DialogTitle></DialogHeader>
          <PaymentForm currentUser={profile} payment={editing} onDone={() => { setOpen(false); refresh(); }} />
        </DialogContent>
      </Dialog>
      <PaymentInvoiceViewer invoice={invoicePreview} onOpenChange={(open) => !open && setInvoicePreview(null)} />
    </>
  );
}

function PaymentForm({ currentUser, payment, onDone }: { currentUser: Profile; payment: Payment | null; onDone: () => void }) {
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<InvoiceFile | null>(payment?.invoice_file ?? null);
  const [processingStep, setProcessingStep] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: payment
      ? {
          customer_name: payment.customer_name,
          customer_email: payment.customer_email,
          payment_id: payment.payment_id,
          transaction_id: payment.transaction_id,
          order_id: payment.order_id,
          amount: payment.amount,
          credits: payment.credits ?? 0,
          tax_amount: payment.tax_amount ?? 0,
          total_amount: payment.total_amount ?? payment.amount,
          currency: payment.currency,
          payment_method: payment.payment_method,
          vendor: payment.vendor ?? "",
          paid_at: payment.paid_at.slice(0, 16),
          invoice_number: payment.invoice_number,
          notes: payment.notes ?? ""
        }
      : {
          customer_name: currentUser.full_name,
          customer_email: currentUser.email,
          payment_id: `PAY-${Date.now()}`,
          transaction_id: `TXN-${Date.now()}`,
          order_id: `ORD-${Date.now()}`,
          amount: 0,
          credits: 0,
          tax_amount: 0,
          total_amount: 0,
          currency: "INR",
          payment_method: "UPI",
          paid_at: new Date().toISOString().slice(0, 16),
          vendor: "",
          invoice_number: generateInvoiceNumber(),
          notes: ""
        }
  });

  async function handleInvoiceUpload(file?: File) {
    if (!file) return;
    if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "Invalid invoice file", description: "Upload PDF, PNG, JPG, JPEG, or WEBP only.", variant: "destructive" });
      return;
    }
    setProcessingStep("Uploading Invoice...");
    const data_url = await fileToDataUrl(file);
    const nextInvoice: InvoiceFile = { name: file.name, type: file.type, size: file.size, data_url, uploaded_at: new Date().toISOString() };
    setInvoice(nextInvoice);
    setProcessingStep("Reading Invoice...");
    const extractedText = await extractTextFromInvoiceFile(file, setProcessingStep);
    setProcessingStep("Extracting Information...");
    const extractedPurchase = extractCreditPurchaseInvoice(file.name, extractedText.text, extractedText.method, extractedText.ocrConfidence);
    const values: Partial<PaymentFormValues> = {
      customer_name: extractedPurchase.values.customer_name || currentUser.full_name,
      customer_email: currentUser.email,
      payment_id: `PAY-${Date.now()}`,
      transaction_id: `TXN-${Date.now()}`,
      order_id: `ORD-${Date.now()}`,
      amount: Number(extractedPurchase.values.purchase_amount || extractedPurchase.values.amount_paid || 0),
      currency: extractedPurchase.values.currency || "INR",
      payment_method: extractedPurchase.values.payment_method || "Other",
      vendor: extractedPurchase.values.vendor || extractedPurchase.values.platform || "",
      paid_at: `${extractedPurchase.values.purchase_date || new Date().toISOString().slice(0, 10)}T${new Date().toTimeString().slice(0, 5)}`,
      invoice_number: extractedPurchase.values.invoice_number || generateInvoiceNumber(),
      notes: extractedPurchase.notes
    };
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== "") form.setValue(key as keyof PaymentFormValues, value as never, { shouldValidate: true });
    });
    setProcessingStep("Populating Form...");
    await wait(150);
    setConfidence(extractedPurchase.confidence);
    if (extractedPurchase.missingFields.length > 0) {
      toast({
        title: "Invoice extracted",
        description: `Missing: ${extractedPurchase.missingFields.join(", ")}`
      });
    }
    setProcessingStep("");
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleInvoiceUpload(event.dataTransfer.files?.[0]);
  }

  async function onSubmit(values: PaymentFormValues) {
    try {
      const customerEmail = values.customer_email || currentUser.email;
      const paymentId = values.payment_id || `PAY-${Date.now()}`;
      const transactionId = values.transaction_id || `TXN-${Date.now()}`;
      const orderId = values.order_id || `ORD-${Date.now()}`;
      await savePayment({
        ...values,
        user_id: payment?.user_id ?? currentUser.id,
        customer_email: customerEmail,
        payment_id: paymentId,
        transaction_id: transactionId,
        order_id: orderId,
        currency: values.currency || "INR",
        invoice_number: values.invoice_number || generateInvoiceNumber(),
        payment_detail: null,
        payment_status: "Paid",
        tax_amount: 0,
        total_amount: Number(values.amount || 0),
        invoice_file: invoice,
        invoice_file_url: invoice?.data_url ?? null,
        notes: values.notes || null
      }, payment?.id);
      const credits = await getUserCredits(customerEmail);
      toast({ title: "Payment Saved Successfully", description: `Credits Updated. Current Credits: ${formatNumber(credits)} Credits` });
      onDone();
    } catch (error) {
      toast({ title: "Payment save failed", description: getError(error), variant: "destructive" });
    }
  }

  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="sm:col-span-2">
        <Label>Upload Invoice</Label>
        <div className="mt-2 rounded-md border border-dashed p-5">
          <label
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md bg-muted/35 p-6 text-center text-sm text-muted-foreground transition",
              isDragging && "border border-[#E53935] bg-[#E53935]/10 text-foreground"
            )}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <FileUp className="h-8 w-8 text-[#E53935]" />
            <span className="font-semibold text-foreground">Drag & Drop</span>
            <span>or Choose File</span>
            <span className="text-xs">Supported Files: PDF, PNG, JPG, JPEG, WEBP</span>
            <input className="hidden" type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={(event) => handleInvoiceUpload(event.target.files?.[0])} />
          </label>
          {processingStep ? <p className="mt-3 text-sm font-medium text-[#E53935]">{processingStep}</p> : null}
          {confidence != null ? <p className="mt-3 text-xs text-muted-foreground">Extraction confidence: {confidence}%</p> : null}
          {invoice ? (
            <div className="mt-4 space-y-4">
              <InvoiceUpload invoice={invoice} onInvoice={setInvoice} />
              <InvoicePreview invoice={invoice} />
            </div>
          ) : null}
        </div>
      </div>
      <Field label="Platform Name" error={form.formState.errors.vendor?.message}><Input {...form.register("vendor")} /></Field>
      <Field label="Purchased By" error={form.formState.errors.customer_name?.message}><Input {...form.register("customer_name")} /></Field>
      <Field label="Purchase Date" error={form.formState.errors.paid_at?.message}><Input type="datetime-local" {...form.register("paid_at")} /></Field>
      <Field label="Payment Method">
        <Select value={form.watch("payment_method")} onValueChange={(value) => form.setValue("payment_method", value as PaymentMethod)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{PAYMENT_METHODS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Amount Paid" error={form.formState.errors.amount?.message}><Input type="number" min="0" step="0.01" {...form.register("amount")} /></Field>
      <Field label="Credits" error={form.formState.errors.credits?.message}><Input type="number" min="1" {...form.register("credits")} /></Field>
      <Field label="Notes" className="sm:col-span-2"><Textarea {...form.register("notes")} /></Field>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button disabled={form.formState.isSubmitting}>Save</Button>
      </div>
    </form>
  );
}

function UsersPage({ currentUser }: { currentUser: Profile }) {
  const [users, setUsers] = useState<Profile[]>([]);
  const { toast } = useToast();

  async function refresh() {
    try {
      setUsers(await getUsers());
    } catch (error) {
      toast({ title: "Users failed", description: getError(error), variant: "destructive" });
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function updateRole(user: Profile, role: "admin" | "user") {
    try {
      await updateUserRole(user.id, role);
      refresh();
    } catch (error) {
      toast({ title: "Role update failed", description: getError(error), variant: "destructive" });
    }
  }

  async function toggleDisabled(user: Profile) {
    try {
      await setUserDisabled(user.id, !user.disabled);
      refresh();
    } catch (error) {
      toast({ title: "User update failed", description: getError(error), variant: "destructive" });
    }
  }

  return (
    <>
      <PageHeader title="User Management" description="View, disable, and manage roles for registered users." />
      <DataTable
        headers={["Name", "Email", "Role", "Status", "Created", ""]}
        empty="No users found."
        rows={users.map((user) => [
          user.full_name,
          user.email,
          <Select key={`${user.id}-role`} value={user.role} onValueChange={(role) => updateRole(user, role as "admin" | "user")} disabled={user.id === currentUser.id}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="user">User</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
          </Select>,
          user.disabled ? "Disabled" : "Active",
          formatDate(user.created_at),
          <Button key={user.id} variant="outline" size="sm" disabled={user.id === currentUser.id} onClick={() => toggleDisabled(user)}>
            {user.disabled ? "Enable" : "Disable"}
          </Button>
        ])}
      />
    </>
  );
}

function NavButton({ view, active, setView, icon: Icon, label }: { view: View; active: View; setView: (view: View) => void; icon: typeof LayoutDashboard; label: string }) {
  return (
    <button className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground", active === view && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground")} onClick={() => setView(view)} type="button">
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function PageHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function DataTable({ headers, rows, empty }: { headers: string[]; rows: React.ReactNode[][]; empty: string }) {
  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/60">
            <tr>{headers.map((header) => <th className="px-4 py-3 text-left font-semibold" key={header}>{header}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row, index) => (
              <tr className="border-t transition-colors hover:bg-muted/40" key={index}>
                {row.map((cell, cellIndex) => <td className="px-4 py-3" key={cellIndex}>{cell}</td>)}
              </tr>
            )) : (
              <tr><td className="px-4 py-12 text-center text-muted-foreground" colSpan={headers.length}>{empty}</td></tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function AppLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  );
}

async function loadUsage(profile: Profile, setter: (records: AiUsage[]) => void) {
  try {
    setter(await getUsage(profile));
  } catch (error) {
    console.error(error);
  }
}

function getError(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}
