/**
 * Content Generator
 *
 * AI-powered content creation with 50+ prompt templates for blog posts, emails,
 * social copy, and more. Templates are seeded into the plugin DB on first init
 * and can be extended with custom entries. The generate endpoint resolves a
 * template, interpolates variables, optionally appends an SEO instruction, and
 * calls the platform AI service via makeRequest.
 *
 * @package @agentbase/plugin-content-generator
 * @version 1.0.0
 */
import { createPlugin, PluginContext } from "@agentbase/plugin-sdk";

// ── Constants ─────────────────────────────────────────────────────────────────

export const SUPPORTED_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "claude-3-5-sonnet",
  "gemini-2-0-flash",
] as const;

export type SupportedModel = (typeof SUPPORTED_MODELS)[number];
export const DEFAULT_MODEL: SupportedModel = "gpt-4o";
export const DEFAULT_TEMPERATURE = 0.7;

/** Internal platform AI completions endpoint (overridable in tests via mock). */
export const AI_COMPLETIONS_PATH = "/api/v1/internal/ai/completions";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ContentTemplate {
  slug: string;
  name: string;
  category: string;
  description: string;
  /** Prompt body with {{variable}} placeholders. */
  prompt: string;
  /** Names of variables the template requires. */
  variables: string[];
  builtin: boolean;
}

export interface GenerateJobRequest {
  templateSlug: string;
  variables: Record<string, string>;
  model?: string;
  temperature?: number;
  keyword?: string;
}

export interface BatchJobRecord {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  jobs: GenerateJobRequest[];
  results: Array<{ index: number; text?: string; error?: string }>;
  createdAt: number;
  completedAt?: number;
}

// ── Built-in Templates ────────────────────────────────────────────────────────

