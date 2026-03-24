import { Prisma } from "../../prisma/generated/prisma/client.ts";
import { prismaClient } from "../server.js"
import { getAnswersByAi, getEmbeddings } from "../utils/services/ai.service.js";
import { cleanPdfText, getPdfChunks, validatePdfResult } from "../utils/services/pdf.service.js";
import { extractText } from "unpdf";
import opError from "../utils/classes/opError.class.js";

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

  const chunks = getPdfChunks(cleanText, 20, 800) // returns an array of chunks 

  // get embeddings from AI 
  const embeddings = await getEmbeddings(chunks)

  if(embeddings.length === 0 || embeddings[0].values.length === 0)
    return next(new opError("Could not generate embeddings for the provided question.", 502))
  

  let pdf;

  // start transation for atomicity
  await prismaClient.$transaction(async (tx) => {

    // insert pdf
  pdf = await tx.pdf.create({
    data: {
      file_name: file.originalname,
      user_id: req.user.id,
    }
  });

  // create array of SQL value tuples for bulk insert
  const values = chunks.map((chunk, index) => {
    const vec = JSON.stringify(embeddings[index].values);
    return Prisma.sql`(
      gen_random_uuid(), 
      ${pdf.id}::uuid, -- pdf id
      ${req.user.id}::uuid, -- makes sure the user can only query their own data
      ${chunk}, -- chunk text
      ${index}, -- chunk index
      ${vec}::vector -- embedding
    )`;
  });

  // insert all pdf chunks
  await tx.$queryRaw(
    Prisma.sql`
      INSERT INTO pdf_chunk (id, pdf_id, user_id, chunk_text, chunk_index, embedding)
      -- output values: ( id, pdf_id, user_id, chunk_text, chunk_index, embedding ), and so on..
      VALUES ${Prisma.join(values)} 
    `
  );
});
    res.status(201).json({
        data: {
          message: 'File uploaded successfully',
          pdf: pdf,
        }
    })
}

export const getAnswers = async (req, res, next) => {
  const { question } = req.body || {};

  const embeddingsDetails = await getEmbeddings([question]);

  if(embeddingsDetails.length === 0 || embeddingsDetails[0].values.length === 0)
    return next(new opError('Could not generate embeddings for the provided question.', 502))


  // search vector database
  const results = await prismaClient.$queryRaw(
    Prisma.sql`
    SELECT chunk_text, 1 - (
      embedding <=> ${JSON.stringify(embeddingsDetails[0].values)}::vector
      ) AS similarity
    FROM pdf_chunk
    WHERE
    user_id = ${req.user.id}::uuid -- return only the pdf chunks that belong to the user
    ORDER BY similarity DESC
    LIMIT 5
    `
  );

  if(results.length === 0 || parseFloat(results[0].similarity) < 0.5){
    return res.status(200).json({
      data: {
        answer: "No relevant information found across your uploaded documents."
      }
    })
  }

  // clean context
  const context = results.map(r => r.chunk_text).join("\n\n");

  // generate answer
  const answer = await getAnswersByAi({context, question});

  res.status(200).json({
    data: {
      answer,
    }
  });
  
}