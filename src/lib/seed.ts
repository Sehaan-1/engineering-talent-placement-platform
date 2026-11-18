import { db, pool } from "@/db";
import {
  users,
  candidates,
  skillCategories,
  skillDefinitions,
  skillMatrices,
  availabilities,
  placements,
  interviews,
  clients,
  clientContacts,
  shortlists,
  organizations,
  orgMembers,
  orgInvites,
  auditLogs,
} from "@/db/schema";
import { hashPassword, pickColor } from "./auth-utils";
import { sql, eq } from "drizzle-orm";

export const DEFAULT_SKILL_CATEGORIES = [
  {
    name: "Frontend",
    slug: "frontend",
    color: "#3b82f6",
    skills: [
      { name: "React", slug: "react" },
      { name: "TypeScript", slug: "typescript" },
      { name: "Next.js", slug: "nextjs" },
      { name: "JavaScript", slug: "javascript" },
      { name: "Vue.js", slug: "vue" },
      { name: "Nuxt", slug: "nuxt" },
      { name: "Angular", slug: "angular" },
      { name: "Svelte", slug: "svelte" },
      { name: "Tailwind CSS", slug: "tailwind" },
      { name: "HTML / CSS", slug: "html-css" },
      { name: "WebGL / Three.js", slug: "threejs" },
      { name: "Astro", slug: "astro" },
    ],
  },
  {
    name: "Backend",
    slug: "backend",
    color: "#10b981",
    skills: [
      { name: "Node.js", slug: "nodejs" },
      { name: "Express", slug: "express" },
      { name: "NestJS", slug: "nestjs" },
      { name: "Python", slug: "python" },
      { name: "Django", slug: "django" },
      { name: "FastAPI", slug: "fastapi" },
      { name: "Go", slug: "go" },
      { name: "Rust", slug: "rust" },
      { name: "Java", slug: "java" },
      { name: "Spring Boot", slug: "springboot" },
      { name: "C# / .NET", slug: "csharp-dotnet" },
      { name: "Ruby on Rails", slug: "rails" },
      { name: "GraphQL", slug: "graphql" },
      { name: "REST APIs", slug: "rest-apis" },
      { name: "gRPC", slug: "grpc" },
    ],
  },
  {
    name: "Cloud & DevOps",
    slug: "cloud-devops",
    color: "#f59e0b",
    skills: [
      { name: "AWS", slug: "aws" },
      { name: "GCP", slug: "gcp" },
      { name: "Azure", slug: "azure" },
      { name: "Docker", slug: "docker" },
      { name: "Kubernetes", slug: "kubernetes" },
      { name: "Terraform", slug: "terraform" },
      { name: "CI / CD", slug: "ci-cd" },
      { name: "Linux", slug: "linux" },
    ],
  },
  {
    name: "Mobile",
    slug: "mobile",
    color: "#8b5cf6",
    skills: [
      { name: "React Native", slug: "react-native" },
      { name: "Flutter", slug: "flutter" },
      { name: "iOS / Swift", slug: "swift" },
      { name: "Android / Kotlin", slug: "kotlin" },
    ],
  },
  {
    name: "Data & Storage",
    slug: "data-storage",
    color: "#ec4899",
    skills: [
      { name: "PostgreSQL", slug: "postgresql" },
      { name: "Redis", slug: "redis" },
      { name: "MongoDB", slug: "mongodb" },
      { name: "MySQL", slug: "mysql" },
      { name: "Elasticsearch", slug: "elasticsearch" },
      { name: "Kafka", slug: "kafka" },
    ],
  },
  {
    name: "Architecture & Other",
    slug: "architecture",
    color: "#64748b",
    skills: [
      { name: "System Design", slug: "system-design" },
      { name: "Microservices", slug: "microservices" },
      { name: "Design Systems", slug: "design-systems" },
      { name: "Monorepos", slug: "monorepos" },
    ],
  },
];

type SkillInput = {
  slug: string;
  proficiency: "learning" | "working" | "strong" | "expert";
  yearsUsed: number;
  notes?: string;
};

type CandidateInput = {
  fullName: string;
  headline: string;
  email: string;
  phone?: string;
  location: string;
  region: "us" | "ca" | "uk" | "eu" | "other";
  timezone: string;
  timezoneOverlap: string;
  seniority: "junior" | "mid" | "senior" | "staff" | "principal";
  yearsExperience: number;
  hourlyRateUsd: number;
  verification: "unverified" | "pending" | "verified" | "rejected";
  bio: string;
  portfolioUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  tags: string[];
  skills: SkillInput[];
  availability: {
    hoursPerWeek: number;
    status: "available" | "limited" | "booked" | "on-leave";
    preferredStart: string;
    notes?: string;
  };
  placements: Array<{
    clientName: string;
    roleTitle: string;
    status:
      | "sourced"
      | "screening"
      | "submitted"
      | "interviewing"
      | "offer"
      | "placed"
      | "archived";
    valueUsd: number;
    startDate?: Date;
    notes?: string;
    interviews: Array<{
      type:
        | "screen"
        | "technical"
        | "system-design"
        | "behavioral"
        | "final";
      scheduledAt: Date;
      durationMinutes: number;
      outcome: "scheduled" | "passed" | "failed" | "no-show" | "rescheduled";
      interviewer: string;
      score?: number;
      feedback?: string;
    }>;
  }>;
};

