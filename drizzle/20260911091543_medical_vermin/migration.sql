CREATE TABLE "raw_comext_ru_imports" (
	"id" serial PRIMARY KEY,
	"cn8_product_code" text NOT NULL,
	"partner_code" text NOT NULL,
	"period" text NOT NULL,
	"quantity_100kg" numeric,
	"value_euros" numeric,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "raw_comext_ru_imports_cn8_prefix_idx" ON "raw_comext_ru_imports" ("cn8_product_code" text_pattern_ops);