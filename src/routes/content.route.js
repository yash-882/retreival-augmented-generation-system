import express from 'express'
import { getAnswers, uploadFile } from '../controllers/content.controller.js'
import multerUploader from '../utils/services/multer.service.js'
import { checkRequiredFields } from '../middlewares/checkRequiFields.middleware.js'

const router = express.Router()

// content upload
router.post('/upload-file', multerUploader({
    fileSize: 1024 * 1024 * 5, // 5MB
    mimetypes: ['application/pdf']
}).single('file'), checkRequiredFields(['file'], true), uploadFile)

// get answers of uploaded contents
router.post('/get-answers', checkRequiredFields([
    { name: 'question', type: 'string' }
]), getAnswers)

export default router;