const DEMO_RECRUITER = {
  email: "demo@arena.dev",
  password: "demo1234",
  name: "Riley Chen",
  role: "recruiter" as const,
};

const DEMO_CANDIDATES: CandidateInput[] = [
  {
    fullName: "Maya Okafor",
    headline: "Senior React Engineer • Design Systems",
    email: "maya.okafor@example.com",
    phone: "+1 415 555 0142",
    location: "San Francisco, CA",
    region: "us",
    timezone: "America/Los_Angeles (PST)",
    timezoneOverlap: "PST ±3h",
    seniority: "senior",
    yearsExperience: 8,
    hourlyRateUsd: 135,
    verification: "verified",
    bio: "Design-systems specialist with deep React and TypeScript chops. Built component libraries used by 40+ product teams. Loves accessibility audits and Figma-to-code translation.",
    portfolioUrl: "https://mayaokafor.dev",
    githubUrl: "https://github.com/mokafor",
    linkedinUrl: "https://linkedin.com/in/mokafor",
    tags: ["design-systems", "accessibility", "typescript", "react"],
    skills: [
      { slug: "react", proficiency: "expert", yearsUsed: 8 },
      { slug: "typescript", proficiency: "expert", yearsUsed: 7 },
      { slug: "nextjs", proficiency: "strong", yearsUsed: 4 },
      { slug: "javascript", proficiency: "expert", yearsUsed: 10 },
      { slug: "tailwind", proficiency: "expert", yearsUsed: 5 },
      { slug: "design-systems", proficiency: "expert", yearsUsed: 6 },
    ],
    availability: {
      hoursPerWeek: 35,
      status: "limited",
      preferredStart: "2 weeks",
      notes: "Prefers async mornings, 2 overlap hours with ET.",
    },
    placements: [
      {
        clientName: "Lumen Health",
        roleTitle: "Staff Frontend Engineer",
        status: "interviewing",
        valueUsd: 185000,
        startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21),
        notes: "Final round with VP of Engineering next week.",
        interviews: [
          {
            type: "screen",
            scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8),
            durationMinutes: 30,
            outcome: "passed",
            interviewer: "Priya N.",
            score: 9,
            feedback: "Excellent communicator, asked sharp questions.",
          },
          {
            type: "technical",
            scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
            durationMinutes: 90,
            outcome: "passed",
            interviewer: "Diego F.",
            score: 8,
            feedback: "Strong on hooks and render perf; light on test patterns.",
          },
          {
            type: "system-design",
            scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
            durationMinutes: 60,
            outcome: "scheduled",
            interviewer: "Sarah K.",
          },
        ],
      },
      {
        clientName: "Nimbus Analytics",
        roleTitle: "Senior Frontend (Contract)",
        status: "placed",
        valueUsd: 162000,
        startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120),
        notes: "12-month contract, full design-system rewrite shipped.",
        interviews: [
          {
            type: "final",
            scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 150),
            durationMinutes: 60,
            outcome: "passed",
            interviewer: "Tomás R.",
            score: 9,
            feedback: "Hired. Strong culture add.",
          },
        ],
      },
    ],
  },
  {
    fullName: "Liam Whittaker",
    headline: "Angular Architect • Enterprise Platforms",
    email: "liam.whittaker@example.com",
    phone: "+44 20 7946 0042",
    location: "Manchester, UK",
    region: "uk",
    timezone: "Europe/London (GMT)",
    timezoneOverlap: "GMT ±2h",
    seniority: "staff",
    yearsExperience: 11,
    hourlyRateUsd: 145,
    verification: "verified",
    bio: "Angular specialist working on fintech and insurance platforms. Built micro-frontend architectures with Module Federation and Nx monorepos.",
    portfolioUrl: "https://liamwhittaker.co.uk",
    githubUrl: "https://github.com/lwhittaker",
    linkedinUrl: "https://linkedin.com/in/lwhittaker",
    tags: ["angular", "nx", "micro-frontends", "enterprise"],
    skills: [
      { slug: "angular", proficiency: "expert", yearsUsed: 9 },
      { slug: "typescript", proficiency: "expert", yearsUsed: 9 },
      { slug: "javascript", proficiency: "strong", yearsUsed: 12 },
      { slug: "react", proficiency: "working", yearsUsed: 2 },
      { slug: "monorepos", proficiency: "expert", yearsUsed: 6 },
    ],
    availability: {
      hoursPerWeek: 40,
      status: "available",
      preferredStart: "1 week",
      notes: "Open to UK and ET overlap roles.",
    },
    placements: [
      {
        clientName: "Tideway Bank",
        roleTitle: "Angular Tech Lead",
        status: "offer",
        valueUsd: 198000,
        startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
        notes: "Offer letter signed, awaiting background check.",
        interviews: [
          {
            type: "screen",
            scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12),
            durationMinutes: 45,
            outcome: "passed",
            interviewer: "Helen P.",
            score: 9,
            feedback: "Perfect stakeholder skills for a regulated env.",
          },
          {
            type: "technical",
            scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
            durationMinutes: 90,
            outcome: "passed",
            interviewer: "Anil M.",
            score: 9,
            feedback: "Solved the RxJS stream task in 18 min.",
          },
        ],
      },
    ],
  },
  {
    fullName: "Aaliyah Mensah",
    headline: "Vue.js Developer • 3D Web Experiences",
    email: "aaliyah.mensah@example.com",
    phone: "+1 647 555 0177",
    location: "Toronto, ON",
    region: "ca",
    timezone: "America/Toronto (EST)",
    timezoneOverlap: "EST ±3h",
    seniority: "mid",
    yearsExperience: 5,
    hourlyRateUsd: 95,
    verification: "pending",
    bio: "Vue and Nuxt developer with a side passion for WebGL and Three.js. Loves shipping delightful UI motion and small, fast apps.",
    portfolioUrl: "https://aaliyahmensah.ca",
    githubUrl: "https://github.com/amensah",
    linkedinUrl: "https://linkedin.com/in/amensah",
    tags: ["vue", "nuxt", "three.js", "animation"],
    skills: [
      { slug: "vue", proficiency: "expert", yearsUsed: 5 },
      { slug: "nuxt", proficiency: "strong", yearsUsed: 3 },
      { slug: "typescript", proficiency: "working", yearsUsed: 3 },
      { slug: "javascript", proficiency: "strong", yearsUsed: 6 },
      { slug: "threejs", proficiency: "strong", yearsUsed: 3 },
    ],
    availability: {
      hoursPerWeek: 30,
      status: "available",
      preferredStart: "Immediately",
      notes: "Prefers 3D / interactive product work.",
    },
    placements: [
      {
        clientName: "Studio Halftone",
        roleTitle: "Vue Developer (Contract)",
        status: "submitted",
        valueUsd: 92000,
        startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
        notes: "Client reviewing portfolio.",
        interviews: [
          {
            type: "screen",
            scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
            durationMinutes: 30,
            outcome: "passed",
            interviewer: "Jules D.",
            score: 8,
            feedback: "Lovely portfolio. Sent for technical.",
          },
        ],
      },
    ],
  },
  {
    fullName: "Noah Bergström",
    headline: "React Native + Next.js Engineer",
    email: "noah.bergstrom@example.com",
    location: "Brooklyn, NY",
    region: "us",
    timezone: "America/New_York (EST)",
    timezoneOverlap: "EST ±3h",
    seniority: "senior",
    yearsExperience: 7,
    hourlyRateUsd: 120,
    verification: "verified",
    bio: "Cross-platform product engineer. Shipped two consumer apps with 1M+ MAU. Strong on Next.js App Router, server components, and edge runtime.",
    portfolioUrl: "https://noahbergstrom.com",
    githubUrl: "https://github.com/nbergstrom",
    linkedinUrl: "https://linkedin.com/in/nbergstrom",
    tags: ["react-native", "nextjs", "edge", "typescript"],
    skills: [
      { slug: "react", proficiency: "expert", yearsUsed: 7 },
      { slug: "nextjs", proficiency: "expert", yearsUsed: 4 },
      { slug: "typescript", proficiency: "strong", yearsUsed: 6 },
      { slug: "react-native", proficiency: "expert", yearsUsed: 5 },
      { slug: "svelte", proficiency: "learning", yearsUsed: 1 },
    ],
    availability: {
      hoursPerWeek: 20,
      status: "booked",
      preferredStart: "1 month",
      notes: "Currently on a 3-month engagement ending soon.",
    },
    placements: [
      {
        clientName: "Mosaic Travel",
        roleTitle: "Senior Frontend Engineer",
        status: "placed",
        valueUsd: 168000,
        startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60),
        notes: "Owns the booking funnel rebuild.",
        interviews: [],
      },
    ],
  },
  {
    fullName: "Sofía Reyes",
    headline: "Angular → React Migration Specialist",
    email: "sofia.reyes@example.com",
    location: "Austin, TX",
    region: "us",
    timezone: "America/Chicago (CST)",
    timezoneOverlap: "CST ±3h",
    seniority: "senior",
    yearsExperience: 9,
    hourlyRateUsd: 115,
    verification: "verified",
    bio: "Loves unglamorous migration work. Has migrated 4 enterprise Angular apps to React/Next.js with zero downtime.",
    portfolioUrl: "https://sofiareyes.dev",
    githubUrl: "https://github.com/sreyes",
    linkedinUrl: "https://linkedin.com/in/sreyes",
    tags: ["migration", "angular", "react", "monorepo"],
    skills: [
      { slug: "angular", proficiency: "expert", yearsUsed: 6 },
      { slug: "react", proficiency: "expert", yearsUsed: 5 },
      { slug: "typescript", proficiency: "expert", yearsUsed: 8 },
      { slug: "nextjs", proficiency: "strong", yearsUsed: 3 },
      { slug: "nodejs", proficiency: "strong", yearsUsed: 5 },
    ],
    availability: {
      hoursPerWeek: 40,
      status: "available",
      preferredStart: "1 week",
      notes: "Open to short migration sprints.",
    },
    placements: [
      {
        clientName: "Atlas Logistics",
        roleTitle: "Frontend Migration Lead",
        status: "screening",
        valueUsd: 175000,
        startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        notes: "Initial screen scheduled.",
        interviews: [
          {
            type: "screen",
            scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1),
            durationMinutes: 30,
            outcome: "scheduled",
            interviewer: "Riley C.",
          },
        ],
      },
    ],
  },
  {
    fullName: "Ethan Holloway",
    headline: "Junior React Developer",
    email: "ethan.holloway@example.com",
    location: "Vancouver, BC",
    region: "ca",
    timezone: "America/Vancouver (PST)",
    timezoneOverlap: "PST ±3h",
    seniority: "junior",
    yearsExperience: 2,
    hourlyRateUsd: 55,
    verification: "unverified",
    bio: "Career-switcher from product design. Strong on CSS, animation, and accessible UI. Looking for a first remote role with mentorship.",
    portfolioUrl: "https://ethanholloway.ca",
    githubUrl: "https://github.com/eholloway",
    linkedinUrl: "https://linkedin.com/in/eholloway",
    tags: ["react", "css", "accessibility", "junior"],
    skills: [
      { slug: "react", proficiency: "working", yearsUsed: 2 },
      { slug: "typescript", proficiency: "learning", yearsUsed: 1 },
      { slug: "javascript", proficiency: "strong", yearsUsed: 3 },
      { slug: "tailwind", proficiency: "strong", yearsUsed: 2 },
      { slug: "nextjs", proficiency: "learning", yearsUsed: 1 },
    ],
    availability: {
      hoursPerWeek: 40,
      status: "available",
      preferredStart: "Immediately",
      notes: "Open to part-time and contract-to-hire.",
    },
    placements: [],
  },
  {
    fullName: "Hannah Lindqvist",
    headline: "Vue 3 + TypeScript Engineer",
    email: "hannah.lindqvist@example.com",
    location: "Edinburgh, UK",
    region: "uk",
    timezone: "Europe/London (GMT)",
    timezoneOverlap: "GMT ±2h",
    seniority: "mid",
    yearsExperience: 6,
    hourlyRateUsd: 100,
    verification: "verified",
    bio: "Loves Composition API and Vue 3 reactivity. Built real-time collaboration tools and design tooling.",
    portfolioUrl: "https://hannahlindqvist.co.uk",
    githubUrl: "https://github.com/hlindqvist",
    linkedinUrl: "https://linkedin.com/in/hlindqvist",
    tags: ["vue", "typescript", "real-time", "tooling"],
    skills: [
      { slug: "vue", proficiency: "expert", yearsUsed: 6 },
      { slug: "typescript", proficiency: "strong", yearsUsed: 5 },
      { slug: "javascript", proficiency: "strong", yearsUsed: 8 },
      { slug: "nuxt", proficiency: "working", yearsUsed: 1 },
      { slug: "python", proficiency: "working", yearsUsed: 2 },
    ],
    availability: {
      hoursPerWeek: 30,
      status: "limited",
      preferredStart: "2 weeks",
      notes: "UK-only hours, ET overlap for standups.",
    },
    placements: [
      {
        clientName: "Loop & Co",
        roleTitle: "Vue Engineer",
        status: "interviewing",
        valueUsd: 124000,
        startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 18),
        notes: "Second technical round scheduled.",
        interviews: [
          {
            type: "technical",
            scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6),
            durationMinutes: 60,
            outcome: "passed",
            interviewer: "Mara S.",
            score: 8,
            feedback: "Clean state-machine solution.",
          },
        ],
      },
    ],
  },
  {
    fullName: "Diego Vargas",
    headline: "Principal Frontend Architect",
    email: "diego.vargas@example.com",
    location: "London, UK",
    region: "uk",
    timezone: "Europe/London (GMT)",
    timezoneOverlap: "GMT ±3h",
    seniority: "principal",
    yearsExperience: 14,
    hourlyRateUsd: 195,
    verification: "verified",
    bio: "Principal-level IC and former eng manager. Sets frontend strategy, leads platform rewrites, and mentors staff+ engineers.",
    portfolioUrl: "https://diegovargas.uk",
    githubUrl: "https://github.com/dvargas",
    linkedinUrl: "https://linkedin.com/in/dvargas",
    tags: ["principal", "architecture", "react", "leadership"],
    skills: [
      { slug: "react", proficiency: "expert", yearsUsed: 10 },
      { slug: "nextjs", proficiency: "expert", yearsUsed: 5 },
      { slug: "typescript", proficiency: "expert", yearsUsed: 9 },
      { slug: "angular", proficiency: "strong", yearsUsed: 4 },
      { slug: "system-design", proficiency: "expert", yearsUsed: 8 },
      { slug: "aws", proficiency: "strong", yearsUsed: 6 },
    ],
    availability: {
      hoursPerWeek: 25,
      status: "limited",
      preferredStart: "1 month",
      notes: "Selective on engagements, prefers advisory scope.",
    },
    placements: [
      {
        clientName: "Veridian Labs",
        roleTitle: "Principal Frontend Architect",
        status: "placed",
        valueUsd: 240000,
        startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45),
        notes: "Defining the next-gen design system and migration plan.",
        interviews: [],
      },
    ],
  },
];

