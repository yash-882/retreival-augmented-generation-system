import { prisma } from "../server.js";
import { cleanPdfText, validatePdfResult } from "../utils/services/pdf.service.js";
import { extractText } from "unpdf";


export const uploadFile = async (req, res, next) => {
    const file = req.file;

        const data =  await extractText(new Uint8Array(file.buffer));
        const pdfPages = cleanPdfText(data.text)

        // throws error if not satisfied with the conditions
        validatePdfResult(pdfPages)

        res.json({
            text: pdfPages
        })
}