/* eslint-disable prettier/prettier */
export const BUILT_IN_TEMPLATES: ContentTemplate[] = [
  // ── Blog & Content (10) ──────────────────────────────────────────────────
  {
    slug: "blog-post",
    name: "Blog Post",
    category: "Blog & Content",
    description: "Full-length blog article with intro, body, and conclusion.",
    prompt:
      "Write a comprehensive blog post titled '{{title}}' about {{topic}}. Target audience: {{audience}}. Tone: {{tone}}. Include an engaging introduction, 3–5 detailed sections with subheadings, and a strong conclusion with a call to action. Approximately {{wordCount}} words.",
    variables: ["title", "topic", "audience", "tone", "wordCount"],
    builtin: true,
  },
  {
    slug: "how-to-guide",
    name: "How-To Guide",
    category: "Blog & Content",
    description: "Step-by-step instructional guide for any task or process.",
    prompt:
      "Write a detailed how-to guide titled 'How to {{task}}'. Break it into clear numbered steps. Include a brief intro explaining why this matters, the steps themselves with tips for each, and a summary. Target reader: {{audience}}.",
    variables: ["task", "audience"],
    builtin: true,
  },
  {
    slug: "listicle",
    name: "Listicle",
    category: "Blog & Content",
    description: "Engaging numbered list article.",
    prompt:
      "Write a '{{number}} {{thingType}} for {{goal}}' listicle. Each item should have a bold title and 2–3 sentences of explanation. Tone: {{tone}}. Include a short intro and outro.",
    variables: ["number", "thingType", "goal", "tone"],
    builtin: true,
  },
  {
    slug: "case-study",
    name: "Case Study",
    category: "Blog & Content",
    description: "Customer success story in problem-solution-result format.",
    prompt:
      "Write a case study about {{company}} who used {{product}} to solve {{problem}}. Structure: 1) Background & Challenge, 2) Solution Implemented, 3) Results & Metrics (use these stats: {{results}}), 4) Key Takeaways. Professional tone.",
    variables: ["company", "product", "problem", "results"],
    builtin: true,
  },
  {
    slug: "product-comparison",
    name: "Product Comparison",
    category: "Blog & Content",
    description:
      "Side-by-side comparison article between two or more products.",
    prompt:
      "Write a product comparison article: '{{productA}} vs {{productB}}: Which is Better for {{useCase}}?'. Cover: overview of each product, feature-by-feature comparison table summary, pros and cons for each, and a verdict recommending the best fit for different user types.",
    variables: ["productA", "productB", "useCase"],
    builtin: true,
  },
  {
    slug: "opinion-piece",
    name: "Opinion Piece",
    category: "Blog & Content",
    description: "Thought leadership or editorial on a trending topic.",
    prompt:
      "Write an opinion piece about {{topic}} from the perspective that {{stance}}. Support the argument with {{numberOfPoints}} distinct points, relevant examples, and a compelling call to action. Tone: {{tone}}.",
    variables: ["topic", "stance", "numberOfPoints", "tone"],
    builtin: true,
  },
  {
    slug: "interview-questions",
    name: "Interview Questions",
    category: "Blog & Content",
    description: "Curated interview question set for a guest or expert.",
    prompt:
      "Generate {{count}} insightful interview questions for {{interviewee}}, who is an expert in {{expertise}}. Mix high-level strategic questions with specific tactical questions. Include one fun/personal question at the end.",
    variables: ["count", "interviewee", "expertise"],
    builtin: true,
  },
  {
    slug: "faq-section",
    name: "FAQ Section",
    category: "Blog & Content",
    description: "Frequently asked questions block for a product or topic.",
    prompt:
      "Write a FAQ section about {{topic}} with {{count}} questions and answers. Cover common beginner questions, technical questions, and objection-handling questions. Format each as a bold question followed by a concise answer. Context: {{context}}.",
    variables: ["topic", "count", "context"],
    builtin: true,
  },
  {
    slug: "press-release",
    name: "Press Release",
    category: "Blog & Content",
    description: "Professional news announcement in AP press release style.",
    prompt:
      "Write a press release announcing {{announcement}} by {{company}}. Include: headline, dateline ({{city}}, {{date}}), opening paragraph with who/what/when/where/why, two supporting paragraphs with quotes from {{spokesperson}}, boilerplate about {{company}}, and contact information placeholder. AP style.",
    variables: ["announcement", "company", "city", "date", "spokesperson"],
    builtin: true,
  },
  {
    slug: "product-description",
    name: "Product Description",
    category: "Blog & Content",
    description: "Compelling e-commerce or marketing product description.",
    prompt:
      "Write a {{length}}-word product description for {{productName}}. Key features: {{features}}. Target buyer: {{buyer}}. Tone: {{tone}}. Lead with the biggest benefit, weave in features naturally, and end with a compelling reason to buy now.",
    variables: ["length", "productName", "features", "buyer", "tone"],
    builtin: true,
  },

  // ── Email Marketing (8) ──────────────────────────────────────────────────
  {
    slug: "email-subject-line",
    name: "Email Subject Lines",
    category: "Email Marketing",
    description: "Five high-converting subject line variants for A/B testing.",
    prompt:
      "Write 5 email subject line variants for an email about {{topic}} targeting {{audience}}. Mix styles: curiosity gap, urgency, benefit-led, question, and personalisation token (e.g. '{{firstName}}, ...'). Keep each under 50 characters.",
    variables: ["topic", "audience"],
    builtin: true,
  },
  {
    slug: "cold-email",
    name: "Cold Outreach Email",
    category: "Email Marketing",
    description: "Personalised B2B cold email for sales prospecting.",
    prompt:
      "Write a cold outreach email from {{senderName}} at {{senderCompany}} to {{recipientRole}} at {{recipientCompany}}. The offer is {{offer}}. Pain point: {{painPoint}}. Keep it under 120 words. End with a single low-friction call to action.",
    variables: [
      "senderName",
      "senderCompany",
      "recipientRole",
      "recipientCompany",
      "offer",
      "painPoint",
    ],
    builtin: true,
  },
  {
    slug: "welcome-email",
    name: "Welcome Email",
    category: "Email Marketing",
    description: "Onboarding welcome email for new subscribers or customers.",
    prompt:
      "Write a warm welcome email from {{brand}} to a new {{userType}}. Include: a genuine welcome, what they can expect, one key action to take right now ({{firstAction}}), and a personal sign-off from {{senderName}}. Tone: {{tone}}.",
    variables: ["brand", "userType", "firstAction", "senderName", "tone"],
    builtin: true,
  },
  {
    slug: "newsletter",
    name: "Newsletter",
    category: "Email Marketing",
    description: "Weekly or monthly newsletter for subscribers.",
    prompt:
      "Write a newsletter for {{brand}} subscribers on the theme '{{theme}}'. Include: a punchy opening hook, 2–3 short content sections (news, tips, or resources about {{topic}}), and a closing note. Tone: {{tone}}. Approximately {{wordCount}} words.",
    variables: ["brand", "theme", "topic", "tone", "wordCount"],
    builtin: true,
  },
  {
    slug: "promotional-email",
    name: "Promotional Email",
    category: "Email Marketing",
    description: "Sales or discount promotion email.",
    prompt:
      "Write a promotional email for {{brand}} announcing {{offer}} ({{discount}} off {{product}}). Deadline: {{deadline}}. Create urgency without being pushy. Include a bold headline, body copy highlighting the value, and a clear CTA button text. Tone: {{tone}}.",
    variables: ["brand", "offer", "discount", "product", "deadline", "tone"],
    builtin: true,
  },
  {
    slug: "re-engagement-email",
    name: "Re-engagement Email",
    category: "Email Marketing",
    description: "Win-back email for inactive subscribers or customers.",
    prompt:
      "Write a re-engagement email for {{brand}} targeting subscribers inactive for {{inactivePeriod}}. Acknowledge their absence warmly, show what's new ({{updates}}), and offer an incentive ({{incentive}}) to return. Include an unsubscribe option mention.",
    variables: ["brand", "inactivePeriod", "updates", "incentive"],
    builtin: true,
  },
  {
    slug: "follow-up-email",
    name: "Follow-Up Email",
    category: "Email Marketing",
    description: "Post-meeting or post-demo follow-up email.",
    prompt:
      "Write a follow-up email from {{senderName}} to {{recipientName}} after {{context}}. Recap the key points discussed: {{keyPoints}}. Outline next steps: {{nextSteps}}. Keep it brief and professional.",
    variables: [
      "senderName",
      "recipientName",
      "context",
      "keyPoints",
      "nextSteps",
    ],
    builtin: true,
  },
  {
    slug: "onboarding-email",
    name: "Onboarding Email",
    category: "Email Marketing",
    description: "Day-2 or day-7 product onboarding email with tips.",
    prompt:
      "Write an onboarding email (day {{dayNumber}}) for new {{product}} users. Focus on helping them achieve {{milestone}}. Include 3 actionable tips with brief explanations, a link to {{resource}}, and encouragement. Tone: {{tone}}.",
    variables: ["dayNumber", "product", "milestone", "resource", "tone"],
    builtin: true,
  },

  // ── Social Media (8) ─────────────────────────────────────────────────────
  {
    slug: "instagram-caption",
    name: "Instagram Caption",
    category: "Social Media",
    description: "Engaging Instagram caption with hashtags and CTA.",
    prompt:
      "Write an Instagram caption for a post about {{topic}} for {{brand}}. Tone: {{tone}}. Include an engaging opening line, 2–3 sentences of body copy, a clear call to action, and 10–15 relevant hashtags at the end.",
    variables: ["topic", "brand", "tone"],
    builtin: true,
  },
  {
    slug: "tweet-thread",
    name: "Tweet Thread",
    category: "Social Media",
    description: "Multi-tweet educational or storytelling thread.",
    prompt:
      "Write a Twitter/X thread of {{tweetCount}} tweets about {{topic}}. Tweet 1 should be a hook that teases the value. Tweets 2–{{lastBodyTweet}} deliver the main insights. Final tweet should summarise and include a CTA. Keep each tweet under 280 characters.",
    variables: ["tweetCount", "topic", "lastBodyTweet"],
    builtin: true,
  },
  {
    slug: "linkedin-post",
    name: "LinkedIn Post",
    category: "Social Media",
    description: "Professional LinkedIn post for thought leadership.",
    prompt:
      "Write a LinkedIn post about {{insight}} for {{authorRole}} in {{industry}}. Open with a bold one-liner hook. Use short paragraphs (1–2 sentences). Include a personal story or data point. End with a question to spark comments. 150–250 words.",
    variables: ["insight", "authorRole", "industry"],
    builtin: true,
  },
  {
    slug: "facebook-post",
    name: "Facebook Post",
    category: "Social Media",
    description: "Engaging Facebook post for pages or groups.",
    prompt:
      "Write a Facebook post for {{brand}}'s page about {{topic}}. Start with an attention-grabbing question or statement. Include the main message ({{message}}), 1–2 emojis, and a clear CTA. Tone: {{tone}}. Keep it under 150 words.",
    variables: ["brand", "topic", "message", "tone"],
    builtin: true,
  },
  {
    slug: "tiktok-script",
    name: "TikTok Script",
    category: "Social Media",
    description: "Short-form vertical video script with hook and CTA.",
    prompt:
      "Write a TikTok script for a {{duration}}-second video about {{topic}} for {{brand}}. Structure: Hook (0–3s): grab attention immediately. Build (4–{{buildEnd}}s): deliver the core value. Landing (last 5s): CTA. Include on-screen text suggestions in [brackets].",
    variables: ["duration", "topic", "brand", "buildEnd"],
    builtin: true,
  },
  {
    slug: "youtube-description",
    name: "YouTube Description",
    category: "Social Media",
    description: "SEO-optimised YouTube video description with chapters.",
    prompt:
      "Write a YouTube description for a video titled '{{videoTitle}}' about {{topic}}. Include: 2–3 sentence summary (keyword-rich), video chapters with timestamps (use placeholder times), 3 relevant links as placeholders, and 5 hashtags. Channel: {{channel}}.",
    variables: ["videoTitle", "topic", "channel"],
    builtin: true,
  },
  {
    slug: "youtube-title",
    name: "YouTube Title Variants",
    category: "Social Media",
    description: "Five click-worthy YouTube title options to A/B test.",
    prompt:
      "Write 5 YouTube title variants for a video about {{topic}} targeting {{audience}}. Mix styles: how-to, numbers, curiosity, controversey, and emotional. Each title under 70 characters and optimized for click-through-rate.",
    variables: ["topic", "audience"],
    builtin: true,
  },
  {
    slug: "podcast-show-notes",
    name: "Podcast Show Notes",
    category: "Social Media",
    description: "Episode description, timestamps, and resource list.",
    prompt:
      "Write podcast show notes for episode {{episodeNumber}}: '{{episodeTitle}}'. Guest: {{guestName}} ({{guestTitle}}). Key topics discussed: {{topics}}. Include: 2-paragraph episode summary, 5–7 key takeaways as bullet points, guest bio, and placeholder timestamps for main segments.",
    variables: [
      "episodeNumber",
      "episodeTitle",
      "guestName",
      "guestTitle",
      "topics",
    ],
    builtin: true,
  },

  // ── SEO & Web (6) ────────────────────────────────────────────────────────
  {
    slug: "seo-meta-description",
    name: "SEO Meta Description",
    category: "SEO & Web",
    description: "Click-optimised meta description under 160 characters.",
    prompt:
      "Write 3 meta description variants for a page titled '{{pageTitle}}' about {{topic}} targeting the keyword '{{keyword}}'. Each must be under 160 characters, include the keyword naturally, convey the page value, and end with an implicit or explicit CTA.",
    variables: ["pageTitle", "topic", "keyword"],
    builtin: true,
  },
  {
    slug: "seo-title-tag",
    name: "SEO Title Tag",
    category: "SEO & Web",
    description: "Keyword-rich title tags under 60 characters.",
    prompt:
      "Write 5 SEO title tag variants for a page about {{topic}} targeting the primary keyword '{{keyword}}'. Each must be under 60 characters, lead with or include the keyword, and be click-worthy. Brand: {{brand}}.",
    variables: ["topic", "keyword", "brand"],
    builtin: true,
  },
  {
    slug: "landing-page-headline",
    name: "Landing Page Headline",
    category: "SEO & Web",
    description: "Above-the-fold hero headline and subheadline variants.",
    prompt:
      "Write 5 landing page headline + subheadline pairs for {{product}}. The core value proposition: {{valueProposition}}. Target customer pain: {{pain}}. Each headline should be punchy (under 10 words) and each subheadline should expand on the benefit in 1–2 sentences.",
    variables: ["product", "valueProposition", "pain"],
    builtin: true,
  },
  {
    slug: "landing-page-copy",
    name: "Landing Page Copy",
    category: "SEO & Web",
    description: "Full landing page copy sections: hero, features, CTA.",
    prompt:
      "Write full landing page copy for {{product}} targeting {{audience}}. Include: Hero (headline + subheadline + CTA), Problem section (3 pain points), Solution section (3 key benefits of {{product}}), Social proof placeholder, FAQ (3 questions), and final CTA. Tone: {{tone}}.",
    variables: ["product", "audience", "tone"],
    builtin: true,
  },
  {
    slug: "about-page",
    name: "About Page",
    category: "SEO & Web",
    description: "Company or personal brand about page copy.",
    prompt:
      "Write an About page for {{brand}}. Founded: {{founded}}. Mission: {{mission}}. Team size: {{teamSize}}. Key achievements: {{achievements}}. Include: a compelling origin story, what makes them different, the team ethos, and a human closing paragraph. Tone: {{tone}}.",
    variables: [
      "brand",
      "founded",
      "mission",
      "teamSize",
      "achievements",
      "tone",
    ],
    builtin: true,
  },
  {
    slug: "service-page",
    name: "Service Page",
    category: "SEO & Web",
    description: "Service or offering page with benefits and process.",
    prompt:
      "Write a service page for {{service}} offered by {{company}}. Include: headline, 3-sentence overview, key benefits ({{benefits}}), how it works (3 steps), who it's for ({{audience}}), pricing mention placeholder, and CTA. SEO keyword: {{keyword}}.",
    variables: ["service", "company", "benefits", "audience", "keyword"],
    builtin: true,
  },

  // ── Business (8) ─────────────────────────────────────────────────────────
  {
    slug: "sales-proposal",
    name: "Sales Proposal",
    category: "Business",
    description: "Professional B2B sales proposal document.",
    prompt:
      "Write a sales proposal from {{senderCompany}} to {{prospectCompany}} for {{solution}}. Sections: Executive Summary, Understanding of the Problem ({{problem}}), Proposed Solution, Scope of Work, Investment (placeholder pricing), Timeline, and Next Steps. Professional, confident tone.",
    variables: ["senderCompany", "prospectCompany", "solution", "problem"],
    builtin: true,
  },
  {
    slug: "meeting-summary",
    name: "Meeting Summary",
    category: "Business",
    description: "Structured meeting recap with decisions and action items.",
    prompt:
      "Write a meeting summary for a {{meetingType}} meeting on {{date}} between {{attendees}}. Topics discussed: {{topics}}. Format: Attendees list, Agenda items with discussion summaries, Key decisions made, Action items with owners and due dates (use name: {{actionOwner}} as placeholder), and Next meeting date.",
    variables: ["meetingType", "date", "attendees", "topics", "actionOwner"],
    builtin: true,
  },
  {
    slug: "executive-summary",
    name: "Executive Summary",
    category: "Business",
    description: "One-page executive summary for reports or proposals.",
    prompt:
      "Write a 300-word executive summary for {{documentTitle}}. The document covers {{topic}}. Key findings: {{findings}}. Recommendations: {{recommendations}}. The audience is {{audience}}. Write in a clear, decisive, executive-appropriate tone.",
    variables: [
      "documentTitle",
      "topic",
      "findings",
      "recommendations",
      "audience",
    ],
    builtin: true,
  },
  {
    slug: "business-plan-section",
    name: "Business Plan Section",
    category: "Business",
    description: "Individual section for a business plan document.",
    prompt:
      "Write the '{{sectionName}}' section of a business plan for {{company}}, a {{businessType}} company. The company: {{description}}. Target market: {{targetMarket}}. Include relevant data placeholders and structure appropriate for investor readers. 300–400 words.",
    variables: [
      "sectionName",
      "company",
      "businessType",
      "description",
      "targetMarket",
    ],
    builtin: true,
  },
  {
    slug: "investor-pitch",
    name: "Investor Pitch Narrative",
    category: "Business",
    description: "Compelling investor pitch story for decks and calls.",
    prompt:
      "Write an investor pitch narrative for {{company}}. Problem: {{problem}}. Solution: {{solution}}. Market size: {{marketSize}}. Traction: {{traction}}. Ask: {{ask}}. Structure it as a story arc (problem → insight → solution → why now → why us → traction → ask). 300–400 words.",
    variables: [
      "company",
      "problem",
      "solution",
      "marketSize",
      "traction",
      "ask",
    ],
    builtin: true,
  },
  {
    slug: "partnership-proposal",
    name: "Partnership Proposal",
    category: "Business",
    description: "Business partnership or collaboration proposal.",
    prompt:
      "Write a partnership proposal from {{company1}} to {{company2}} for {{partnershipType}}. Include: introduction of both companies, the partnership opportunity, mutual benefits for each party, proposed terms outline, and a next steps section. Professional and collaborative tone.",
    variables: ["company1", "company2", "partnershipType"],
    builtin: true,
  },
  {
    slug: "company-bio",
    name: "Company Bio",
    category: "Business",
    description: "Short company biography for directories or press.",
    prompt:
      "Write a {{length}}-word company bio for {{company}}. Founded: {{founded}} by {{founders}}. What they do: {{description}}. Notable achievements: {{achievements}}. Include mission and close with a forward-looking statement. Third-person, professional tone.",
    variables: [
      "length",
      "company",
      "founded",
      "founders",
      "description",
      "achievements",
    ],
    builtin: true,
  },
  {
    slug: "mission-statement",
    name: "Mission & Vision Statement",
    category: "Business",
    description: "Crisp mission and vision statements for a company.",
    prompt:
      "Write 3 mission statement variants and 3 vision statement variants for {{company}}. What they do: {{what}}. Who they serve: {{who}}. Why they exist: {{why}}. Each mission statement under 30 words, each vision statement under 25 words. Aspirational but grounded.",
    variables: ["company", "what", "who", "why"],
    builtin: true,
  },

  // ── Product & Sales (5) ──────────────────────────────────────────────────
  {
    slug: "product-launch-email",
    name: "Product Launch Email",
    category: "Product & Sales",
    description: "Announcement email for a new product launch.",
    prompt:
      "Write a product launch email from {{brand}} announcing {{productName}}. Key benefits: {{benefits}}. Early access offer: {{offer}}. Create excitement and urgency. Include a hero headline, 3-bullet feature highlights, a bold CTA, and a P.S. with a bonus.",
    variables: ["brand", "productName", "benefits", "offer"],
    builtin: true,
  },
  {
    slug: "feature-announcement",
    name: "Feature Announcement",
    category: "Product & Sales",
    description: "In-app or email announcement of a new product feature.",
    prompt:
      "Write a feature announcement for {{product}} users about the new '{{featureName}}' feature. Explain: what it is, why {{company}} built it (user pain it solves: {{problem}}), how to access it, and 3 ways it will help them. Friendly, product-voice tone.",
    variables: ["product", "featureName", "company", "problem"],
    builtin: true,
  },
  {
    slug: "customer-success-story",
    name: "Customer Success Story",
    category: "Product & Sales",
    description: "Short-form customer success snippet for sales collateral.",
    prompt:
      "Write a 150-word customer success story about {{customerName}} ({{customerRole}} at {{customerCompany}}) who used {{product}} to achieve {{result}}. Quote from customer: {{quote}}. Structure: challenge → solution → result. Suitable for sales decks or website.",
    variables: [
      "customerName",
      "customerRole",
      "customerCompany",
      "product",
      "result",
      "quote",
    ],
    builtin: true,
  },
  {
    slug: "upsell-copy",
    name: "Upsell / Cross-sell Copy",
    category: "Product & Sales",
    description: "In-app or email copy to upsell existing customers.",
    prompt:
      "Write upsell copy from {{brand}} to existing {{currentPlan}} customers upgrading to {{upgradePlan}}. Highlight 3 new capabilities they'll unlock: {{capabilities}}. Address the cost objection with a ROI framing. Soft, consultative tone. Include a CTA and a risk-reversal line.",
    variables: ["brand", "currentPlan", "upgradePlan", "capabilities"],
    builtin: true,
  },
  {
    slug: "customer-win-back",
    name: "Customer Win-Back",
    category: "Product & Sales",
    description: "Re-engage churned customers with a compelling offer.",
    prompt:
      "Write a win-back email from {{brand}} to a customer who cancelled {{product}} {{timeAgo}}. Acknowledge their decision, highlight what has improved since they left ({{improvements}}), and offer {{incentive}} to return. Humble and genuine tone. Short (under 150 words).",
    variables: ["brand", "product", "timeAgo", "improvements", "incentive"],
    builtin: true,
  },

  // ── HR & People (5) ──────────────────────────────────────────────────────
  {
    slug: "job-description",
    name: "Job Description",
    category: "HR & People",
    description: "Inclusive, compelling job posting for any role.",
    prompt:
      "Write a job description for a {{jobTitle}} at {{company}}. Team: {{team}}. Key responsibilities: {{responsibilities}}. Requirements: {{requirements}}. Include a company intro (2 sentences), role summary, responsibilities (5 bullets), requirements (5 bullets, distinguishing must-have from nice-to-have), and a DEI statement placeholder. Inclusive language.",
    variables: [
      "jobTitle",
      "company",
      "team",
      "responsibilities",
      "requirements",
    ],
    builtin: true,
  },
  {
    slug: "performance-review",
    name: "Performance Review",
    category: "HR & People",
    description: "Manager-written performance review for an employee.",
    prompt:
      "Write a performance review for {{employeeName}} ({{role}}) for the period {{period}}. Highlights: {{achievements}}. Areas to develop: {{developmentAreas}}. Overall rating: {{rating}}. Include: summary paragraph, 3 specific achievements with impact, 2 development areas with actionable suggestions, and a forward-looking goal-setting paragraph.",
    variables: [
      "employeeName",
      "role",
      "period",
      "achievements",
      "developmentAreas",
      "rating",
    ],
    builtin: true,
  },
  {
    slug: "cover-letter",
    name: "Cover Letter",
    category: "HR & People",
    description: "Tailored cover letter for a job application.",
    prompt:
      "Write a cover letter from {{applicantName}} applying for the {{jobTitle}} role at {{company}}. Relevant experience: {{experience}}. Key skills: {{skills}}. Why this company: {{whyCompany}}. Three paragraphs: hook + intent, experience evidence, culture fit + CTA. Professional, confident, not generic.",
    variables: [
      "applicantName",
      "jobTitle",
      "company",
      "experience",
      "skills",
      "whyCompany",
    ],
    builtin: true,
  },
  {
    slug: "interview-feedback",
    name: "Interview Feedback",
    category: "HR & People",
    description: "Structured post-interview feedback for hiring decisions.",
    prompt:
      "Write interview feedback for candidate {{candidateName}} who interviewed for {{role}} on {{date}}. Interviewer: {{interviewer}}. Strengths observed: {{strengths}}. Concerns: {{concerns}}. Overall recommendation: {{recommendation}}. Format as a structured scorecard with a narrative summary at the end.",
    variables: [
      "candidateName",
      "role",
      "date",
      "interviewer",
      "strengths",
      "concerns",
      "recommendation",
    ],
    builtin: true,
  },
  {
    slug: "team-update",
    name: "Team Update",
    category: "HR & People",
    description: "Weekly or monthly team status update communication.",
    prompt:
      "Write a team update email from {{managerName}} to the {{teamName}} team for {{period}}. Cover: key wins ({{wins}}), ongoing work, blockers ({{blockers}}), upcoming priorities ({{priorities}}), and a short motivational close. Friendly, direct tone. Bullet points where appropriate.",
    variables: [
      "managerName",
      "teamName",
      "period",
      "wins",
      "blockers",
      "priorities",
    ],
    builtin: true,
  },

  // ── Creative (5) ─────────────────────────────────────────────────────────
  {
    slug: "product-tagline",
    name: "Product Tagline",
    category: "Creative",
    description: "Memorable tagline or slogan options for a product or brand.",
    prompt:
      "Generate 10 tagline options for {{product}} ({{description}}). Target audience: {{audience}}. Brand personality: {{personality}}. Mix styles: benefit-led, emotion-led, action-led, aspirational, witty. Keep each under 8 words.",
    variables: ["product", "description", "audience", "personality"],
    builtin: true,
  },
  {
    slug: "brand-voice-sample",
    name: "Brand Voice Sample",
    category: "Creative",
    description: "Demonstrate a brand voice across multiple content types.",
    prompt:
      "Write 5 content samples demonstrating the brand voice of {{brand}}. Voice attributes: {{attributes}}. The 5 samples should be: (1) a tweet, (2) an email subject line, (3) a product description sentence, (4) an error message, (5) a CTA button label. Keep each faithful to {{attributes}}.",
    variables: ["brand", "attributes"],
    builtin: true,
  },
  {
    slug: "creative-brief",
    name: "Creative Brief",
    category: "Creative",
    description: "Agency-standard creative brief for campaigns or projects.",
    prompt:
      "Write a creative brief for {{projectName}} by {{brand}}. Campaign goal: {{goal}}. Target audience: {{audience}}. Key message: {{keyMessage}}. Mandatories/constraints: {{constraints}}. Deliverables: {{deliverables}}. Tone and feel: {{tone}}. Include all standard creative brief sections.",
    variables: [
      "projectName",
      "brand",
      "goal",
      "audience",
      "keyMessage",
      "constraints",
      "deliverables",
      "tone",
    ],
    builtin: true,
  },
  {
    slug: "icebreaker-questions",
    name: "Icebreaker Questions",
    category: "Creative",
    description: "Fun icebreaker questions for team meetings or events.",
    prompt:
      "Write {{count}} icebreaker questions for a {{eventType}} with {{audience}}. Mix easy (everyone can answer), fun (lighthearted), and insight-revealing questions. Avoid anything too personal or political. Context: {{context}}.",
    variables: ["count", "eventType", "audience", "context"],
    builtin: true,
  },
  {
    slug: "short-story-opener",
    name: "Short Story Opener",
    category: "Creative",
    description: "Compelling opening paragraph for a short story or novel.",
    prompt:
      "Write 3 different opening paragraphs (150 words each) for a story about {{premise}}. Genre: {{genre}}. Central character: {{character}}. Each opener should use a different technique: (1) in medias res, (2) scene-setting atmosphere, (3) character voice. Make each immediately compelling.",
    variables: ["premise", "genre", "character"],
    builtin: true,
  },

  // ── Video & Audio (5) ────────────────────────────────────────────────────
  {
    slug: "video-script",
    name: "Video Script",
    category: "Video & Audio",
    description: "Full narration script for an explainer or marketing video.",
    prompt:
      "Write a {{duration}}-minute video script for {{brand}} about {{topic}}. Format: scene descriptions in [brackets], narrator lines as plain text. Structure: Hook (0:00–0:15), Problem (0:15–0:45), Solution (0:45–{{solutionEnd}}), Proof ({{proofStart}}–{{proofEnd}}), CTA (last 15 seconds). Conversational, engaging tone.",
    variables: [
      "duration",
      "brand",
      "topic",
      "solutionEnd",
      "proofStart",
      "proofEnd",
    ],
    builtin: true,
  },
  {
    slug: "ad-script-30s",
    name: "30-Second Ad Script",
    category: "Video & Audio",
    description: "TV, radio, or pre-roll ad script (exactly 30 seconds).",
    prompt:
      "Write a 30-second ad script for {{brand}} promoting {{product}}. Key message: {{message}}. CTA: {{cta}}. Structure: 0-5s grab attention, 5-20s build desire, 20-25s address objection, 25-30s CTA. Include VO (voice over) labels and any sound/visual direction in [brackets]. Word count targets ~75 words.",
    variables: ["brand", "product", "message", "cta"],
    builtin: true,
  },
  {
    slug: "webinar-intro",
    name: "Webinar Introduction Script",
    category: "Video & Audio",
    description: "Opening script for a webinar or live online event.",
    prompt:
      "Write a webinar introduction script for '{{webinarTitle}}' hosted by {{hostName}} ({{hostTitle}}). Duration: approximately 3 minutes. Cover: welcome and housekeeping, host credibility, what attendees will learn ({{outcomes}}), agenda overview, and transition to the main content. Warm, professional tone.",
    variables: ["webinarTitle", "hostName", "hostTitle", "outcomes"],
    builtin: true,
  },
  {
    slug: "course-outline",
    name: "Online Course Outline",
    category: "Video & Audio",
    description: "Structured module and lesson plan for an online course.",
    prompt:
      "Create a course outline for '{{courseTitle}}' teaching {{topic}} to {{audience}}. Duration: {{duration}}. Include: course description (100 words), learning outcomes (5 bullets), {{moduleCount}} modules each with a title and 3–4 lesson titles, and a final project description. Structured and comprehensive.",
    variables: ["courseTitle", "topic", "audience", "duration", "moduleCount"],
    builtin: true,
  },
  {
    slug: "podcast-intro",
    name: "Podcast Intro Script",
    category: "Video & Audio",
    description: "Evergreen intro script played at the start of every episode.",
    prompt:
      "Write an evergreen podcast intro script for '{{podcastName}}' hosted by {{hostName}}. The show is about {{topic}} for {{audience}}. Keep it under 30 seconds when spoken aloud (~60–70 words). Include the show name, host name, tagline, and a brief audience promise. Energetic, memorable tone.",
    variables: ["podcastName", "hostName", "topic", "audience"],
    builtin: true,
  },
];
/* eslint-enable prettier/prettier */

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Plugin DB key for a template record. */
export function buildTemplateKey(slug: string): string {
  return `template:${slug}`;
}