export async function ensureSkillTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id serial PRIMARY KEY,
      email text NOT NULL,
      password_hash text NOT NULL,
      name text NOT NULL,
      role text NOT NULL DEFAULT 'recruiter',
      avatar_color text NOT NULL DEFAULT '#6366f1',
      created_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id text PRIMARY KEY,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at timestamp with time zone NOT NULL,
      created_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS candidates (
      id serial PRIMARY KEY,
      owner_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_id integer REFERENCES users(id) ON DELETE SET NULL,
      invite_token text,
      invite_expires_at timestamp with time zone,
      magic_link_token text,
      magic_link_expires_at timestamp with time zone,
      full_name text NOT NULL,
      headline text NOT NULL,
      email text NOT NULL,
      phone text,
      location text NOT NULL,
      region text NOT NULL DEFAULT 'us',
      timezone text NOT NULL,
      timezone_overlap text NOT NULL,
      seniority text NOT NULL DEFAULT 'mid',
      years_experience integer NOT NULL DEFAULT 3,
      hourly_rate_usd integer NOT NULL DEFAULT 80,
      verification text NOT NULL DEFAULT 'pending',
      bio text NOT NULL DEFAULT '',
      portfolio_url text,
      github_url text,
      linkedin_url text,
      tags jsonb NOT NULL DEFAULT '[]'::jsonb,
      avatar_color text NOT NULL DEFAULT '#6366f1',
      search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(full_name, '') || ' ' || coalesce(headline, '') || ' ' || coalesce(bio, ''))
      ) STORED,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS availabilities (
      id serial PRIMARY KEY,
      candidate_id integer NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
      week_start timestamp with time zone NOT NULL,
      hours_per_week integer NOT NULL DEFAULT 40,
      status text NOT NULL DEFAULT 'available',
      preferred_start text NOT NULL DEFAULT '2 weeks',
      notes text NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS placements (
      id serial PRIMARY KEY,
      candidate_id integer NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
      client_id integer,
      client_name text NOT NULL,
      role_title text NOT NULL,
      status text NOT NULL DEFAULT 'sourced',
      value_usd integer NOT NULL DEFAULT 0,
      start_date timestamp with time zone,
      notes text NOT NULL DEFAULT '',
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS interviews (
      id serial PRIMARY KEY,
      candidate_id integer NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
      placement_id integer REFERENCES placements(id) ON DELETE SET NULL,
      type text NOT NULL DEFAULT 'technical',
      scheduled_at timestamp with time zone NOT NULL,
      duration_minutes integer NOT NULL DEFAULT 60,
      outcome text NOT NULL DEFAULT 'scheduled',
      interviewer text NOT NULL DEFAULT '',
      score integer,
      feedback text NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS skill_categories (
      id serial PRIMARY KEY,
      name text NOT NULL,
      slug text NOT NULL UNIQUE,
      color text NOT NULL DEFAULT '#6366f1',
      created_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS skill_definitions (
      id serial PRIMARY KEY,
      category_id integer NOT NULL REFERENCES skill_categories(id) ON DELETE CASCADE,
      name text NOT NULL,
      slug text NOT NULL UNIQUE,
      icon text,
      created_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS skill_matrices (
      id serial PRIMARY KEY,
      candidate_id integer NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
      skill_id integer REFERENCES skill_definitions(id) ON DELETE CASCADE,
      proficiency text NOT NULL DEFAULT 'working',
      years_used integer NOT NULL DEFAULT 1,
      last_used_at timestamp with time zone NOT NULL DEFAULT now(),
      notes text NOT NULL DEFAULT ''
    );

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='skill_matrices' AND column_name='skill_id'
      ) THEN
        ALTER TABLE skill_matrices ADD COLUMN skill_id integer REFERENCES skill_definitions(id) ON DELETE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='candidates' AND column_name='search_vector'
      ) THEN
        ALTER TABLE candidates ADD COLUMN search_vector tsvector
        GENERATED ALWAYS AS (
          to_tsvector('english', coalesce(full_name, '') || ' ' || coalesce(headline, '') || ' ' || coalesce(bio, ''))
        ) STORED;
        CREATE INDEX IF NOT EXISTS candidates_search_idx ON candidates USING gin(search_vector);
      END IF;
    END $$;
  `);
}

export async function seedSkillDefinitions(): Promise<Map<string, number>> {
  await ensureSkillTables();

  const skillIdMap = new Map<string, number>();

  for (const cat of DEFAULT_SKILL_CATEGORIES) {
    let [category] = await db
      .select()
      .from(skillCategories)
      .where(eq(skillCategories.slug, cat.slug))
      .limit(1);

    if (!category) {
      const [inserted] = await db
        .insert(skillCategories)
        .values({
          name: cat.name,
          slug: cat.slug,
          color: cat.color,
        })
        .returning();
      category = inserted;
    }

    for (const s of cat.skills) {
      let [def] = await db
        .select()
        .from(skillDefinitions)
        .where(eq(skillDefinitions.slug, s.slug))
        .limit(1);

      if (!def) {
        const [insertedDef] = await db
          .insert(skillDefinitions)
          .values({
            categoryId: category.id,
            name: s.name,
            slug: s.slug,
          })
          .returning();
        def = insertedDef;
      }
      skillIdMap.set(s.slug, def.id);
    }
  }

  return skillIdMap;
}

export const DEMO_CLIENTS = [
  {
    name: "Lumen Health",
    website: "https://lumenhealth.io",
    industry: "Digital Health & Telemedicine",
    contactName: "Priya Nair",
    contactEmail: "priya@lumenhealth.io",
    logoColor: "#059669",
    contacts: [
      { name: "Priya Nair", email: "priya@lumenhealth.io", title: "VP of Engineering", isPrimary: true },
      { name: "Arjun Mehta", email: "arjun.m@lumenhealth.io", title: "Technical Recruiter", isPrimary: false },
    ],
  },
  {
    name: "Nimbus Analytics",
    website: "https://nimbusanalytics.com",
    industry: "Data Analytics & AI",
    contactName: "Diego Fernandez",
    contactEmail: "diego@nimbusanalytics.com",
    logoColor: "#3b82f6",
    contacts: [
      { name: "Diego Fernandez", email: "diego@nimbusanalytics.com", title: "Head of Infrastructure", isPrimary: true },
      { name: "Elena Rostova", email: "elena@nimbusanalytics.com", title: "Engineering Director", isPrimary: false },
    ],
  },
  {
    name: "QuantumScale",
    website: "https://quantumscale.tech",
    industry: "Distributed Systems & Cloud",
    contactName: "Sarah Klein",
    contactEmail: "sarah.k@quantumscale.tech",
    logoColor: "#8b5cf6",
    contacts: [
      { name: "Sarah Klein", email: "sarah.k@quantumscale.tech", title: "CTO", isPrimary: true },
    ],
  },
  {
    name: "Apex Logistics",
    website: "https://apexlogistics.com",
    industry: "Supply Chain & IoT",
    contactName: "Marcus Vance",
    contactEmail: "m.vance@apexlogistics.com",
    logoColor: "#f59e0b",
    contacts: [
      { name: "Marcus Vance", email: "m.vance@apexlogistics.com", title: "Director of Software", isPrimary: true },
    ],
  },
];

export async function ensurePhase2Tables() {
  await ensureSkillTables();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id serial PRIMARY KEY,
      owner_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name text NOT NULL,
      website text,
      industry text,
      contact_name text NOT NULL,
      contact_email text NOT NULL,
      logo_color text NOT NULL DEFAULT '#6366f1',
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS client_contacts (
      id serial PRIMARY KEY,
      client_id integer NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name text NOT NULL,
      email text NOT NULL,
      title text,
      is_primary boolean NOT NULL DEFAULT false,
      created_at timestamp with time zone NOT NULL DEFAULT now()
    );

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='placements' AND column_name='client_id'
      ) THEN
        ALTER TABLE placements ADD COLUMN client_id integer REFERENCES clients(id) ON DELETE SET NULL;
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS shortlists (
      id serial PRIMARY KEY,
      placement_id integer NOT NULL REFERENCES placements(id) ON DELETE CASCADE,
      client_id integer NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      shared_at timestamp with time zone NOT NULL DEFAULT now(),
      access_token text NOT NULL UNIQUE,
      expires_at timestamp with time zone NOT NULL
    );
  `);
}

export async function ensurePhase3Tables() {
  await ensurePhase2Tables();

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='candidates' AND column_name='user_id'
      ) THEN
        ALTER TABLE candidates ADD COLUMN user_id integer REFERENCES users(id) ON DELETE SET NULL;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='candidates' AND column_name='invite_token'
      ) THEN
        ALTER TABLE candidates ADD COLUMN invite_token text;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='candidates' AND column_name='invite_expires_at'
      ) THEN
        ALTER TABLE candidates ADD COLUMN invite_expires_at timestamp with time zone;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='candidates' AND column_name='magic_link_token'
      ) THEN
        ALTER TABLE candidates ADD COLUMN magic_link_token text;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='candidates' AND column_name='magic_link_expires_at'
      ) THEN
        ALTER TABLE candidates ADD COLUMN magic_link_expires_at timestamp with time zone;
      END IF;
    END $$;

    CREATE UNIQUE INDEX IF NOT EXISTS candidates_invite_token_idx ON candidates (invite_token) WHERE invite_token IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS candidates_magic_link_token_idx ON candidates (magic_link_token) WHERE magic_link_token IS NOT NULL;
  `);
}

export async function ensurePhase4Tables() {
  await ensurePhase3Tables();

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM (
          'interview_scheduled',
          'status_changed',
          'offer_received',
          'availability_changed',
          'candidate_invited',
          'resume_parsed'
        );
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS resumes (
      id serial PRIMARY KEY,
      candidate_id integer NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
      storage_key text NOT NULL,
      filename text NOT NULL,
      mime_type text NOT NULL DEFAULT 'application/pdf',
      parsed_skills jsonb NOT NULL DEFAULT '[]'::jsonb,
      parse_status text NOT NULL DEFAULT 'pending',
      uploaded_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type notification_type NOT NULL,
      title text NOT NULL,
      body text NOT NULL,
      href text,
      read boolean NOT NULL DEFAULT false,
      created_at timestamp with time zone NOT NULL DEFAULT now()
    );
  `);
}

