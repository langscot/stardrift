CREATE TABLE "active_travels" (
	"player_id" varchar(20) PRIMARY KEY NOT NULL,
	"from_system_id" integer NOT NULL,
	"to_system_id" integer NOT NULL,
	"departed_at" timestamp DEFAULT now() NOT NULL,
	"arrives_at" timestamp NOT NULL,
	"fuel_cost" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asteroid_belts" (
	"id" serial PRIMARY KEY NOT NULL,
	"system_id" integer NOT NULL,
	"name" varchar(64) NOT NULL,
	"richness" smallint NOT NULL,
	"channel_id" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" varchar(20) NOT NULL,
	"item_type" varchar(32) NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"storage_type" varchar(10) NOT NULL,
	"system_id" integer
);
--> statement-breakpoint
CREATE TABLE "item_types" (
	"key" varchar(32) PRIMARY KEY NOT NULL,
	"display_name" varchar(64) NOT NULL,
	"category" varchar(20) NOT NULL,
	"base_price" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "npc_sell_ledger" (
	"system_id" integer NOT NULL,
	"item_type" varchar(32) NOT NULL,
	"total_sold" bigint DEFAULT 0 NOT NULL,
	"last_sold_at" timestamp,
	CONSTRAINT "npc_sell_ledger_system_id_item_type_pk" PRIMARY KEY("system_id","item_type")
);
--> statement-breakpoint
CREATE TABLE "planets" (
	"id" serial PRIMARY KEY NOT NULL,
	"system_id" integer NOT NULL,
	"slot" smallint NOT NULL,
	"name" varchar(64) NOT NULL,
	"planet_type" varchar(20) NOT NULL,
	"channel_id" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "players" (
	"user_id" varchar(20) PRIMARY KEY NOT NULL,
	"display_name" varchar(64) NOT NULL,
	"current_system_id" integer,
	"credits" bigint DEFAULT 0 NOT NULL,
	"fuel" integer DEFAULT 100 NOT NULL,
	"fuel_capacity" integer DEFAULT 100 NOT NULL,
	"cargo_capacity" integer DEFAULT 20 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_channels" (
	"channel_id" varchar(20) PRIMARY KEY NOT NULL,
	"system_id" integer NOT NULL,
	"channel_type" varchar(20) NOT NULL,
	"reference_id" integer
);
--> statement-breakpoint
CREATE TABLE "systems" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(64) NOT NULL,
	"x" real NOT NULL,
	"y" real NOT NULL,
	"star_type" varchar(20) NOT NULL,
	"resource_rating" smallint NOT NULL,
	"is_hub" boolean DEFAULT false NOT NULL,
	"guild_id" varchar(20),
	"owner_user_id" varchar(20),
	"enrolled_at" timestamp,
	CONSTRAINT "systems_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "active_travels" ADD CONSTRAINT "active_travels_player_id_players_user_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "active_travels" ADD CONSTRAINT "active_travels_from_system_id_systems_id_fk" FOREIGN KEY ("from_system_id") REFERENCES "public"."systems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "active_travels" ADD CONSTRAINT "active_travels_to_system_id_systems_id_fk" FOREIGN KEY ("to_system_id") REFERENCES "public"."systems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asteroid_belts" ADD CONSTRAINT "asteroid_belts_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_player_id_players_user_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "npc_sell_ledger" ADD CONSTRAINT "npc_sell_ledger_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planets" ADD CONSTRAINT "planets_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_current_system_id_systems_id_fk" FOREIGN KEY ("current_system_id") REFERENCES "public"."systems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_channels" ADD CONSTRAINT "system_channels_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "active_travels_arrives_idx" ON "active_travels" USING btree ("arrives_at");--> statement-breakpoint
CREATE INDEX "asteroid_belts_system_id_idx" ON "asteroid_belts" USING btree ("system_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_unique_idx" ON "inventory_items" USING btree ("player_id","item_type","storage_type","system_id");--> statement-breakpoint
CREATE INDEX "inventory_player_storage_idx" ON "inventory_items" USING btree ("player_id","storage_type");--> statement-breakpoint
CREATE INDEX "planets_system_id_idx" ON "planets" USING btree ("system_id");--> statement-breakpoint
CREATE INDEX "players_system_idx" ON "players" USING btree ("current_system_id");--> statement-breakpoint
CREATE UNIQUE INDEX "systems_guild_id_idx" ON "systems" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "systems_coords_idx" ON "systems" USING btree ("x","y");