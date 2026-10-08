ALTER TABLE "users" ADD COLUMN "city" TEXT;

CREATE TABLE "shared_lists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partnership_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shared_lists_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shared_lists_partnership_id_created_at_idx" ON "shared_lists"("partnership_id", "created_at");

CREATE TABLE "shared_list_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "list_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shared_list_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shared_list_items_list_id_created_at_idx" ON "shared_list_items"("list_id", "created_at");

CREATE TABLE "discover_places" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "city" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    CONSTRAINT "discover_places_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "discover_places_city_idx" ON "discover_places"("city");

CREATE TABLE "saved_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partnership_id" UUID NOT NULL,
    "place_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saved_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "saved_items_partnership_id_place_id_key" ON "saved_items"("partnership_id", "place_id");

ALTER TABLE "shared_lists" ADD CONSTRAINT "shared_lists_partnership_id_fkey" FOREIGN KEY ("partnership_id") REFERENCES "partnerships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shared_list_items" ADD CONSTRAINT "shared_list_items_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "shared_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_items" ADD CONSTRAINT "saved_items_partnership_id_fkey" FOREIGN KEY ("partnership_id") REFERENCES "partnerships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_items" ADD CONSTRAINT "saved_items_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "discover_places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "discover_places" ("city", "title", "summary") VALUES
    ('Hà Nội', 'Hồ Gươm', 'Đi bộ quanh hồ lúc tối'),
    ('Hồ Chí Minh', 'Nhà thờ Đức Bà', 'Ngồi ở công viên trước nhà thờ');
