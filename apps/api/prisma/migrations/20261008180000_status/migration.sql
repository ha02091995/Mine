CREATE TABLE "status_current" (
    "user_id" UUID NOT NULL,
    "battery_enabled" BOOLEAN NOT NULL DEFAULT false,
    "battery_percent" INTEGER,
    "location_enabled" BOOLEAN NOT NULL DEFAULT false,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "location_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "status_current_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "status_current" ADD CONSTRAINT "status_current_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
