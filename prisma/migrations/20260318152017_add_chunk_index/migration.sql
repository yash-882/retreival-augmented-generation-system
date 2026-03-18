/*
  Warnings:

  - Added the required column `chunk_index` to the `pdf_chunk` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "pdf_chunk" ADD COLUMN     "chunk_index" INTEGER NOT NULL;
