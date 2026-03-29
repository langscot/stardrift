CREATE TABLE "guild_systems" (
	"guild_id" varchar(20) NOT NULL,
	"system_id" integer NOT NULL,
	"is_proxy" boolean DEFAULT false NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"added_by_user_id" varchar(20),
	CONSTRAINT "guild_systems_guild_id_system_id_pk" PRIMARY KEY("guild_id","system_id")
);
--> statement-breakpoint
ALTER TABLE "system_channels" ADD COLUMN "guild_id" varchar(20);--> statement-breakpoint
ALTER TABLE "guild_systems" ADD CONSTRAINT "guild_systems_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "guild_systems_guild_idx" ON "guild_systems" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "guild_systems_system_idx" ON "guild_systems" USING btree ("system_id");