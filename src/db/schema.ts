import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------- Enums ----------

export const roleEnum = pgEnum("user_role", ["recruiter", "candidate", "admin"]);
export const verificationEnum = pgEnum("verification_status", [
  "unverified",
  "pending",
  "verified",
  "rejected",
]);
export const seniorityEnum = pgEnum("seniority", [
  "junior",
  "mid",
  "senior",
  "staff",
  "principal",
]);
export const frameworkEnum = pgEnum("framework", [
  "react",
  "angular",
  "vue",
  "svelte",
  "nextjs",
  "nuxt",
  "typescript",
  "javascript",
]);
export const proficiencyEnum = pgEnum("proficiency", [
  "learning",
  "working",
  "strong",
  "expert",
]);
export const milestoneStatusEnum = pgEnum("milestone_status", [
  "sourced",
  "screening",
  "submitted",
  "interviewing",
  "offer",
  "placed",
  "archived",
]);
export const interviewTypeEnum = pgEnum("interview_type", [
  "screen",
  "technical",
  "system-design",
  "behavioral",
  "final",
]);
export const interviewOutcomeEnum = pgEnum("interview_outcome", [
  "scheduled",
  "passed",
  "failed",
  "no-show",
  "rescheduled",
]);
export const availabilityStatusEnum = pgEnum("availability_status", [
  "available",
  "limited",
  "booked",
  "on-leave",
]);
export const regionEnum = pgEnum("region", ["us", "ca", "uk", "eu", "other"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "interview_scheduled",
  "status_changed",
  "offer_received",
  "availability_changed",
  "candidate_invited",
  "resume_parsed",
]);
export const orgRoleEnum = pgEnum("org_role", ["owner", "admin", "member"]);
export const orgPlanEnum = pgEnum("org_plan", ["free", "pro", "enterprise"]);

// ---------- Tables ----------

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    role: roleEnum("role").notNull().default("recruiter"),
    avatarColor: text("avatar_color").notNull().default("#6366f1"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
  })
);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const organizations = pgTable(
  "organizations",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    plan: orgPlanEnum("plan").notNull().default("pro"),
    logoColor: text("logo_color").notNull().default("#6366f1"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("organizations_slug_idx").on(t.slug),
  })
);

export const orgMembers = pgTable(
  "org_members",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: orgRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    orgUserIdx: uniqueIndex("org_members_org_user_idx").on(t.orgId, t.userId),
  })
);

export const orgInvites = pgTable(
  "org_invites",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: orgRoleEnum("role").notNull().default("member"),
    token: text("token").notNull(),
    invitedBy: integer("invited_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tokenIdx: uniqueIndex("org_invites_token_idx").on(t.token),
  })
);

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  actorId: integer("actor_id").references(() => users.id, {
    onDelete: "set null",
  }),
  actorName: text("actor_name").notNull(),
  actorEmail: text("actor_email").notNull(),
  targetType: text("target_type").notNull(), // candidate | placement | client | interview | member | organization | shortlist
  targetId: integer("target_id").notNull(),
  targetTitle: text("target_title"),
  action: text("action").notNull(), // create | update | delete | status_change | verify | invite_member | remove_member | role_change | export
  diff: jsonb("diff").$type<{
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    changedKeys: string[];
  } | null>(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const candidates = pgTable(
  "candidates",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orgId: integer("org_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    inviteToken: text("invite_token"),
    inviteExpiresAt: timestamp("invite_expires_at", { withTimezone: true }),
    magicLinkToken: text("magic_link_token"),
    magicLinkExpiresAt: timestamp("magic_link_expires_at", {
      withTimezone: true,
    }),
    fullName: text("full_name").notNull(),
    headline: text("headline").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    location: text("location").notNull(),
    region: regionEnum("region").notNull().default("us"),
    timezone: text("timezone").notNull(),
    timezoneOverlap: text("timezone_overlap").notNull(), // e.g. "PST ±3h"
    seniority: seniorityEnum("seniority").notNull().default("mid"),
    yearsExperience: integer("years_experience").notNull().default(3),
    hourlyRateUsd: integer("hourly_rate_usd").notNull().default(80),
    verification: verificationEnum("verification").notNull().default("pending"),
    bio: text("bio").notNull().default(""),
    portfolioUrl: text("portfolio_url"),
    githubUrl: text("github_url"),
    linkedinUrl: text("linkedin_url"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    avatarColor: text("avatar_color").notNull().default("#6366f1"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    inviteTokenIdx: uniqueIndex("candidates_invite_token_idx").on(
      t.inviteToken
    ),
    magicLinkTokenIdx: uniqueIndex("candidates_magic_link_token_idx").on(
      t.magicLinkToken
    ),
  })
);

export const skillCategories = pgTable(
  "skill_categories",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    color: text("color").notNull().default("#6366f1"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("skill_categories_slug_idx").on(t.slug),
  })
);

export const skillDefinitions = pgTable(
  "skill_definitions",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => skillCategories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    icon: text("icon"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("skill_definitions_slug_idx").on(t.slug),
  })
);

