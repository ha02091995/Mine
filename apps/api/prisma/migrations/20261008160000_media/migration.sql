CREATE TABLE "media_objects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partnership_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "content_type" TEXT NOT NULL,
    "byte_size" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "media_objects_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "media_objects_partnership_id_created_at_idx" ON "media_objects"("partnership_id", "created_at");

CREATE TABLE "albums" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partnership_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "albums_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "albums_partnership_id_created_at_idx" ON "albums"("partnership_id", "created_at");

CREATE TABLE "album_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "album_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "album_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "album_items_album_id_created_at_idx" ON "album_items"("album_id", "created_at");

CREATE TABLE "story_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partnership_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "note_id" UUID,
    "media_id" UUID,
    "caption" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "story_entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "story_entries_one_subject" CHECK (
        ("note_id" IS NOT NULL AND "media_id" IS NULL) OR
        ("note_id" IS NULL AND "media_id" IS NOT NULL)
    )
);

CREATE INDEX "story_entries_partnership_id_position_idx" ON "story_entries"("partnership_id", "position");

ALTER TABLE "media_objects" ADD CONSTRAINT "media_objects_partnership_id_fkey" FOREIGN KEY ("partnership_id") REFERENCES "partnerships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "media_objects" ADD CONSTRAINT "media_objects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "albums" ADD CONSTRAINT "albums_partnership_id_fkey" FOREIGN KEY ("partnership_id") REFERENCES "partnerships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "album_items" ADD CONSTRAINT "album_items_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "album_items" ADD CONSTRAINT "album_items_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "story_entries" ADD CONSTRAINT "story_entries_partnership_id_fkey" FOREIGN KEY ("partnership_id") REFERENCES "partnerships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "story_entries" ADD CONSTRAINT "story_entries_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "story_entries" ADD CONSTRAINT "story_entries_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "story_entries" ADD CONSTRAINT "story_entries_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
