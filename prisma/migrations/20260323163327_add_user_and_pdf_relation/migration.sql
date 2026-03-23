/*
  Warnings:

  - Added the required column `user_id` to the `pdf` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "pdf" ADD COLUMN     "user_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "pdf_user_id_idx" ON "pdf"("user_id");

-- AddForeignKey
ALTER TABLE "pdf" ADD CONSTRAINT "pdf_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
