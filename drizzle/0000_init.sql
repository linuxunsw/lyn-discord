CREATE TABLE `scheduled_announces` (
	`id` text PRIMARY KEY NOT NULL,
	`guildId` text NOT NULL,
	`channelId` text NOT NULL,
	`userId` text NOT NULL,
	`content` text NOT NULL,
	`sendAt` integer NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`snowflake` text PRIMARY KEY NOT NULL,
	`discordUser` text NOT NULL,
	`zID` text NOT NULL,
	`name` text NOT NULL,
	`distro` text,
	`verifiedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_zID_unique` ON `users` (`zID`);