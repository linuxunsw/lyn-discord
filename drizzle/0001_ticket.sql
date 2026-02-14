CREATE TABLE `tickets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guildId` text NOT NULL,
	`channelId` text NOT NULL,
	`userId` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`createdAt` integer NOT NULL
);
