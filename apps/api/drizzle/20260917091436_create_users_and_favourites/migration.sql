CREATE TABLE `favourites` (
	`user_id` integer NOT NULL,
	`movie_id` integer NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT `favourites_pk` PRIMARY KEY(`user_id`, `movie_id`),
	CONSTRAINT `fk_favourites_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_favourites_movie_id_movies_id_fk` FOREIGN KEY (`movie_id`) REFERENCES `movies`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`email` text NOT NULL UNIQUE,
	`display_name` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
