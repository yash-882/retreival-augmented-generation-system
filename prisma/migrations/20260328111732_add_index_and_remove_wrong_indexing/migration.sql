-- DropIndex
DROP INDEX "pdf_chunk_pdf_id_idx";

-- CreateIndex
CREATE INDEX "pdf_id_user_id_idx" ON "pdf"("id", "user_id");

-- CreateIndex
CREATE INDEX "pdf_chunk_user_id_idx" ON "pdf_chunk"("user_id");