export async function ensurePhase5Tables() {
  await ensurePhase4Tables();

  await pool.query(`
    -- Org role enum (idempotent)
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_role') THEN
        CREATE TYPE org_role AS ENUM ('owner', 'admin', 'member');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_plan') THEN
        CREATE TYPE org_plan AS ENUM ('free', 'pro', 'enterprise');
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS organizations (
      id serial PRIMARY KEY,
      name text NOT NULL,
      slug text NOT NULL,
      plan org_plan NOT NULL DEFAULT 'pro',
      logo_color text NOT NULL DEFAULT '#6366f1',
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS organizations_slug_idx ON organizations (slug);

    CREATE TABLE IF NOT EXISTS org_members (
      id serial PRIMARY KEY,
      org_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role org_role NOT NULL DEFAULT 'member',
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS org_members_org_user_idx ON org_members (org_id, user_id);

    CREATE TABLE IF NOT EXISTS org_invites (
      id serial PRIMARY KEY,
      org_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      email text NOT NULL,
      role org_role NOT NULL DEFAULT 'member',
      token text NOT NULL,
      invited_by integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at timestamp with time zone NOT NULL,
      created_at timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS org_invites_token_idx ON org_invites (token);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id serial PRIMARY KEY,
      org_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      actor_id integer REFERENCES users(id) ON DELETE SET NULL,
      actor_name text NOT NULL,
      actor_email text NOT NULL,
      target_type text NOT NULL,
      target_id integer NOT NULL,
      target_title text,
      action text NOT NULL,
      diff jsonb,
      metadata jsonb,
      created_at timestamp with time zone NOT NULL DEFAULT now()
    );

    -- Add org_id to candidates and clients (nullable, filled by backfill)
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='candidates' AND column_name='org_id'
      ) THEN
        ALTER TABLE candidates ADD COLUMN org_id integer REFERENCES organizations(id) ON DELETE SET NULL;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='clients' AND column_name='org_id'
      ) THEN
        ALTER TABLE clients ADD COLUMN org_id integer REFERENCES organizations(id) ON DELETE SET NULL;
      END IF;
    END $$;
  `);
}

