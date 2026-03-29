CREATE TABLE "admin_totp_secrets" (
	"user_id" varchar(20) PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bans" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" varchar(20) NOT NULL,
	"banned_by" varchar(20) NOT NULL,
	"reason" text,
	"banned_at" timestamp DEFAULT now() NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"unbanned_by" varchar(20),
	"unbanned_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "players" ALTER COLUMN "cargo_capacity" SET DEFAULT 1000;--> statement-breakpoint
ALTER TABLE "system_channels" ALTER COLUMN "guild_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "bans" ADD CONSTRAINT "bans_player_id_players_user_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("user_id") ON DELETE no action ON UPDATE no action;