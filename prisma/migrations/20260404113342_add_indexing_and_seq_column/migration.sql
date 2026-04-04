-- AlterTable
ALTER TABLE "message" ADD COLUMN     "message_index" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "seq" SERIAL NOT NULL;

-- CreateIndex
CREATE INDEX "message_conversation_id_idx" ON "message"("conversation_id");

-- CreateIndex
CREATE INDEX "message_created_at_seq_idx" ON "message"("created_at" DESC, "seq" DESC);