/**
 * Ensures a recruiter user has at least one organisation.
 * If none exists, creates a default one named after the user and assigns them as owner.
 * Returns the user's primary org ID (their first/only org as owner).
 *
 * Slug generation: lowercased name, spaces → hyphens, strip non-alphanum,
 * then append "-{random4}" if slug already taken.
 */
export async function ensureUserHasOrg(userId: number, userName: string): Promise<number> {
  await ensurePhase5Tables();

  // Check if user already has org membership
  const existing = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(eq(orgMembers.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    // Backfill any unassigned records
    await pool.query(
      `UPDATE candidates SET org_id = $1 WHERE owner_id = $2 AND org_id IS NULL`,
      [existing[0].orgId, userId]
    );
    await pool.query(
      `UPDATE clients SET org_id = $1 WHERE owner_id = $2 AND org_id IS NULL`,
      [existing[0].orgId, userId]
    );
    return existing[0].orgId;
  }

  // Create default org
  const baseSlug = (userName || "Recruiter")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40) || "agency";

  let slug = baseSlug;
  const [slugConflict] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  if (slugConflict) {
    const suffix = Math.random().toString(36).slice(2, 6);
    slug = `${baseSlug}-${suffix}`;
  }

  const [org] = await db
    .insert(organizations)
    .values({
      name: `${userName}'s Agency`,
      slug,
      plan: "pro",
    })
    .returning();

  await db.insert(orgMembers).values({
    orgId: org.id,
    userId,
    role: "owner",
  });

  // Backfill existing candidates and clients
  await pool.query(
    `UPDATE candidates SET org_id = $1 WHERE owner_id = $2 AND org_id IS NULL`,
    [org.id, userId]
  );
  await pool.query(
    `UPDATE clients SET org_id = $1 WHERE owner_id = $2 AND org_id IS NULL`,
    [org.id, userId]
  );

  return org.id;
}

