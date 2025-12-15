ALTER TABLE "session" ADD COLUMN "ws_secret_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "template_id_waba_id_unique" ON "message_templates" USING btree ("template_id","waba_id");--> statement-breakpoint
ALTER TABLE "whatsapp_business_accounts" DROP COLUMN "access_token";