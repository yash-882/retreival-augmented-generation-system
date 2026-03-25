import { prismaClient } from "../server.js";
import opError from "../utils/classes/opError.class.js";
import { getPdfHash } from "../utils/services/pdf.service.js";

export const fileUploadRequirement = async (req, res, next) => {
   const fileHash = getPdfHash(req.file?.buffer);

    const fileExist = await prismaClient.pdf.findFirst({
      where: {
        file_hash: fileHash,
        user_id: req.user.id,
      },
    });

    if (fileExist)
    return next(new opError('This file has already been uploaded.', 409))

    req.fileHash = fileHash;
    next();
}