export async function seedClientsIfEmpty(ownerId: number) {
  await ensurePhase5Tables();

  const existingClients = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(eq(clients.ownerId, ownerId));

  const clientMap = new Map<string, number>();

  if (existingClients.length === 0) {
    for (const dc of DEMO_CLIENTS) {
      const [inserted] = await db
        .insert(clients)
        .values({
          ownerId,
          name: dc.name,
          website: dc.website,
          industry: dc.industry,
          contactName: dc.contactName,
          contactEmail: dc.contactEmail,
          logoColor: dc.logoColor,
        })
        .returning();

      clientMap.set(dc.name.toLowerCase(), inserted.id);

      for (const contact of dc.contacts) {
        await db.insert(clientContacts).values({
          clientId: inserted.id,
          name: contact.name,
          email: contact.email,
          title: contact.title,
          isPrimary: contact.isPrimary,
        });
      }
    }
  } else {
    for (const c of existingClients) {
      clientMap.set(c.name.toLowerCase(), c.id);
    }
  }

  // Backfill placements without clientId if clientName matches
  const unlinkedPlacements = await db
    .select({ id: placements.id, clientName: placements.clientName, clientId: placements.clientId })
    .from(placements)
    .where(sql`${placements.clientId} IS NULL`);

  for (const pl of unlinkedPlacements) {
    const matchedId = clientMap.get(pl.clientName.toLowerCase());
    if (matchedId) {
      await db
        .update(placements)
        .set({ clientId: matchedId })
        .where(eq(placements.id, pl.id));
    }
  }
}

