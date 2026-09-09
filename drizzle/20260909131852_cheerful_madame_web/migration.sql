CREATE TABLE "raw_comext_imports" (
	"id" serial PRIMARY KEY,
	"cn8_product_code" text NOT NULL,
	"partner_code" text NOT NULL,
	"partner" text NOT NULL,
	"period" text NOT NULL,
	"quantity_100kg" numeric,
	"value_euros" numeric,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
