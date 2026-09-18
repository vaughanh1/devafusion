CREATE TYPE "public"."mfa_frequency" AS ENUM('always', '30_days');--> statement-breakpoint
CREATE TABLE "auth_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"performed_by" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backup_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"hashed_code" text NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trusted_devices" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"device_label" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_security" ADD COLUMN "required_factors" text[] DEFAULT ARRAY['password', 'totp']::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "user_security" ADD COLUMN "mfa_frequency" "mfa_frequency" DEFAULT 'always' NOT NULL;--> statement-breakpoint
ALTER TABLE "backup_codes" ADD CONSTRAINT "backup_codes_user_id_user_security_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_security"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trusted_devices" ADD CONSTRAINT "trusted_devices_user_id_user_security_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_security"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_audit_logs_userId_idx" ON "auth_audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "backup_codes_userId_idx" ON "backup_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trusted_devices_userId_idx" ON "trusted_devices" USING btree ("user_id");