/** Plugin DB key for a batch job record. */
export function buildJobKey(jobId: string): string {
  return `generated:${jobId}`;
}

/** Generate a random job ID. */
export function generateJobId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

/**
 * Replace `{{variable}}` placeholders in a prompt string with values from a
 * record. Unresolved placeholders are left as-is.
 */
export function applyTemplate(
  prompt: string,
  variables: Record<string, string>,
): string {
  return prompt.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(variables, key)
      ? variables[key]
      : match,
  );
}

/**
 * Calculate the density of a keyword in a body of text.
 * Returns a value between 0 (absent) and 1 (every word).
 */
export function analyzeKeywordDensity(text: string, keyword: string): number {
  if (!text || !keyword) return 0;
  const words = text.toLowerCase().match(/\b\w+\b/g) ?? [];
  if (words.length === 0) return 0;
  const kw = keyword.toLowerCase();
  const occurrences = words.filter((w) => w === kw).length;
  return occurrences / words.length;
}

/**
 * Build an SEO instruction suffix to append to a prompt when seoMode is on.
 * If a keyword is provided, include density guidance; otherwise give generic SEO advice.
 */
export function buildSeoSuffix(keyword?: string): string {
  const base =
    "\n\nOptimize this content for SEO: use natural language, appropriate subheadings (H2/H3), and a reading level suitable for a general audience.";
  if (keyword) {
    return (
      base +
      ` Include the keyword "${keyword}" at a density of 1–2% — naturally woven into the text, not stuffed.`
    );
  }
  return base;
}

