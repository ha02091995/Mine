CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partnership_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "client_msg_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "body" TEXT,
    "sticker_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "messages_partnership_id_client_msg_id_key" ON "messages"("partnership_id", "client_msg_id");
CREATE INDEX "messages_partnership_id_created_at_idx" ON "messages"("partnership_id", "created_at");

CREATE TABLE "message_receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    CONSTRAINT "message_receipts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "message_receipts_message_id_user_id_key" ON "message_receipts"("message_id", "user_id");

CREATE TABLE "secret_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partnership_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "body" TEXT,
    "image_ref" TEXT,
    "revealed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "secret_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "secret_messages_partnership_id_created_at_idx" ON "secret_messages"("partnership_id", "created_at");

ALTER TABLE "push_deliveries" ALTER COLUMN "event_id" DROP NOT NULL;
ALTER TABLE "push_deliveries" ADD COLUMN "message_id" UUID;

ALTER TABLE "messages" ADD CONSTRAINT "messages_partnership_id_fkey" FOREIGN KEY ("partnership_id") REFERENCES "partnerships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_receipts" ADD CONSTRAINT "message_receipts_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_receipts" ADD CONSTRAINT "message_receipts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "secret_messages" ADD CONSTRAINT "secret_messages_partnership_id_fkey" FOREIGN KEY ("partnership_id") REFERENCES "partnerships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "secret_messages" ADD CONSTRAINT "secret_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "push_deliveries" ADD CONSTRAINT "push_deliveries_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "push_deliveries_message_id_device_id_key" ON "push_deliveries"("message_id", "device_id");
