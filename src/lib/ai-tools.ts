import type { AiTool, AiToolCategory } from "@/lib/types";

export const AI_TOOL_CATEGORIES = [
  "AI Chat",
  "AI Coding",
  "AI Image Generation",
  "AI Video Generation",
  "AI Voice",
  "AI Music",
  "AI Writing",
  "AI Presentations",
  "AI Productivity",
  "AI Automation",
  "AI Design",
  "AI Development",
  "Documentation",
  "Database",
  "API Platforms"
] as const satisfies readonly AiToolCategory[];

export const AI_TOOL_LOGOS: Record<string, string> = {
  chatgpt: "/ai-logos/chatgpt.png",
  claude: "/ai-logos/claude.png",
  gemini: "/ai-logos/gemini.png",
  midjourney: "/ai-logos/midjourney.png"
};

function favicon(domain: string) {
  void domain;
  return "/favicon.png";
}

function tool(
  id: string,
  name: string,
  category: AiToolCategory,
  description: string,
  domain: string,
  pricingUrl: string,
  docsUrl: string,
  options: Partial<AiTool> = {}
): AiTool {
  const timestamp = "2026-07-08T00:00:00.000Z";
  return {
    id,
    name,
    category,
    description,
    long_description:
      options.long_description ??
      `${description} Use this listing to compare official pricing, documentation, core capabilities, and practical alternatives before adding the platform to a production workflow.`,
    logo_url: options.logo_url ?? favicon(domain),
    pricing_type: options.pricing_type ?? "Freemium",
    monthly_pricing: options.monthly_pricing ?? "Visit Official Website",
    update_status: options.update_status ?? "Recently Updated",
    rating: options.rating ?? 4.7,
    popularity: options.popularity ?? 88,
    featured: options.featured ?? false,
    trending: options.trending ?? false,
    recommended: options.recommended ?? false,
    new_release: options.new_release ?? false,
    latest_update: options.latest_update ?? "Active product updates and new AI capabilities.",
    features: options.features ?? ["AI-assisted creation", "Team workflows", "Export and collaboration"],
    pricing_plans: options.pricing_plans ?? ["Free or trial access where available", "Paid monthly plans", "Enterprise options"],
    pros: options.pros ?? ["Modern interface", "Fast workflows", "Strong ecosystem"],
    cons: options.cons ?? ["Pricing and limits can change", "Advanced features may require paid plans"],
    use_cases: options.use_cases ?? ["Creative production", "Marketing workflows", "Business productivity"],
    alternatives: options.alternatives ?? [],
    website_url: `https://${domain}`,
    pricing_url: pricingUrl,
    docs_url: docsUrl,
    api_url: options.api_url ?? "",
    download_url: options.download_url ?? "",
    active: options.active ?? true,
    created_at: timestamp,
    updated_at: timestamp
  };
}

