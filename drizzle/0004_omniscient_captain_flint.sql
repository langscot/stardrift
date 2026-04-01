CREATE TABLE "module_types" (
	"key" varchar(32) PRIMARY KEY NOT NULL,
	"display_name" varchar(64) NOT NULL,
	"description" varchar(256),
	"category" varchar(20) NOT NULL,
	"tier" smallint DEFAULT 1 NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"modifiers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"emoji" varchar(64)
);
--> statement-breakpoint
CREATE TABLE "player_module_inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" varchar(20) NOT NULL,
	"module_key" varchar(32) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" varchar(20) NOT NULL,
	"slot_index" smallint NOT NULL,
	"module_key" varchar(32) NOT NULL,
	"equipped_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_ships" (
	"player_id" varchar(20) PRIMARY KEY NOT NULL,
	"ship_key" varchar(32) NOT NULL,
	"equipped_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ship_types" (
	"key" varchar(32) PRIMARY KEY NOT NULL,
	"display_name" varchar(64) NOT NULL,
	"description" varchar(256),
	"tier" smallint DEFAULT 0 NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"module_slots" smallint DEFAULT 3 NOT NULL,
	"modifiers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"emoji" varchar(64)
);
--> statement-breakpoint
ALTER TABLE "player_module_inventory" ADD CONSTRAINT "player_module_inventory_player_id_players_user_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_module_inventory" ADD CONSTRAINT "player_module_inventory_module_key_module_types_key_fk" FOREIGN KEY ("module_key") REFERENCES "public"."module_types"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_modules" ADD CONSTRAINT "player_modules_player_id_players_user_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_modules" ADD CONSTRAINT "player_modules_module_key_module_types_key_fk" FOREIGN KEY ("module_key") REFERENCES "public"."module_types"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_ships" ADD CONSTRAINT "player_ships_player_id_players_user_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_ships" ADD CONSTRAINT "player_ships_ship_key_ship_types_key_fk" FOREIGN KEY ("ship_key") REFERENCES "public"."ship_types"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "player_module_inv_idx" ON "player_module_inventory" USING btree ("player_id","module_key");--> statement-breakpoint
CREATE INDEX "player_module_inv_player_idx" ON "player_module_inventory" USING btree ("player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "player_modules_slot_idx" ON "player_modules" USING btree ("player_id","slot_index");--> statement-breakpoint
CREATE INDEX "player_modules_player_idx" ON "player_modules" USING btree ("player_id");