-- set embedding[] dimension length to 768
ALTER TABLE pdf_chunk ALTER COLUMN "embedding" TYPE vector(768)