export async function seedDatabase() {
  const skillIdMap = await seedSkillDefinitions();
  await ensurePhase5Tables();

  const existing = await db.execute(sql`select count(*)::int as c from users`);
  const count = (existing.rows[0] as { c: number }).c;
  if (count > 0) {
    const [firstUser] = await db.select({ id: users.id, name: users.name }).from(users).limit(1);
    if (firstUser) {
      await seedClientsIfEmpty(firstUser.id);
      await ensureUserHasOrg(firstUser.id, firstUser.name);
    }
    return { skipped: true, message: "Database already seeded. Ensured phase 2, 3, 4 & 5 tables, orgs & clients." };
  }

  const [recruiter] = await db
    .insert(users)
    .values({
      email: DEMO_RECRUITER.email,
      passwordHash: hashPassword(DEMO_RECRUITER.password),
      name: DEMO_RECRUITER.name,
      role: DEMO_RECRUITER.role,
      avatarColor: pickColor(DEMO_RECRUITER.email),
    })
    .returning();

  const orgId = await ensureUserHasOrg(recruiter.id, recruiter.name);

  await seedClientsIfEmpty(recruiter.id);
  const existingClients = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(eq(clients.ownerId, recruiter.id));
  const clientMap = new Map<string, number>();
  for (const cl of existingClients) {
    clientMap.set(cl.name.toLowerCase(), cl.id);
  }

  for (const c of DEMO_CANDIDATES) {
    const [created] = await db
      .insert(candidates)
      .values({
        ownerId: recruiter.id,
        orgId,
        fullName: c.fullName,
        headline: c.headline,
        email: c.email,
        phone: c.phone,
        location: c.location,
        region: c.region,
        timezone: c.timezone,
        timezoneOverlap: c.timezoneOverlap,
        seniority: c.seniority,
        yearsExperience: c.yearsExperience,
        hourlyRateUsd: c.hourlyRateUsd,
        verification: c.verification,
        bio: c.bio,
        portfolioUrl: c.portfolioUrl,
        githubUrl: c.githubUrl,
        linkedinUrl: c.linkedinUrl,
        tags: c.tags,
        avatarColor: pickColor(c.email),
      })
      .returning();

    for (const skill of c.skills) {
      const skillId = skillIdMap.get(skill.slug);
      if (skillId) {
        await db.insert(skillMatrices).values({
          candidateId: created.id,
          skillId,
          proficiency: skill.proficiency,
          yearsUsed: skill.yearsUsed,
          notes: skill.notes ?? "",
        });
      }
    }

    const weekStart = new Date();
    weekStart.setUTCHours(0, 0, 0, 0);
    const day = weekStart.getUTCDay();
    const diff = (1 + 7 - day) % 7 || 7;
    weekStart.setUTCDate(weekStart.getUTCDate() - diff);

    await db.insert(availabilities).values({
      candidateId: created.id,
      weekStart,
      hoursPerWeek: c.availability.hoursPerWeek,
      status: c.availability.status,
      preferredStart: c.availability.preferredStart,
      notes: c.availability.notes ?? "",
    });

    for (const p of c.placements) {
      const matchedClientId = clientMap.get(p.clientName.toLowerCase()) ?? null;
      const [placement] = await db
        .insert(placements)
        .values({
          candidateId: created.id,
          clientId: matchedClientId,
          clientName: p.clientName,
          roleTitle: p.roleTitle,
          status: p.status,
          valueUsd: p.valueUsd,
          startDate: p.startDate,
          notes: p.notes ?? "",
        })
        .returning();

      for (const it of p.interviews) {
        await db.insert(interviews).values({
          candidateId: created.id,
          placementId: placement.id,
          type: it.type,
          scheduledAt: it.scheduledAt,
          durationMinutes: it.durationMinutes,
          outcome: it.outcome,
          interviewer: it.interviewer,
          score: it.score,
          feedback: it.feedback ?? "",
        });
      }
    }
  }

  return {
    skipped: false,
    message: `Seeded ${DEMO_CANDIDATES.length} candidates and clients for ${recruiter.email}.`,
  };
}