export const DEFAULT_AI_TOOLS: AiTool[] = [
  tool("chatgpt", "ChatGPT", "AI Chat", "OpenAI's conversational AI assistant for writing, analysis, coding, research, and multimodal workflows.", "chatgpt.com", "https://openai.com/chatgpt/pricing/", "https://help.openai.com/", {
    logo_url: AI_TOOL_LOGOS.chatgpt,
    featured: true,
    trending: true,
    recommended: true,
    rating: 4.9,
    popularity: 99,
    features: ["Text, image, voice, and file workflows", "Custom GPTs", "Team and enterprise plans"],
    alternatives: ["Claude", "Google Gemini", "Perplexity AI"]
  }),
  tool("claude", "Claude", "AI Chat", "Anthropic's AI assistant for thoughtful writing, long-context analysis, coding, and business collaboration.", "claude.ai", "https://claude.ai/pricing", "https://docs.anthropic.com/", {
    logo_url: AI_TOOL_LOGOS.claude,
    featured: true,
    recommended: true,
    rating: 4.8,
    popularity: 96,
    features: ["Long-context reasoning", "Artifacts workspace", "API and team plans"],
    alternatives: ["ChatGPT", "Google Gemini", "Perplexity AI"]
  }),
  tool("gemini", "Google Gemini", "AI Chat", "Google's multimodal AI assistant connected to Google services, search, and productivity workflows.", "gemini.google.com", "https://gemini.google/subscriptions/", "https://ai.google.dev/gemini-api/docs", {
    logo_url: AI_TOOL_LOGOS.gemini,
    featured: true,
    trending: true,
    rating: 4.7,
    popularity: 95,
    features: ["Multimodal chat", "Google Workspace integrations", "Developer API"],
    alternatives: ["ChatGPT", "Claude", "Perplexity AI"]
  }),
  tool("perplexity", "Perplexity AI", "AI Chat", "Answer engine for source-backed research, web search, market scans, and decision support.", "perplexity.ai", "https://www.perplexity.ai/pro", "https://docs.perplexity.ai/", {
    trending: true,
    rating: 4.8,
    popularity: 94,
    features: ["Cited web answers", "Deep research", "Collections and spaces"],
    alternatives: ["ChatGPT", "Google Gemini", "Claude"]
  }),
  tool("cursor", "Cursor", "AI Coding", "AI-first code editor for agentic development, repo-aware chat, and fast code changes.", "cursor.com", "https://cursor.com/pricing", "https://docs.cursor.com/", {
    featured: true,
    trending: true,
    recommended: true,
    rating: 4.9,
    popularity: 97,
    features: ["Repo-aware agent", "Autocomplete", "Codebase chat"],
    alternatives: ["GitHub Copilot", "Replit AI", "Bolt.new"]
  }),
  tool("github-copilot", "GitHub Copilot", "AI Coding", "AI pair programmer built into GitHub and popular IDEs for code completion, chat, and reviews.", "github.com", "https://github.com/features/copilot/plans", "https://docs.github.com/copilot", {
    recommended: true,
    rating: 4.7,
    popularity: 95,
    features: ["IDE completions", "Pull request assistance", "GitHub-native workflows"],
    alternatives: ["Cursor", "Replit AI", "Claude"]
  }),
  tool("bolt", "Bolt.new", "AI Coding", "Browser-based AI app builder for creating, editing, and deploying full-stack web apps.", "bolt.new", "https://bolt.new/pricing", "https://support.bolt.new/", {
    trending: true,
    new_release: true,
    update_status: "New Release",
    rating: 4.6,
    popularity: 91,
    alternatives: ["Lovable", "Replit AI", "Vercel"]
  }),
  tool("lovable", "Lovable", "AI Coding", "AI product builder for turning prompts into full-stack apps with design-focused iteration.", "lovable.dev", "https://lovable.dev/pricing", "https://docs.lovable.dev/", {
    trending: true,
    new_release: true,
    update_status: "New Release",
    rating: 4.6,
    popularity: 90,
    alternatives: ["Bolt.new", "Replit AI", "Vercel"]
  }),
  tool("replit-ai", "Replit AI", "AI Coding", "Cloud development workspace with AI coding help, agents, hosting, and collaboration.", "replit.com", "https://replit.com/pricing", "https://docs.replit.com/", {
    rating: 4.5,
    popularity: 88,
    alternatives: ["Cursor", "GitHub Copilot", "Bolt.new"]
  }),
  tool("vercel", "Vercel", "AI Development", "Frontend cloud platform with AI-assisted development, deployment, previews, and analytics.", "vercel.com", "https://vercel.com/pricing", "https://vercel.com/docs", {
    recommended: true,
    rating: 4.8,
    popularity: 94,
    alternatives: ["Netlify", "Cloudflare Pages", "GitHub Pages"]
  }),
  tool("midjourney", "Midjourney", "AI Image Generation", "Popular image generation platform known for expressive editorial, art, and campaign-quality visuals.", "midjourney.com", "https://docs.midjourney.com/hc/en-us/articles/27870484040333-Plans", "https://docs.midjourney.com/", {
    logo_url: AI_TOOL_LOGOS.midjourney,
    featured: true,
    trending: true,
    rating: 4.8,
    popularity: 96,
    features: ["High-quality image generation", "Style exploration", "Creative upscaling"],
    alternatives: ["Flux", "Ideogram", "Leonardo AI"]
  }),
  tool("flux", "Flux", "AI Image Generation", "Black Forest Labs image models for high-quality creative generation and commercial visual workflows.", "blackforestlabs.ai", "https://blackforestlabs.ai/pricing", "https://docs.bfl.ai/", {
    trending: true,
    new_release: true,
    rating: 4.7,
    popularity: 91,
    alternatives: ["Midjourney", "Ideogram", "Leonardo AI"]
  }),
  tool("ideogram", "Ideogram", "AI Image Generation", "AI image platform with strong typography, prompt control, and brand-friendly creative generation.", "ideogram.ai", "https://ideogram.ai/pricing", "https://docs.ideogram.ai/", {
    trending: true,
    rating: 4.7,
    popularity: 90,
    alternatives: ["Midjourney", "Flux", "Magnific"]
  }),
  tool("leonardo", "Leonardo AI", "AI Image Generation", "Creative AI suite for concept art, product visuals, image editing, and production-ready assets.", "leonardo.ai", "https://leonardo.ai/pricing/", "https://docs.leonardo.ai/", {
    rating: 4.6,
    popularity: 89,
    alternatives: ["Midjourney", "Magnific", "Ideogram"]
  }),
  tool("magnific", "Magnific", "AI Image Generation", "AI image upscaling and enhancement platform for detailed, high-resolution creative visuals.", "magnific.ai", "https://magnific.ai/pricing", "https://magnific.ai/", {
    recommended: true,
    rating: 4.6,
    popularity: 90,
    alternatives: ["Canva AI", "Adobe Firefly", "Leonardo AI"]
  }),
  tool("runway", "Runway", "AI Video Generation", "Generative video platform for filmmakers, marketers, motion designers, and creative studios.", "runwayml.com", "https://runwayml.com/pricing", "https://help.runwayml.com/", {
    featured: true,
    trending: true,
    rating: 4.8,
    popularity: 94,
    features: ["Text-to-video", "Video editing tools", "Creative generation models"],
    alternatives: ["Kling AI", "Pika", "HeyGen"]
  }),
  tool("kling", "Kling AI", "AI Video Generation", "AI video generation platform for cinematic clips, motion campaigns, and image-to-video workflows.", "klingai.com", "https://klingai.com/global/membership", "https://klingai.com/global/help", {
    trending: true,
    new_release: true,
    rating: 4.6,
    popularity: 89,
    alternatives: ["Runway", "Pika", "HeyGen"]
  }),
  tool("pika", "Pika", "AI Video Generation", "AI video creation tool for social clips, motion effects, and fast creative experimentation.", "pika.art", "https://pika.art/pricing", "https://pika.art/", {
    trending: true,
    rating: 4.5,
    popularity: 88,
    alternatives: ["Runway", "Kling AI", "HeyGen"]
  }),
  tool("elevenlabs", "ElevenLabs", "AI Voice", "AI voice platform for speech generation, dubbing, voice cloning, and multilingual audio production.", "elevenlabs.io", "https://elevenlabs.io/pricing", "https://elevenlabs.io/docs", {
    featured: true,
    recommended: true,
    rating: 4.8,
    popularity: 94,
    alternatives: ["HeyGen", "Suno", "Udio"]
  }),
  tool("heygen", "HeyGen", "AI Video Generation", "AI avatar and video platform for training, marketing, explainers, and localized video content.", "heygen.com", "https://www.heygen.com/pricing", "https://docs.heygen.com/", {
    recommended: true,
    rating: 4.6,
    popularity: 89,
    alternatives: ["Runway", "ElevenLabs", "Pika"]
  }),
  tool("suno", "Suno", "AI Music", "AI music generation platform for songs, hooks, demos, and creative audio exploration.", "suno.com", "https://suno.com/pricing", "https://help.suno.com/", {
    trending: true,
    rating: 4.7,
    popularity: 92,
    alternatives: ["Udio", "ElevenLabs", "Canva AI"]
  }),
  tool("udio", "Udio", "AI Music", "AI song generation platform for music ideation, vocals, arrangements, and creative experiments.", "udio.com", "https://www.udio.com/pricing", "https://support.udio.com/", {
    new_release: true,
    rating: 4.5,
    popularity: 86,
    alternatives: ["Suno", "ElevenLabs", "Canva AI"]
  }),
  tool("canva-ai", "Canva AI", "AI Design", "Canva's AI-powered design, copy, image, video, and presentation creation tools for teams.", "canva.com", "https://www.canva.com/pricing/", "https://www.canva.com/help/", {
    featured: true,
    recommended: true,
    rating: 4.8,
    popularity: 96,
    alternatives: ["Figma AI", "Magnific", "Gamma"]
  }),
  tool("figma-ai", "Figma AI", "AI Design", "AI-assisted product design workflows inside Figma for ideation, editing, search, and design systems.", "figma.com", "https://www.figma.com/pricing/", "https://help.figma.com/", {
    featured: true,
    rating: 4.7,
    popularity: 94,
    alternatives: ["Canva AI", "Magnific", "Notion AI"]
  }),
  tool("notion-ai", "Notion AI", "AI Productivity", "AI writing, summarization, knowledge-base Q&A, and workflow assistance built into Notion.", "notion.so", "https://www.notion.com/pricing", "https://www.notion.com/help", {
    recommended: true,
    rating: 4.7,
    popularity: 93,
    alternatives: ["ChatGPT", "Gamma", "Airtable AI"]
  }),
  tool("gamma", "Gamma", "AI Presentations", "AI presentation and document builder for decks, proposals, landing pages, and visual storytelling.", "gamma.app", "https://gamma.app/pricing", "https://help.gamma.app/", {
    featured: true,
    trending: true,
    rating: 4.7,
    popularity: 91,
    alternatives: ["Canva AI", "Notion AI", "Figma AI"]
  }),
  tool("zapier-ai", "Zapier AI", "AI Automation", "Automation platform with AI agents, workflows, app integrations, and no-code business process automation.", "zapier.com", "https://zapier.com/pricing", "https://help.zapier.com/", {
    recommended: true,
    rating: 4.7,
    popularity: 93,
    alternatives: ["n8n", "Make", "Airtable AI"]
  }),
  tool("n8n", "n8n", "AI Automation", "Workflow automation platform for technical teams, self-hosting, AI agents, and API-heavy processes.", "n8n.io", "https://n8n.io/pricing/", "https://docs.n8n.io/", {
    trending: true,
    rating: 4.7,
    popularity: 90,
    alternatives: ["Zapier AI", "Make", "Airtable AI"]
  }),
  tool("make", "Make", "AI Automation", "Visual automation platform for connecting apps, workflows, data, and operational processes.", "make.com", "https://www.make.com/en/pricing", "https://www.make.com/en/help", {
    rating: 4.6,
    popularity: 89,
    alternatives: ["Zapier AI", "n8n", "Airtable AI"]
  }),
  tool("airtable-ai", "Airtable AI", "AI Development", "AI-enhanced app platform for databases, operations, workflows, and team business systems.", "airtable.com", "https://www.airtable.com/pricing", "https://support.airtable.com/", {
    recommended: true,
    rating: 4.6,
    popularity: 88,
    alternatives: ["Notion AI", "Zapier AI", "Make"]
  }),
  tool("adobe-firefly", "Adobe Firefly", "AI Image Generation", "Adobe's generative AI family for commercially oriented image, vector, design, and creative production workflows.", "firefly.adobe.com", "https://www.adobe.com/products/firefly.html#pricing", "https://helpx.adobe.com/firefly.html", {
    pricing_type: "Freemium",
    rating: 4.7,
    popularity: 92,
    alternatives: ["Midjourney", "Magnific", "Leonardo AI"]
  }),
  tool("luma-ai", "Luma AI", "AI Video Generation", "AI video and 3D generation platform for cinematic clips, camera motion, and creative storytelling.", "lumalabs.ai", "https://lumalabs.ai/pricing", "https://lumalabs.ai/learning-center", {
    trending: true,
    rating: 4.6,
    popularity: 89,
    alternatives: ["Runway", "Kling AI", "Pika"]
  }),
  tool("veo", "Veo", "AI Video Generation", "Google DeepMind's advanced video generation model family for high-quality AI-generated motion content.", "deepmind.google", "https://deepmind.google/technologies/veo/", "https://ai.google.dev/gemini-api/docs/video", {
    pricing_type: "Paid",
    monthly_pricing: "Available through Google AI products",
    update_status: "Latest",
    new_release: true,
    rating: 4.7,
    popularity: 90,
    alternatives: ["Runway", "Kling AI", "Luma AI"]
  }),
  tool("playht", "PlayHT", "AI Voice", "AI voice generation platform for text-to-speech, voice cloning, and production-ready audio workflows.", "play.ht", "https://docs.play.ht/reference", "https://docs.play.ht/", {
    monthly_pricing: "Visit Official Website",
    rating: 4.5,
    popularity: 85,
    alternatives: ["ElevenLabs", "Murf", "HeyGen"]
  }),
  tool("murf", "Murf", "AI Voice", "AI voiceover studio for narration, ads, training content, and brand-safe text-to-speech production.", "murf.ai", "https://murf.ai/pricing", "https://help.murf.ai/", {
    rating: 4.5,
    popularity: 84,
    alternatives: ["ElevenLabs", "PlayHT", "HeyGen"]
  }),
  tool("jasper", "Jasper", "AI Writing", "AI marketing and writing platform for campaign copy, brand voice, blogs, ads, and enterprise content teams.", "jasper.ai", "https://www.jasper.ai/pricing", "https://help.jasper.ai/", {
    recommended: true,
    rating: 4.5,
    popularity: 86,
    alternatives: ["Copy.ai", "Writesonic", "ChatGPT"]
  }),
  tool("copy-ai", "Copy.ai", "AI Writing", "GTM and writing platform for sales, marketing, workflows, brand content, and automated business copy.", "copy.ai", "https://www.copy.ai/prices", "https://support.copy.ai/", {
    rating: 4.4,
    popularity: 84,
    alternatives: ["Jasper", "Writesonic", "ChatGPT"]
  }),
  tool("writesonic", "Writesonic", "AI Writing", "AI content, SEO, chatbot, and marketing writing suite for creators and growth teams.", "writesonic.com", "https://writesonic.com/pricing", "https://docs.writesonic.com/", {
    rating: 4.4,
    popularity: 83,
    alternatives: ["Jasper", "Copy.ai", "ChatGPT"]
  }),
  tool("beautiful-ai", "Beautiful.ai", "AI Presentations", "Presentation software with automated slide design, templates, brand control, and AI-assisted deck creation.", "beautiful.ai", "https://www.beautiful.ai/pricing", "https://support.beautiful.ai/", {
    rating: 4.5,
    popularity: 84,
    alternatives: ["Gamma", "Canva AI", "Figma AI"]
  }),
  tool("clickup-ai", "ClickUp AI", "AI Productivity", "AI productivity features inside ClickUp for work management, writing, summaries, tasks, and team operations.", "clickup.com", "https://clickup.com/pricing", "https://help.clickup.com/", {
    rating: 4.5,
    popularity: 86,
    alternatives: ["Notion AI", "Motion", "Airtable AI"]
  }),
  tool("motion", "Motion", "AI Productivity", "AI scheduling and productivity platform for calendars, tasks, project planning, and time-blocking.", "usemotion.com", "https://www.usemotion.com/pricing", "https://help.usemotion.com/", {
    rating: 4.4,
    popularity: 82,
    alternatives: ["ClickUp AI", "Notion AI", "Airtable AI"]
  }),
  tool("framer-ai", "Framer AI", "AI Design", "Website design and publishing platform with AI-assisted page generation, visual editing, and modern web workflows.", "framer.com", "https://www.framer.com/pricing/", "https://www.framer.com/help/", {
    trending: true,
    rating: 4.6,
    popularity: 88,
    alternatives: ["Figma AI", "Canva AI", "Vercel"]
  }),
  tool("netlify", "Netlify", "AI Development", "Frontend cloud platform for deploying sites and apps with serverless functions, previews, and development workflows.", "netlify.com", "https://www.netlify.com/pricing/", "https://docs.netlify.com/", {
    rating: 4.6,
    popularity: 87,
    alternatives: ["Vercel", "Firebase", "Supabase"]
  }),
  tool("mintlify", "Mintlify", "Documentation", "Modern documentation platform for product docs, developer portals, API references, and AI-assisted docs workflows.", "mintlify.com", "https://mintlify.com/pricing", "https://mintlify.com/docs", {
    trending: true,
    rating: 4.6,
    popularity: 84,
    alternatives: ["GitBook", "ReadMe", "Docusaurus"]
  }),
  tool("docusaurus", "Docusaurus", "Documentation", "Open-source documentation framework for building docs sites, product guides, and developer portals.", "docusaurus.io", "https://docusaurus.io/", "https://docusaurus.io/docs", {
    pricing_type: "Free",
    monthly_pricing: "Free open-source",
    rating: 4.6,
    popularity: 85,
    alternatives: ["Mintlify", "GitBook", "Docsify"]
  }),
  tool("gitbook", "GitBook", "Documentation", "Documentation and knowledge-base platform for product docs, team knowledge, and developer resources.", "gitbook.com", "https://www.gitbook.com/pricing", "https://docs.gitbook.com/", {
    rating: 4.5,
    popularity: 84,
    alternatives: ["Mintlify", "ReadMe", "Docusaurus"]
  }),
  tool("readme", "ReadMe", "Documentation", "Developer documentation platform for API references, guides, changelogs, and developer experience portals.", "readme.com", "https://readme.com/pricing", "https://docs.readme.com/", {
    rating: 4.5,
    popularity: 83,
    alternatives: ["Mintlify", "GitBook", "Docusaurus"]
  }),
  tool("docsify", "Docsify", "Documentation", "Open-source documentation site generator for lightweight markdown-powered docs sites.", "docsify.js.org", "https://docsify.js.org/", "https://docsify.js.org/#/quickstart", {
    pricing_type: "Free",
    monthly_pricing: "Free open-source",
    rating: 4.3,
    popularity: 78,
    alternatives: ["Docusaurus", "GitBook", "Mintlify"]
  }),
  tool("neon", "Neon", "Database", "Serverless Postgres platform for modern applications, branching workflows, scale-to-zero, and AI-ready data apps.", "neon.com", "https://neon.com/pricing", "https://neon.com/docs", {
    trending: true,
    rating: 4.6,
    popularity: 86,
    alternatives: ["Supabase", "Firebase", "PlanetScale"]
  }),
  tool("planetscale", "PlanetScale", "Database", "MySQL-compatible database platform with branching, deploy requests, and production database workflows.", "planetscale.com", "https://planetscale.com/pricing", "https://planetscale.com/docs", {
    rating: 4.5,
    popularity: 83,
    alternatives: ["Neon", "Supabase", "Firebase"]
  }),
  tool("openai-api", "OpenAI", "API Platforms", "Official OpenAI platform for GPT models, multimodal APIs, embeddings, assistants, and production AI applications.", "platform.openai.com", "https://openai.com/api/pricing/", "https://platform.openai.com/docs", {
    featured: true,
    recommended: true,
    rating: 4.9,
    popularity: 98,
    api_url: "https://platform.openai.com/docs/api-reference",
    alternatives: ["Anthropic", "Google AI", "Groq"]
  }),
  tool("anthropic-api", "Anthropic", "API Platforms", "Claude API platform for building reliable AI applications with strong reasoning and long-context capabilities.", "anthropic.com", "https://www.anthropic.com/pricing#api", "https://docs.anthropic.com/", {
    featured: true,
    rating: 4.8,
    popularity: 95,
    api_url: "https://docs.anthropic.com/en/api/overview",
    alternatives: ["OpenAI", "Google AI", "Together AI"]
  }),
  tool("google-ai", "Google AI", "API Platforms", "Google AI developer platform for Gemini models, multimodal APIs, embeddings, and app integration.", "ai.google.dev", "https://ai.google.dev/pricing", "https://ai.google.dev/gemini-api/docs", {
    featured: true,
    rating: 4.7,
    popularity: 94,
    api_url: "https://ai.google.dev/api",
    alternatives: ["OpenAI", "Anthropic", "Groq"]
  }),
  tool("groq", "Groq", "API Platforms", "Fast AI inference platform for running open models with low-latency API access.", "groq.com", "https://groq.com/pricing/", "https://console.groq.com/docs/overview", {
    trending: true,
    rating: 4.6,
    popularity: 88,
    api_url: "https://console.groq.com/docs/api-reference",
    alternatives: ["OpenAI", "Together AI", "Google AI"]
  }),
  tool("together-ai", "Together AI", "API Platforms", "AI cloud platform for open-source model inference, fine-tuning, data workflows, and model deployment.", "together.ai", "https://www.together.ai/pricing", "https://docs.together.ai/", {
    rating: 4.5,
    popularity: 86,
    api_url: "https://docs.together.ai/reference",
    alternatives: ["Groq", "OpenAI", "Anthropic"]
  })
];
