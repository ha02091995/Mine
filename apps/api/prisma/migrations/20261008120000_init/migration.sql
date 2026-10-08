CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "destination" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_destination_key" ON "users"("destination");

CREATE TABLE "devices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "platform" TEXT NOT NULL,
    "push_token" TEXT,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "refresh_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sessions_refresh_hash_key" ON "sessions"("refresh_hash");

CREATE TABLE "partnerships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "started_on" DATE NOT NULL,
    "status" TEXT NOT NULL,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "partnerships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "partnership_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partnership_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "partnership_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partnership_members_partnership_id_user_id_key" ON "partnership_members"("partnership_id", "user_id");
CREATE INDEX "partnership_members_user_id_status_idx" ON "partnership_members"("user_id", "status");
CREATE UNIQUE INDEX "partnership_members_one_active_user" ON "partnership_members"("user_id") WHERE "status" = 'active';

CREATE TABLE "pair_invites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "creator_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "partnership_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pair_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pair_invites_code_key" ON "pair_invites"("code");

ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partnership_members" ADD CONSTRAINT "partnership_members_partnership_id_fkey" FOREIGN KEY ("partnership_id") REFERENCES "partnerships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partnership_members" ADD CONSTRAINT "partnership_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pair_invites" ADD CONSTRAINT "pair_invites_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pair_invites" ADD CONSTRAINT "pair_invites_partnership_id_fkey" FOREIGN KEY ("partnership_id") REFERENCES "partnerships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
