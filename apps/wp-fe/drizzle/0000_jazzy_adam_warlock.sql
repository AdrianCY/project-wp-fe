CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."flow_status" AS ENUM('draft', 'published', 'deprecated');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('pending', 'sent', 'delivered', 'read', 'failed');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('text', 'image', 'video', 'audio', 'document', 'sticker', 'location', 'contacts', 'interactive', 'template', 'reaction', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."phone_number_status" AS ENUM('pending', 'verified', 'unverified');--> statement-breakpoint
CREATE TYPE "public"."quality_rating" AS ENUM('green', 'yellow', 'red', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('subscribed', 'unsubscribed', 'pending');--> statement-breakpoint
CREATE TYPE "public"."template_category" AS ENUM('utility', 'marketing', 'authentication');--> statement-breakpoint
CREATE TYPE "public"."template_status" AS ENUM('pending', 'approved', 'rejected', 'paused', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."waba_status" AS ENUM('pending', 'connected', 'disconnected', 'suspended');--> statement-breakpoint
CREATE TABLE "campaign_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"message_id" uuid,
	"status" "message_status" DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"failed_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"phone_number_id" uuid NOT NULL,
	"template_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"total_recipients" integer DEFAULT 0,
	"sent_count" integer DEFAULT 0,
	"delivered_count" integer DEFAULT 0,
	"read_count" integer DEFAULT 0,
	"failed_count" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "contact_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"status" "subscription_status" DEFAULT 'subscribed' NOT NULL,
	"subscribed_at" timestamp DEFAULT now(),
	"unsubscribed_at" timestamp,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(7),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"wa_id" varchar(50),
	"name" varchar(255),
	"email" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "contacts_to_tags" (
	"contact_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"contact_id" uuid NOT NULL,
	"phone_number_id" uuid NOT NULL,
	"last_message_at" timestamp,
	"window_expires_at" timestamp,
	"is_open" boolean DEFAULT true NOT NULL,
	"assigned_to_user_id" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flow_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flow_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"conversation_id" uuid,
	"response_data" jsonb,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"waba_id" uuid NOT NULL,
	"flow_id" varchar(255),
	"name" varchar(255) NOT NULL,
	"status" "flow_status" DEFAULT 'draft' NOT NULL,
	"flow_json" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "flows_flow_id_unique" UNIQUE("flow_id")
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"waba_id" uuid NOT NULL,
	"template_id" varchar(255),
	"name" varchar(255) NOT NULL,
	"language" varchar(10) NOT NULL,
	"category" "template_category" NOT NULL,
	"status" "template_status" DEFAULT 'pending' NOT NULL,
	"components" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"wamid" varchar(255),
	"direction" "message_direction" NOT NULL,
	"type" "message_type" NOT NULL,
	"content" jsonb,
	"status" "message_status" DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"failed_at" timestamp,
	"error_code" varchar(50),
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "messages_wamid_unique" UNIQUE("wamid")
);
--> statement-breakpoint
CREATE TABLE "phone_numbers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"waba_id" uuid NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"display_phone_number" varchar(30),
	"display_name" varchar(255),
	"quality_rating" "quality_rating" DEFAULT 'unknown',
	"status" "phone_number_status" DEFAULT 'pending' NOT NULL,
	"phone_number_id" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "phone_numbers_phone_number_id_unique" UNIQUE("phone_number_id")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_business_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"waba_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" "waba_status" DEFAULT 'pending' NOT NULL,
	"access_token" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "whatsapp_business_accounts_waba_id_unique" UNIQUE("waba_id")
);
--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_phone_number_id_phone_numbers_id_fk" FOREIGN KEY ("phone_number_id") REFERENCES "public"."phone_numbers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_template_id_message_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."message_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_subscriptions" ADD CONSTRAINT "contact_subscriptions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts_to_tags" ADD CONSTRAINT "contacts_to_tags_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts_to_tags" ADD CONSTRAINT "contacts_to_tags_tag_id_contact_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."contact_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_phone_number_id_phone_numbers_id_fk" FOREIGN KEY ("phone_number_id") REFERENCES "public"."phone_numbers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_responses" ADD CONSTRAINT "flow_responses_flow_id_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."flows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_responses" ADD CONSTRAINT "flow_responses_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_responses" ADD CONSTRAINT "flow_responses_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flows" ADD CONSTRAINT "flows_waba_id_whatsapp_business_accounts_id_fk" FOREIGN KEY ("waba_id") REFERENCES "public"."whatsapp_business_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_waba_id_whatsapp_business_accounts_id_fk" FOREIGN KEY ("waba_id") REFERENCES "public"."whatsapp_business_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phone_numbers" ADD CONSTRAINT "phone_numbers_waba_id_whatsapp_business_accounts_id_fk" FOREIGN KEY ("waba_id") REFERENCES "public"."whatsapp_business_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recipient_campaign_idx" ON "campaign_recipients" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "recipient_contact_idx" ON "campaign_recipients" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "recipient_status_idx" ON "campaign_recipients" USING btree ("status");--> statement-breakpoint
CREATE INDEX "campaign_org_idx" ON "campaigns" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "campaign_status_idx" ON "campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "campaign_scheduled_idx" ON "campaigns" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "subscription_contact_idx" ON "contact_subscriptions" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "subscription_status_idx" ON "contact_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tag_org_idx" ON "contact_tags" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "contact_org_idx" ON "contacts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "contact_phone_idx" ON "contacts" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "contact_org_phone_idx" ON "contacts" USING btree ("organization_id","phone_number");--> statement-breakpoint
CREATE INDEX "contact_tag_idx" ON "contacts_to_tags" USING btree ("contact_id","tag_id");--> statement-breakpoint
CREATE INDEX "conv_org_idx" ON "conversations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "conv_contact_idx" ON "conversations" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "conv_phone_idx" ON "conversations" USING btree ("phone_number_id");--> statement-breakpoint
CREATE INDEX "conv_open_idx" ON "conversations" USING btree ("is_open");--> statement-breakpoint
CREATE INDEX "conv_assigned_idx" ON "conversations" USING btree ("assigned_to_user_id");--> statement-breakpoint
CREATE INDEX "flow_response_flow_idx" ON "flow_responses" USING btree ("flow_id");--> statement-breakpoint
CREATE INDEX "flow_response_contact_idx" ON "flow_responses" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "flow_org_idx" ON "flows" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "flow_waba_idx" ON "flows" USING btree ("waba_id");--> statement-breakpoint
CREATE INDEX "flow_status_idx" ON "flows" USING btree ("status");--> statement-breakpoint
CREATE INDEX "template_org_idx" ON "message_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "template_waba_idx" ON "message_templates" USING btree ("waba_id");--> statement-breakpoint
CREATE INDEX "template_status_idx" ON "message_templates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "template_name_idx" ON "message_templates" USING btree ("name");--> statement-breakpoint
CREATE INDEX "msg_conv_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "msg_wamid_idx" ON "messages" USING btree ("wamid");--> statement-breakpoint
CREATE INDEX "msg_status_idx" ON "messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "msg_direction_idx" ON "messages" USING btree ("direction");--> statement-breakpoint
CREATE INDEX "msg_created_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "phone_waba_idx" ON "phone_numbers" USING btree ("waba_id");--> statement-breakpoint
CREATE INDEX "phone_number_idx" ON "phone_numbers" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "waba_org_idx" ON "whatsapp_business_accounts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "waba_status_idx" ON "whatsapp_business_accounts" USING btree ("status");