// ── Seed helper ───────────────────────────────────────────────────────────────

/**
 * Seed all built-in templates into the plugin DB if they are not already
 * present. Called once inside app:init to make the library immediately usable.
 */
async function seedBuiltinTemplates(context: PluginContext): Promise<void> {
  for (const tpl of BUILT_IN_TEMPLATES) {
    const key = buildTemplateKey(tpl.slug);
    const existing = await context.api.db.get(key);
    if (!existing) {
      await context.api.db.set(key, tpl);
    }
  }
}

// ── Plugin ────────────────────────────────────────────────────────────────────

export default createPlugin({
  name: "content-generator",
  version: "1.0.0",
  description:
    "AI-powered content creation with 50+ prompt templates for blog posts, emails, social copy, and more.",
  author: "Agentbase Team",

  // ── Settings ───────────────────────────────────────────────────────────────
  settings: {
    defaultModel: {
      type: "select",
      label: "Default AI Model",
      options: [...SUPPORTED_MODELS],
      default: DEFAULT_MODEL,
    },
    temperature: {
      type: "number",
      label: "Temperature (0–1)",
      default: DEFAULT_TEMPERATURE,
    },
    seoMode: {
      type: "boolean",
      label: "SEO Mode",
      default: false,
    },
  },

  // ── Hooks ──────────────────────────────────────────────────────────────────
  hooks: {
    /**
     * app:init — seed the built-in template library and register all endpoints.
     * Endpoint handlers close over `context` so they can access the plugin DB.
     */
    "app:init": async (context: PluginContext) => {
      context.api.log("Content Generator initialized — seeding templates");
      await seedBuiltinTemplates(context);

      // ── GET /templates ─────────────────────────────────────────────────
      context.api.registerEndpoint({
        method: "GET",
        path: "/templates",
        auth: true,
        description: "List all available content templates.",
        handler: async (_req, res) => {
          const keys = await context.api.db.keys("template:");
          const templates: ContentTemplate[] = [];
          for (const key of keys) {
            const tpl = (await context.api.db.get(key)) as ContentTemplate;
            if (tpl) templates.push(tpl);
          }
          templates.sort((a, b) =>
            `${a.category}:${a.name}`.localeCompare(`${b.category}:${b.name}`),
          );
          res.json({ templates, total: templates.length });
        },
      });

      // ── GET /templates/:id ─────────────────────────────────────────────
      context.api.registerEndpoint({
        method: "GET",
        path: "/templates/:id",
        auth: true,
        description: "Retrieve a single template by slug.",
        handler: async (req, res) => {
          const slug = req.params["id"];
          const tpl = await context.api.db.get(buildTemplateKey(slug));
          if (!tpl) {
            res.status(404).json({ error: "Template not found" });
            return;
          }
          res.json({ template: tpl });
        },
      });

      // ── POST /generate ─────────────────────────────────────────────────
      context.api.registerEndpoint({
        method: "POST",
        path: "/generate",
        auth: true,
        description: "Generate content from a single template.",
        handler: async (req, res) => {
          const {
            templateSlug,
            variables = {},
            model,
            temperature,
            keyword,
          } = (req.body ?? {}) as Partial<GenerateJobRequest>;

          if (!templateSlug) {
            res.status(400).json({ error: "templateSlug is required" });
            return;
          }

          const tpl = (await context.api.db.get(
            buildTemplateKey(templateSlug),
          )) as ContentTemplate | null;
          if (!tpl) {
            res.status(404).json({ error: "Template not found" });
            return;
          }

          const resolvedModel =
            model ??
            (context.api.getConfig("defaultModel") as string | undefined) ??
            DEFAULT_MODEL;
          const resolvedTemp =
            temperature ??
            (context.api.getConfig("temperature") as number | undefined) ??
            DEFAULT_TEMPERATURE;
          const seoMode =
            (context.api.getConfig("seoMode") as boolean | undefined) ?? false;

          let prompt = applyTemplate(tpl.prompt, variables ?? {});
          if (seoMode) {
            prompt += buildSeoSuffix(keyword);
          }

          const aiResp = await context.api.makeRequest(AI_COMPLETIONS_PATH, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: resolvedModel,
              temperature: resolvedTemp,
              messages: [{ role: "user", content: prompt }],
            }),
          });

          if (!aiResp.ok) {
            res.status(502).json({ error: "AI service unavailable" });
            return;
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const json = (await (aiResp as any).json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const text = json.choices?.[0]?.message?.content ?? "";

          res.json({ text, templateSlug, model: resolvedModel });
        },
      });

      // ── POST /batch ────────────────────────────────────────────────────
      context.api.registerEndpoint({
        method: "POST",
        path: "/batch",
        auth: true,
        description:
          "Submit a batch of generation jobs; poll via GET /batch/:jobId.",
        handler: async (req, res) => {
          const { jobs } = (req.body ?? {}) as {
            jobs?: GenerateJobRequest[];
          };

          if (!Array.isArray(jobs) || jobs.length === 0) {
            res.status(400).json({ error: "jobs array is required" });
            return;
          }

          const jobId = generateJobId();
          const record: BatchJobRecord = {
            jobId,
            status: "processing",
            jobs,
            results: [],
            createdAt: Date.now(),
          };
          await context.api.db.set(buildJobKey(jobId), record);

          // Process each job, collecting results even on partial failure.
          const results: BatchJobRecord["results"] = [];
          for (let i = 0; i < jobs.length; i++) {
            const job = jobs[i]!;
            try {
              const tpl = (await context.api.db.get(
                buildTemplateKey(job.templateSlug),
              )) as ContentTemplate | null;
              if (!tpl) {
                results.push({
                  index: i,
                  error: `Template not found: ${job.templateSlug}`,
                });
                continue;
              }

              const seoMode =
                (context.api.getConfig("seoMode") as boolean | undefined) ??
                false;
              let prompt = applyTemplate(tpl.prompt, job.variables ?? {});
              if (seoMode) prompt += buildSeoSuffix(job.keyword);

              const resolvedModel =
                job.model ??
                (context.api.getConfig("defaultModel") as string | undefined) ??
                DEFAULT_MODEL;
              const resolvedTemp =
                job.temperature ??
                (context.api.getConfig("temperature") as number | undefined) ??
                DEFAULT_TEMPERATURE;

              const aiResp = await context.api.makeRequest(
                AI_COMPLETIONS_PATH,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    model: resolvedModel,
                    temperature: resolvedTemp,
                    messages: [{ role: "user", content: prompt }],
                  }),
                },
              );

              if (!aiResp.ok) {
                results.push({ index: i, error: "AI service unavailable" });
                continue;
              }

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const json = (await (aiResp as any).json()) as {
                choices?: Array<{ message?: { content?: string } }>;
              };
              results.push({
                index: i,
                text: json.choices?.[0]?.message?.content ?? "",
              });
            } catch (err: unknown) {
              results.push({
                index: i,
                error: err instanceof Error ? err.message : "Unknown error",
              });
            }
          }

          const updated: BatchJobRecord = {
            ...record,
            status: "completed",
            results,
            completedAt: Date.now(),
          };
          await context.api.db.set(buildJobKey(jobId), updated);

          res.json(updated);
        },
      });

      // ── GET /batch/:jobId ──────────────────────────────────────────────
      context.api.registerEndpoint({
        method: "GET",
        path: "/batch/:jobId",
        auth: true,
        description: "Poll the status of a batch generation job.",
        handler: async (req, res) => {
          const { jobId } = req.params;
          const record = await context.api.db.get(buildJobKey(jobId));
          if (!record) {
            res.status(404).json({ error: "Batch job not found" });
            return;
          }
          res.json(record);
        },
      });
    },
  },

  // ── Filters ────────────────────────────────────────────────────────────────
  filters: {
    /**
     * prompt:modify — if SEO mode is enabled, append an SEO optimisation
     * instruction to every prompt that goes through the conversation system.
     * Also resolves any remaining {{variable}} placeholders from context.config.
     */
    "prompt:modify": (context: PluginContext, value: unknown): string => {
      let prompt = typeof value === "string" ? value : String(value ?? "");

      // Resolve any template variables present in context.config.
      const configVars = context.config as Record<string, string>;
      if (/\{\{\w+\}\}/.test(prompt)) {
        prompt = applyTemplate(prompt, configVars);
      }

      // Append SEO suffix when seoMode is active.
      const seoMode =
        (context.api.getConfig("seoMode") as boolean | undefined) ?? false;
      if (seoMode) {
        const keyword = context.config["focusKeyword"] as string | undefined;
        prompt += buildSeoSuffix(keyword);
      }

      return prompt;
    },
  },
});
