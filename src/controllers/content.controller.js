import { prisma } from "../server.js";
import { getEmbeddings } from "../utils/services/ai.service.js";import { cleanPdfText, getPdfChunks, validatePdfResult } from "../utils/services/pdf.service.js";
import { extractText } from "unpdf";

export const uploadFile = async (req, res, next) => {
    const file = req.file;

    // get all text extracted from PDF as a string
    const data = await extractText(new Uint8Array(file.buffer), { mergePages: true });

    // clean text
    const cleanText = cleanPdfText(data.text)

    // throws error if not satisfied with the conditions
    validatePdfResult(cleanText)

    // get chunks 
    // Note: (smaller chunks -> more api calls for embeddings + more rows are created + weaker context per chunk)

    const chunks = getPdfChunks(cleanText, 20, 800)
    

    res.json({
        chunks
    })
}
