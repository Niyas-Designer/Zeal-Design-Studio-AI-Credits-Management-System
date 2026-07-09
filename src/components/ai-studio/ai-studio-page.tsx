import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, Info, Pencil, Plus, RotateCcw, Search, Sparkles, Star, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { AI_TOOL_CATEGORIES } from "@/lib/ai-tools";
import { deleteAiTool, getAiTools, resetAiTools, saveAiTool, subscribeToBusinessChanges } from "@/lib/data-store";
import type { AiTool, AiToolCategory, AiToolInput, AiToolPricingType, AiToolUpdateStatus, Profile } from "@/lib/types";
import { aiToolSchema, type AiToolFormValues } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { cn, formatDate } from "@/lib/utils";

type CategoryFilter = AiToolCategory | "All";
type PricingFilter = AiToolPricingType | "All";
type UpdateFilter = AiToolUpdateStatus | "All";
type SortFilter = "Latest" | "Trending" | "Most Popular" | "Alphabetical" | "Rating";

const PRICING_TYPES: AiToolPricingType[] = ["Free", "Freemium", "Paid"];
const UPDATE_STATUSES: AiToolUpdateStatus[] = ["Latest", "Recently Updated", "Stable", "Beta", "New Release"];

export function AiStudioPage({ profile }: { profile: Profile }) {
  const { toast } = useToast();
  const [tools, setTools] = useState<AiTool[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [pricing, setPricing] = useState<PricingFilter>("All");
  const [updateStatus, setUpdateStatus] = useState<UpdateFilter>("All");
  const [sort, setSort] = useState<SortFilter>("Most Popular");
  const [selectedTool, setSelectedTool] = useState<AiTool | null>(null);
  const [editingTool, setEditingTool] = useState<AiTool | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const admin = profile.role === "super_admin" || profile.role === "admin" || profile.role === "manager";

  async function refresh() {
    try {
      setTools(await getAiTools());
    } catch (error) {
      toast({ title: "AI Studio failed", description: getError(error), variant: "destructive" });
    }
  }

  useEffect(() => {
    refresh();
    return subscribeToBusinessChanges(refresh);
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tools
      .filter((tool) => {
        const searchable = `${tool.name} ${tool.description} ${tool.long_description} ${tool.category} ${tool.features.join(" ")} ${tool.use_cases.join(" ")}`.toLowerCase();
        return (
          (admin || tool.active) &&
          (!term || searchable.includes(term)) &&
          (category === "All" || tool.category === category) &&
          (pricing === "All" || tool.pricing_type === pricing) &&
          (updateStatus === "All" || tool.update_status === updateStatus)
        );
      })
      .sort((a, b) => {
        if (sort === "Rating") return b.rating - a.rating;
        if (sort === "Most Popular") return b.popularity - a.popularity;
        if (sort === "Latest") return b.updated_at.localeCompare(a.updated_at);
        if (sort === "Trending") return Number(b.trending) - Number(a.trending) || b.popularity - a.popularity;
        return a.name.localeCompare(b.name);
      });
  }, [admin, category, pricing, search, sort, tools, updateStatus]);

  if (selectedTool) {
    return (
      <AiToolDetails
        admin={admin}
        tool={selectedTool}
        tools={tools}
        onBack={() => setSelectedTool(null)}
        onEdit={(tool) => {
          setEditingTool(tool);
          setFormOpen(true);
        }}
      />
    );
  }

  const featured = filtered.filter((tool) => tool.featured).slice(0, 6);
  const trending = filtered.filter((tool) => tool.trending).slice(0, 6);
  const newReleases = filtered.filter((tool) => tool.new_release || tool.update_status === "New Release").slice(0, 6);
  const recommended = filtered.filter((tool) => tool.recommended).slice(0, 6);
  const updated = [...filtered].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 6);

  return (
    <>
      <div className="mb-6 overflow-hidden rounded-md border bg-[radial-gradient(circle_at_top_left,rgba(229,57,53,.16),transparent_34%),linear-gradient(135deg,#0D0D0D,#171717)] p-5 text-white shadow-xl sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-[#E53935]" />
              AI Studio Marketplace
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Discover AI platforms for creators, teams, and businesses.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              Search popular AI tools, compare categories, open official pricing pages, and manage your internal AI platform catalog from one dashboard.
            </p>
          </div>
          {admin ? (
            <div className="flex flex-wrap gap-2">
              <Button
                className="bg-[#E53935] text-white hover:bg-[#c62828]"
                onClick={() => {
                  setEditingTool(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add AI Tool
              </Button>
              <Button
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                variant="outline"
                onClick={async () => {
                  setTools(await resetAiTools());
                  toast({ title: "AI Studio reset", description: "Default marketplace tools restored." });
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <Card className="mb-6 overflow-hidden border-border/80 shadow-sm">
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[1.4fr_.8fr_.7fr_.8fr_.8fr]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search tools, features, use cases..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <Select value={category} onValueChange={(value) => setCategory(value as CategoryFilter)}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Categories</SelectItem>
              {AI_TOOL_CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={pricing} onValueChange={(value) => setPricing(value as PricingFilter)}>
            <SelectTrigger><SelectValue placeholder="Pricing" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Pricing</SelectItem>
              {PRICING_TYPES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={updateStatus} onValueChange={(value) => setUpdateStatus(value as UpdateFilter)}>
            <SelectTrigger><SelectValue placeholder="Updates" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Updates</SelectItem>
              {UPDATE_STATUSES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(value) => setSort(value as SortFilter)}>
            <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              {(["Most Popular", "Trending", "Latest", "Alphabetical", "Rating"] as SortFilter[]).map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StudioMetric label="Active Tools" value={filtered.filter((tool) => tool.active).length} />
        <StudioMetric label="Categories" value={new Set(filtered.map((tool) => tool.category)).size} />
        <StudioMetric label="Trending" value={filtered.filter((tool) => tool.trending).length} />
        <StudioMetric label="Avg Rating" value={filtered.length ? (filtered.reduce((sum, tool) => sum + tool.rating, 0) / filtered.length).toFixed(1) : "0.0"} />
      </section>

      <ToolSection title="Featured AI Tools" tools={featured} onSelect={setSelectedTool} />
      <ToolSection title="Trending This Week" tools={trending} onSelect={setSelectedTool} />
      <ToolSection title="Recently Updated AI Tools" tools={updated} onSelect={setSelectedTool} />
      <ToolSection title="New Releases" tools={newReleases} onSelect={setSelectedTool} />
      <ToolSection title="Recommended Tools" tools={recommended} onSelect={setSelectedTool} />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>All AI Platforms</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((tool) => (
            <AiToolCard key={tool.id} tool={tool} onSelect={() => setSelectedTool(tool)} />
          ))}
          {!filtered.length ? (
            <div className="col-span-full rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">No AI tools match your filters.</div>
          ) : null}
        </CardContent>
      </Card>

      {admin ? (
        <AdminToolsTable
          tools={tools}
          onEdit={(tool) => {
            setEditingTool(tool);
            setFormOpen(true);
          }}
          onRemove={async (tool) => {
            if (!confirm(`Delete ${tool.name} from AI Studio?`)) return;
            await deleteAiTool(tool.id);
            toast({ title: "AI tool deleted", description: `${tool.name} removed from the catalog.` });
            refresh();
          }}
        />
      ) : null}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingTool ? "Edit AI Tool" : "Add AI Tool"}</DialogTitle>
          </DialogHeader>
          <AiToolForm
            tool={editingTool}
            onDone={() => {
              setFormOpen(false);
              refresh();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ToolSection({ title, tools, onSelect }: { title: string; tools: AiTool[]; onSelect: (tool: AiTool) => void }) {
  if (!tools.length) return null;
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        <span className="text-xs font-medium text-muted-foreground">{tools.length} tools</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => <AiToolCard key={tool.id} tool={tool} onSelect={() => onSelect(tool)} />)}
      </div>
    </section>
  );
}

function AiToolCard({ tool, onSelect }: { tool: AiTool; onSelect: () => void }) {
  return (
    <Card className="group overflow-hidden border-border/80 bg-card/95 transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/10">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <ToolLogo tool={tool} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <button className="text-left text-base font-bold transition hover:text-[#E53935]" onClick={onSelect} type="button">{tool.name}</button>
                <p className="mt-1 text-xs text-muted-foreground">{tool.category}</p>
              </div>
              <Rating rating={tool.rating} />
            </div>
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{tool.description}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone={tool.pricing_type === "Free" ? "green" : tool.pricing_type === "Paid" ? "red" : "dark"}>{tool.pricing_type}</Badge>
          <Badge>{tool.monthly_pricing}</Badge>
          <Badge>{tool.update_status}</Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {tool.features.slice(0, 3).map((feature) => <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground" key={feature}>{feature}</span>)}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button asChild size="sm" variant="outline">
            <a href={tool.website_url} rel="noreferrer" target="_blank">Website</a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={tool.docs_url} rel="noreferrer" target="_blank">Docs</a>
          </Button>
          <Button asChild className="bg-[#E53935] hover:bg-[#c62828]" size="sm">
            <a href={tool.pricing_url} rel="noreferrer" target="_blank">Pricing</a>
          </Button>
          <Button size="sm" variant="outline" onClick={onSelect}>Learn</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AiToolDetails({
  admin,
  tool,
  tools,
  onBack,
  onEdit
}: {
  admin: boolean;
  tool: AiTool;
  tools: AiTool[];
  onBack: () => void;
  onEdit: (tool: AiTool) => void;
}) {
  const alternatives = tool.alternatives
    .map((name) => tools.find((item) => item.name.toLowerCase() === name.toLowerCase()))
    .filter(Boolean) as AiTool[];

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" onClick={onBack}>Back to AI Studio</Button>
        {admin ? <Button onClick={() => onEdit(tool)}><Pencil className="h-4 w-4" />Edit Tool</Button> : null}
      </div>
      <section className="overflow-hidden rounded-md border bg-[linear-gradient(135deg,#0D0D0D,#1E1E1E)] p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <ToolLogo tool={tool} large />
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge>{tool.category}</Badge>
                <Badge tone="red">{tool.update_status}</Badge>
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{tool.name}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/72">{tool.long_description || tool.description}</p>
            </div>
          </div>
          <div className="rounded-md border border-white/10 bg-white/10 p-4 backdrop-blur">
            <Rating rating={tool.rating} />
            <p className="mt-2 text-xs text-white/65">Popularity score: {tool.popularity}/100</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="bg-[#E53935] text-white hover:bg-[#c62828]">
            <a href={tool.pricing_url} rel="noreferrer" target="_blank"><ExternalLink className="h-4 w-4" />Buy / Subscribe</a>
          </Button>
          <Button asChild className="border-white/20 bg-white/10 text-white hover:bg-white/20" variant="outline">
            <a href={tool.website_url} rel="noreferrer" target="_blank">Official Website</a>
          </Button>
          <Button asChild className="border-white/20 bg-white/10 text-white hover:bg-white/20" variant="outline">
            <a href={tool.docs_url} rel="noreferrer" target="_blank">Official Documentation</a>
          </Button>
          {tool.api_url ? (
            <Button asChild className="border-white/20 bg-white/10 text-white hover:bg-white/20" variant="outline">
              <a href={tool.api_url} rel="noreferrer" target="_blank">API Docs</a>
            </Button>
          ) : null}
          {tool.download_url ? (
            <Button asChild className="border-white/20 bg-white/10 text-white hover:bg-white/20" variant="outline">
              <a href={tool.download_url} rel="noreferrer" target="_blank">Download</a>
            </Button>
          ) : null}
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        <DetailPanel title="Features" items={tool.features} />
        <DetailPanel title="Pricing Plans" items={tool.pricing_plans} />
        <DetailPanel title="Use Cases" items={tool.use_cases} />
        <DetailPanel title="Pros" items={tool.pros} />
        <DetailPanel title="Cons" items={tool.cons} />
        <Card>
          <CardHeader><CardTitle>Latest Updates</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">{tool.latest_update}</p>
            <p className="mt-3 text-xs text-muted-foreground">Updated {formatDate(tool.updated_at)}</p>
          </CardContent>
        </Card>
      </section>

      {alternatives.length ? (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-bold">Alternatives</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {alternatives.map((item) => <AiToolCard key={item.id} tool={item} onSelect={() => undefined} />)}
          </div>
        </section>
      ) : null}
    </>
  );
}

function AiToolForm({ tool, onDone }: { tool: AiTool | null; onDone: () => void }) {
  const { toast } = useToast();
  const form = useForm<AiToolFormValues>({
    resolver: zodResolver(aiToolSchema),
    defaultValues: tool ? toFormValues(tool) : emptyToolValues()
  });

  async function onSubmit(values: AiToolFormValues) {
    try {
      const input: AiToolInput = {
        ...values,
        rating: Number(values.rating),
        popularity: Number(values.popularity),
        features: splitList(values.features),
        pricing_plans: splitList(values.pricing_plans),
        pros: splitList(values.pros),
        cons: splitList(values.cons),
        use_cases: splitList(values.use_cases),
        alternatives: splitList(values.alternatives ?? ""),
        api_url: values.api_url ?? "",
        download_url: values.download_url ?? ""
      };
      await saveAiTool(input, tool?.id);
      toast({ title: tool ? "AI tool updated" : "AI tool added", description: `${values.name} saved successfully.` });
      onDone();
    } catch (error) {
      toast({ title: "AI tool save failed", description: getError(error), variant: "destructive" });
    }
  }

  function uploadLogo(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") form.setValue("logo_url", reader.result, { shouldValidate: true });
    };
    reader.readAsDataURL(file);
  }

  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <StudioField label="Tool Name" error={form.formState.errors.name?.message}><Input {...form.register("name")} /></StudioField>
      <StudioField label="Category" error={form.formState.errors.category?.message}>
        <Select value={form.watch("category")} onValueChange={(value) => form.setValue("category", value as AiToolCategory, { shouldValidate: true })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{AI_TOOL_CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
        </Select>
      </StudioField>
      <StudioField label="Description" error={form.formState.errors.description?.message} className="sm:col-span-2"><Textarea rows={3} {...form.register("description")} /></StudioField>
      <StudioField label="Long Description" error={form.formState.errors.long_description?.message} className="sm:col-span-2"><Textarea rows={4} {...form.register("long_description")} /></StudioField>
      <StudioField label="Official Logo URL / Uploaded Logo" error={form.formState.errors.logo_url?.message}><Input {...form.register("logo_url")} /></StudioField>
      <StudioField label="Upload Logo"><Input accept="image/*,.svg" type="file" onChange={(event) => uploadLogo(event.target.files?.[0])} /></StudioField>
      <StudioField label="Pricing Type">
        <Select value={form.watch("pricing_type")} onValueChange={(value) => form.setValue("pricing_type", value as AiToolPricingType, { shouldValidate: true })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{PRICING_TYPES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
        </Select>
      </StudioField>
      <StudioField label="Monthly Pricing" error={form.formState.errors.monthly_pricing?.message}><Input {...form.register("monthly_pricing")} /></StudioField>
      <StudioField label="Update Status">
        <Select value={form.watch("update_status")} onValueChange={(value) => form.setValue("update_status", value as AiToolUpdateStatus, { shouldValidate: true })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{UPDATE_STATUSES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
        </Select>
      </StudioField>
      <StudioField label="Latest Update" error={form.formState.errors.latest_update?.message}><Input {...form.register("latest_update")} /></StudioField>
      <StudioField label="Rating" error={form.formState.errors.rating?.message}><Input max="5" min="0" step="0.1" type="number" {...form.register("rating")} /></StudioField>
      <StudioField label="Popularity" error={form.formState.errors.popularity?.message}><Input max="100" min="0" type="number" {...form.register("popularity")} /></StudioField>
      <StudioField label="Official Website" error={form.formState.errors.website_url?.message}><Input {...form.register("website_url")} /></StudioField>
      <StudioField label="Pricing / Subscribe URL" error={form.formState.errors.pricing_url?.message}><Input {...form.register("pricing_url")} /></StudioField>
      <StudioField label="Official Documentation" error={form.formState.errors.docs_url?.message} className="sm:col-span-2"><Input {...form.register("docs_url")} /></StudioField>
      <StudioField label="API Documentation"><Input {...form.register("api_url")} /></StudioField>
      <StudioField label="Download Page"><Input {...form.register("download_url")} /></StudioField>
      <StudioField label="Key Features (comma separated)" error={form.formState.errors.features?.message} className="sm:col-span-2"><Textarea {...form.register("features")} /></StudioField>
      <StudioField label="Pricing Plans (comma separated)" error={form.formState.errors.pricing_plans?.message} className="sm:col-span-2"><Textarea {...form.register("pricing_plans")} /></StudioField>
      <StudioField label="Pros (comma separated)" error={form.formState.errors.pros?.message}><Textarea {...form.register("pros")} /></StudioField>
      <StudioField label="Cons (comma separated)" error={form.formState.errors.cons?.message}><Textarea {...form.register("cons")} /></StudioField>
      <StudioField label="Use Cases (comma separated)" error={form.formState.errors.use_cases?.message}><Textarea {...form.register("use_cases")} /></StudioField>
      <StudioField label="Alternatives (comma separated)"><Textarea {...form.register("alternatives")} /></StudioField>
      <div className="grid gap-3 rounded-md bg-muted p-4 sm:col-span-2 sm:grid-cols-4">
        {(["featured", "trending", "recommended", "new_release", "active"] as const).map((field) => (
          <label className="flex items-center gap-2 text-sm font-medium capitalize" key={field}>
            <input className="h-4 w-4 accent-[#E53935]" type="checkbox" {...form.register(field)} />
            {field.replace("_", " ")}
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button className="bg-[#E53935] hover:bg-[#c62828]" disabled={form.formState.isSubmitting}>Save Tool</Button>
      </div>
    </form>
  );
}

function AdminToolsTable({ tools, onEdit, onRemove }: { tools: AiTool[]; onEdit: (tool: AiTool) => void; onRemove: (tool: AiTool) => void }) {
  return (
    <Card className="mt-6">
      <CardHeader><CardTitle>Admin AI Studio Manager</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/60">
            <tr>
              {["Tool", "Category", "Pricing", "Rating", "Flags", "Updated", ""].map((header) => <th className="px-4 py-3 text-left font-semibold" key={header}>{header}</th>)}
            </tr>
          </thead>
          <tbody>
            {tools.map((tool) => (
              <tr className="border-t hover:bg-muted/40" key={tool.id}>
                <td className="px-4 py-3"><div className="flex items-center gap-3"><ToolLogo tool={tool} /> <span className="font-semibold">{tool.name}</span></div></td>
                <td className="px-4 py-3">{tool.category}</td>
                <td className="px-4 py-3">{tool.pricing_type} · {tool.monthly_pricing}</td>
                <td className="px-4 py-3">{tool.rating.toFixed(1)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {tool.featured ? <Badge>Featured</Badge> : null}
                    {tool.trending ? <Badge tone="red">Trending</Badge> : null}
                    {tool.recommended ? <Badge tone="green">Recommended</Badge> : null}
                    {!tool.active ? <Badge tone="dark">Hidden</Badge> : null}
                  </div>
                </td>
                <td className="px-4 py-3">{formatDate(tool.updated_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => onEdit(tool)}><Pencil className="h-3.5 w-3.5" />Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => onRemove(tool)}><Trash2 className="h-3.5 w-3.5" />Delete</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function DetailPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {items.map((item) => (
            <li className="flex gap-2" key={item}>
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#E53935]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function StudioMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="transition hover:-translate-y-0.5 hover:shadow-lg">
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function ToolLogo({ tool, large }: { tool: AiTool; large?: boolean }) {
  const initials = tool.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("");
  return (
    <div className={cn("grid shrink-0 place-items-center overflow-hidden rounded-md border bg-white shadow-sm", large ? "h-16 w-16" : "h-12 w-12")}>
      <img
        alt={`${tool.name} official logo`}
        className="h-3/4 w-3/4 object-contain"
        loading="lazy"
        onError={(event) => {
          event.currentTarget.style.display = "none";
          const fallback = event.currentTarget.nextElementSibling;
          if (fallback instanceof HTMLElement) fallback.style.display = "block";
        }}
        src={tool.logo_url}
      />
      <span className="hidden text-sm font-bold text-[#111111]">{initials}</span>
    </div>
  );
}

function Rating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-[#E53935]/10 px-2 py-1 text-xs font-bold text-[#E53935]">
      <Star className="h-3.5 w-3.5 fill-[#E53935]" />
      {rating.toFixed(1)}
    </div>
  );
}

function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "red" | "green" | "dark" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        tone === "default" && "border-border bg-muted text-muted-foreground",
        tone === "red" && "border-[#E53935]/20 bg-[#E53935]/10 text-[#E53935]",
        tone === "green" && "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
        tone === "dark" && "border-[#111111]/20 bg-[#111111] text-white"
      )}
    >
      {children}
    </span>
  );
}

function StudioField({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function emptyToolValues(): AiToolFormValues {
  return {
    name: "",
    category: "AI Chat",
    description: "",
    long_description: "",
    logo_url: "",
    pricing_type: "Freemium",
    monthly_pricing: "See official pricing",
    update_status: "Recently Updated",
    rating: 4.5,
    popularity: 80,
    featured: false,
    trending: false,
    recommended: false,
    new_release: false,
    latest_update: "Active product updates.",
    features: "",
    pricing_plans: "",
    pros: "",
    cons: "",
    use_cases: "",
    alternatives: "",
    website_url: "",
    pricing_url: "",
    docs_url: "",
    api_url: "",
    download_url: "",
    active: true
  };
}

function toFormValues(tool: AiTool): AiToolFormValues {
  return {
    ...tool,
    features: tool.features.join(", "),
    pricing_plans: tool.pricing_plans.join(", "),
    pros: tool.pros.join(", "),
    cons: tool.cons.join(", "),
    use_cases: tool.use_cases.join(", "),
    alternatives: tool.alternatives.join(", ")
  };
}

function getError(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}
