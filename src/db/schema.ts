import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  bigint,
  char,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

// --- Enum types ---

export const userRole = pgEnum("user_role", ["admin", "member"]);
export const postType = pgEnum("post_type", ["image", "video", "pdf", "audio"]);
export const subscriptionStatus = pgEnum("subscription_status", [
  "active",
  "past_due",
  "canceled",
  "incomplete",
]);
export const webhookStatus = pgEnum("webhook_status", [
  "received",
  "processed",
  "failed",
  "skipped",
]);

// --- user_account ---

export const userAccount = pgTable("user_account", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  clerkUserId: text("clerk_user_id").unique(),
  email: text("email").notNull().unique(),
  role: userRole("role").notNull().default("member"),
  paymentCustomerId: text("payment_customer_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// --- curator_profile (1:1 with user_account, only when role = 'curator') ---

export const curatorProfile = pgTable("curator_profile", {
  userAccountId: uuid("user_account_id")
    .primaryKey()
    .references(() => userAccount.id, { onDelete: "restrict" }),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  monthlyPriceCents: integer("monthly_price_cents"),
  currency: char("currency", { length: 3 }).notNull().default("BRL"),
  payoutAccountId: text("payout_account_id"),
  planId: text("plan_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// --- board ---

export const board = pgTable(
  "board",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    curatorId: uuid("curator_id")
      .notNull()
      .references(() => userAccount.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description"),
    coverUrl: text("cover_url"),
    isPublished: boolean("is_published").notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_board_curator_id").on(t.curatorId),
    index("idx_board_curator_published")
      .on(t.curatorId, t.isPublished)
      .where(sql`${t.deletedAt} is null`),
    index("idx_board_published_lookup")
      .on(t.id)
      .where(sql`${t.isPublished} = true and ${t.deletedAt} is null`),
  ]
);

// --- post (one post = one media file) ---

export const post = pgTable(
  "post",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    boardId: uuid("board_id")
      .notNull()
      .references(() => board.id, { onDelete: "cascade" }),
    curatorId: uuid("curator_id")
      .notNull()
      .references(() => userAccount.id, { onDelete: "restrict" }),
    type: postType("type").notNull(),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    title: text("title").notNull(),
    description: text("description"),
    position: integer("position").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_post_board_id").on(t.boardId).where(sql`${t.deletedAt} is null`),
    index("idx_post_curator_id").on(t.curatorId).where(sql`${t.deletedAt} is null`),
    index("idx_post_board_published")
      .on(t.boardId, t.isPublished, t.position)
      .where(sql`${t.deletedAt} is null`),
  ]
);

// --- subscription (local cache of provider state, no soft delete) ---

export const subscription = pgTable(
  "subscription",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    subscriberId: uuid("subscriber_id")
      .notNull()
      .references(() => userAccount.id, { onDelete: "restrict" }),
    curatorId: uuid("curator_id")
      .notNull()
      .references(() => userAccount.id, { onDelete: "restrict" }),
    provider: text("provider").notNull(),
    providerSubscriptionId: text("provider_subscription_id").notNull(),
    status: subscriptionStatus("status").notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_subscription_active_pair")
      .on(t.subscriberId, t.curatorId)
      .where(sql`${t.status} = 'active'`),
    uniqueIndex("uq_subscription_provider_id").on(t.provider, t.providerSubscriptionId),
    index("idx_subscription_subscriber").on(t.subscriberId, t.status),
    index("idx_subscription_access_check").on(
      t.subscriberId,
      t.curatorId,
      t.status,
      t.currentPeriodEnd
    ),
  ]
);

// --- webhook_event (idempotency log, independent table) ---

export const webhookEvent = pgTable(
  "webhook_event",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    provider: text("provider").notNull(),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    status: webhookStatus("status").notNull().default("received"),
    error: text("error"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("uq_webhook_provider_event").on(t.provider, t.eventId),
    index("idx_webhook_event_provider_received").on(t.provider, sql`${t.receivedAt} desc`),
    index("idx_webhook_event_status").on(t.status).where(sql`${t.status} = 'failed'`),
  ]
);

// --- category (admin-managed taxonomy) ---

export const category = pgTable("category", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- board_category (many-to-many join) ---

export const boardCategory = pgTable(
  "board_category",
  {
    boardId: uuid("board_id")
      .notNull()
      .references(() => board.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.boardId, t.categoryId] }),
    index("idx_board_category_category").on(t.categoryId),
  ]
);