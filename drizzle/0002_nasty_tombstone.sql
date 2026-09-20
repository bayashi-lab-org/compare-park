ALTER TABLE `dimensions` ADD `specification_note` text;--> statement-breakpoint
ALTER TABLE `dimensions` ADD `source_url` text;--> statement-breakpoint
ALTER TABLE `dimensions` ADD `is_published` integer DEFAULT true NOT NULL;