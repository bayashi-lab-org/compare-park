import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { trims } from "./trims";

export const dimensions = sqliteTable("dimensions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  trim_id: integer("trim_id")
    .notNull()
    .references(() => trims.id),
  length_mm: integer("length_mm"),
  width_mm: integer("width_mm"),
  width_with_mirrors_mm: integer("width_with_mirrors_mm"),
  height_mm: integer("height_mm"),
  weight_kg: integer("weight_kg"),
  min_turning_radius_m: real("min_turning_radius_m"),
  specification_note: text("specification_note"),
  source_url: text("source_url"),
  is_published: integer("is_published", { mode: "boolean" }).notNull().default(true),
  created_at: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updated_at: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});