export const skillMatrices = pgTable("skill_matrices", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  skillId: integer("skill_id")
    .notNull()
    .references(() => skillDefinitions.id, { onDelete: "cascade" }),
  proficiency: proficiencyEnum("proficiency").notNull(),
  yearsUsed: integer("years_used").notNull().default(1),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  notes: text("notes").notNull().default(""),
});

export const availabilities = pgTable("availabilities", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  weekStart: timestamp("week_start", { withTimezone: true }).notNull(),
  hoursPerWeek: integer("hours_per_week").notNull().default(40),
  status: availabilityStatusEnum("status").notNull().default("available"),
  preferredStart: text("preferred_start").notNull().default("2 weeks"),
  notes: text("notes").notNull().default(""),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  orgId: integer("org_id").references(() => organizations.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  website: text("website"),
  industry: text("industry"),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  logoColor: text("logo_color").notNull().default("#6366f1"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const clientContacts = pgTable("client_contacts", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  title: text("title"),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const placements = pgTable("placements", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  clientId: integer("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  clientName: text("client_name").notNull(),
  roleTitle: text("role_title").notNull(),
  status: milestoneStatusEnum("status").notNull().default("sourced"),
  valueUsd: integer("value_usd").notNull().default(0),
  startDate: timestamp("start_date", { withTimezone: true }),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const shortlists = pgTable(
  "shortlists",
  {
    id: serial("id").primaryKey(),
    placementId: integer("placement_id")
      .notNull()
      .references(() => placements.id, { onDelete: "cascade" }),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    sharedAt: timestamp("shared_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    accessToken: text("access_token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    tokenIdx: uniqueIndex("shortlists_access_token_idx").on(t.accessToken),
  })
);

export const interviews = pgTable("interviews", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  placementId: integer("placement_id").references(() => placements.id, {
    onDelete: "set null",
  }),
  type: interviewTypeEnum("type").notNull().default("technical"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  outcome: interviewOutcomeEnum("outcome").notNull().default("scheduled"),
  interviewer: text("interviewer").notNull().default(""),
  score: integer("score"),
  feedback: text("feedback").notNull().default(""),
});

export const resumes = pgTable("resumes", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull().default("application/pdf"),
  parsedSkills: jsonb("parsed_skills").$type<string[]>().notNull().default([]),
  parseStatus: text("parse_status").notNull().default("pending"), // pending | done | failed
  uploadedAt: timestamp("uploaded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  href: text("href"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------- Relations ----------

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(orgMembers),
  invites: many(orgInvites),
  auditLogs: many(auditLogs),
  candidates: many(candidates),
  clients: many(clients),
}));

export const orgMembersRelations = relations(orgMembers, ({ one }) => ({
  org: one(organizations, {
    fields: [orgMembers.orgId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [orgMembers.userId],
    references: [users.id],
  }),
}));

export const orgInvitesRelations = relations(orgInvites, ({ one }) => ({
  org: one(organizations, {
    fields: [orgInvites.orgId],
    references: [organizations.id],
  }),
  inviter: one(users, {
    fields: [orgInvites.invitedBy],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  org: one(organizations, {
    fields: [auditLogs.orgId],
    references: [organizations.id],
  }),
  actor: one(users, {
    fields: [auditLogs.actorId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  candidates: many(candidates),
  sessions: many(sessions),
  clients: many(clients),
  notifications: many(notifications),
  orgMemberships: many(orgMembers),
  sentInvites: many(orgInvites),
  candidateProfile: one(candidates, {
    fields: [users.id],
    references: [candidates.userId],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const candidatesRelations = relations(candidates, ({ one, many }) => ({
  owner: one(users, {
    fields: [candidates.ownerId],
    references: [users.id],
  }),
  org: one(organizations, {
    fields: [candidates.orgId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [candidates.userId],
    references: [users.id],
  }),
  skills: many(skillMatrices),
  availability: many(availabilities),
  placements: many(placements),
  interviews: many(interviews),
  resumes: many(resumes),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  owner: one(users, {
    fields: [clients.ownerId],
    references: [users.id],
  }),
  org: one(organizations, {
    fields: [clients.orgId],
    references: [organizations.id],
  }),
  contacts: many(clientContacts),
  placements: many(placements),
  shortlists: many(shortlists),
}));

export const clientContactsRelations = relations(clientContacts, ({ one }) => ({
  client: one(clients, {
    fields: [clientContacts.clientId],
    references: [clients.id],
  }),
}));

export const skillCategoriesRelations = relations(skillCategories, ({ many }) => ({
  definitions: many(skillDefinitions),
}));

export const skillDefinitionsRelations = relations(skillDefinitions, ({ one, many }) => ({
  category: one(skillCategories, {
    fields: [skillDefinitions.categoryId],
    references: [skillCategories.id],
  }),
  matrices: many(skillMatrices),
}));

export const skillMatricesRelations = relations(skillMatrices, ({ one }) => ({
  candidate: one(candidates, {
    fields: [skillMatrices.candidateId],
    references: [candidates.id],
  }),
  skill: one(skillDefinitions, {
    fields: [skillMatrices.skillId],
    references: [skillDefinitions.id],
  }),
}));

export const availabilitiesRelations = relations(availabilities, ({ one }) => ({
  candidate: one(candidates, {
    fields: [availabilities.candidateId],
    references: [candidates.id],
  }),
}));

export const placementsRelations = relations(placements, ({ one, many }) => ({
  candidate: one(candidates, {
    fields: [placements.candidateId],
    references: [candidates.id],
  }),
  client: one(clients, {
    fields: [placements.clientId],
    references: [clients.id],
  }),
  interviews: many(interviews),
  shortlists: many(shortlists),
}));

export const shortlistsRelations = relations(shortlists, ({ one }) => ({
  placement: one(placements, {
    fields: [shortlists.placementId],
    references: [placements.id],
  }),
  client: one(clients, {
    fields: [shortlists.clientId],
    references: [clients.id],
  }),
}));

export const interviewsRelations = relations(interviews, ({ one }) => ({
  candidate: one(candidates, {
    fields: [interviews.candidateId],
    references: [candidates.id],
  }),
  placement: one(placements, {
    fields: [interviews.placementId],
    references: [placements.id],
  }),
}));

export const resumesRelations = relations(resumes, ({ one }) => ({
  candidate: one(candidates, {
    fields: [resumes.candidateId],
    references: [candidates.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// ---------- Types ----------

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type OrgMember = typeof orgMembers.$inferSelect;
export type NewOrgMember = typeof orgMembers.$inferInsert;
export type OrgInvite = typeof orgInvites.$inferSelect;
export type NewOrgInvite = typeof orgInvites.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type Candidate = typeof candidates.$inferSelect;
export type NewCandidate = typeof candidates.$inferInsert;
export type SkillCategory = typeof skillCategories.$inferSelect;
export type NewSkillCategory = typeof skillCategories.$inferInsert;
export type SkillDefinition = typeof skillDefinitions.$inferSelect;
export type NewSkillDefinition = typeof skillDefinitions.$inferInsert;
export type SkillMatrix = typeof skillMatrices.$inferSelect;
export type NewSkillMatrix = typeof skillMatrices.$inferInsert;
export type Availability = typeof availabilities.$inferSelect;
export type NewAvailability = typeof availabilities.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type ClientContact = typeof clientContacts.$inferSelect;
export type NewClientContact = typeof clientContacts.$inferInsert;
export type Placement = typeof placements.$inferSelect;
export type NewPlacement = typeof placements.$inferInsert;
export type Shortlist = typeof shortlists.$inferSelect;
export type NewShortlist = typeof shortlists.$inferInsert;
export type Interview = typeof interviews.$inferSelect;
export type NewInterview = typeof interviews.$inferInsert;
export type Resume = typeof resumes.$inferSelect;
export type NewResume = typeof resumes.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

