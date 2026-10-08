CREATE TABLE "sticker_entitlements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "pack_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sticker_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sticker_entitlements_user_id_pack_id_key" ON "sticker_entitlements"("user_id", "pack_id");

CREATE TABLE "deletion_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "media_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "deletion_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "deletion_jobs_status_created_at_idx" ON "deletion_jobs"("status", "created_at");

ALTER TABLE "sticker_entitlements" ADD CONSTRAINT "sticker_entitlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deletion_jobs" ADD CONSTRAINT "deletion_jobs_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
