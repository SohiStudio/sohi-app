CREATE TYPE "public"."post_type" AS ENUM('image', 'video', 'pdf', 'audio');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'past_due', 'canceled', 'incomplete');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."webhook_status" AS ENUM('received', 'processed', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE "board" (
	"id" uuid PRIMARY KEY NOT NULL,
	"curator_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"cover_url" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "board_category" (
	"board_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "board_category_board_id_category_id_pk" PRIMARY KEY("board_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "curator_profile" (
	"user_account_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"bio" text,
	"avatar_url" text,
	"monthly_price_cents" integer,
	"currency" char(3) DEFAULT 'BRL' NOT NULL,
	"payout_account_id" text,
	"plan_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "post" (
	"id" uuid PRIMARY KEY NOT NULL,
	"board_id" uuid NOT NULL,
	"curator_id" uuid NOT NULL,
	"type" "post_type" NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" uuid PRIMARY KEY NOT NULL,
	"subscriber_id" uuid NOT NULL,
	"curator_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_subscription_id" text NOT NULL,
	"status" "subscription_status" NOT NULL,
	"current_period_end" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_account" (
	"id" uuid PRIMARY KEY NOT NULL,
	"clerk_user_id" text,
	"email" text NOT NULL,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"payment_customer_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "user_account_clerk_user_id_unique" UNIQUE("clerk_user_id"),
	CONSTRAINT "user_account_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "webhook_event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "webhook_status" DEFAULT 'received' NOT NULL,
	"error" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "board" ADD CONSTRAINT "board_curator_id_user_account_id_fk" FOREIGN KEY ("curator_id") REFERENCES "public"."user_account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_category" ADD CONSTRAINT "board_category_board_id_board_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."board"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_category" ADD CONSTRAINT "board_category_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curator_profile" ADD CONSTRAINT "curator_profile_user_account_id_user_account_id_fk" FOREIGN KEY ("user_account_id") REFERENCES "public"."user_account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_board_id_board_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."board"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_curator_id_user_account_id_fk" FOREIGN KEY ("curator_id") REFERENCES "public"."user_account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_subscriber_id_user_account_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."user_account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_curator_id_user_account_id_fk" FOREIGN KEY ("curator_id") REFERENCES "public"."user_account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_board_curator_id" ON "board" USING btree ("curator_id");--> statement-breakpoint
CREATE INDEX "idx_board_curator_published" ON "board" USING btree ("curator_id","is_published") WHERE "board"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_board_published_lookup" ON "board" USING btree ("id") WHERE "board"."is_published" = true and "board"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_board_category_category" ON "board_category" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_post_board_id" ON "post" USING btree ("board_id") WHERE "post"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_post_curator_id" ON "post" USING btree ("curator_id") WHERE "post"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "idx_post_board_published" ON "post" USING btree ("board_id","is_published","position") WHERE "post"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_subscription_active_pair" ON "subscription" USING btree ("subscriber_id","curator_id") WHERE "subscription"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "uq_subscription_provider_id" ON "subscription" USING btree ("provider","provider_subscription_id");--> statement-breakpoint
CREATE INDEX "idx_subscription_subscriber" ON "subscription" USING btree ("subscriber_id","status");--> statement-breakpoint
CREATE INDEX "idx_subscription_access_check" ON "subscription" USING btree ("subscriber_id","curator_id","status","current_period_end");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_webhook_provider_event" ON "webhook_event" USING btree ("provider","event_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_event_provider_received" ON "webhook_event" USING btree ("provider","received_at" desc);--> statement-breakpoint
CREATE INDEX "idx_webhook_event_status" ON "webhook_event" USING btree ("status") WHERE "webhook_event"."status" = 'failed';