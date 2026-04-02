import { Prisma } from "../../prisma/generated/prisma/client.ts";
import { prismaClient } from "../server.js"
import { getAnswersByAi, getAnswersByAiStream, getEmbeddings } from "../utils/services/ai.service.js";
import { cleanPdfText, getPdfChunks, getPdfHash, validatePdfResult } from "../utils/services/pdf.service.js";
import { extractText } from "unpdf";
import { deleteCache, getCache, setCache } from "../utils/services/cache.service.js";
import { getOrCreateConversation, saveMessage } from "../utils/services/conversation.service.js";

export const uploadFile = async (req, res, next) => {
  const file = req.file;

  // get all text extracted from PDF as a string
  const data = await extractText(new Uint8Array(file.buffer), { mergePages: true });

  // clean text
  const cleanText = cleanPdfText(data.text)

  // throws error if not satisfied with the conditions
  validatePdfResult(cleanText)

  // Note: (smaller chunks -> more api calls for embeddings + more rows are created + weaker context per chunk)

  // get chunks 
  const chunks = getPdfChunks(cleanText, 20, 800) // returns an array of chunks

  // get embeddings from AI 
  const embeddings = await getEmbeddings(chunks)

  let pdf;

  // start transation for atomicity
  await prismaClient.$transaction(async (tx) => {

    // insert pdf
    pdf = await tx.pdf.create({
      data: {
        file_name: file.originalname,
        file_hash: req.fileHash || getPdfHash(file.buffer),
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
  // delete the pdfs list from cache
  await deleteCache(`user-pdfs:${req.user.id}`);

  // send response
  res.status(201).json({
    data: {
      message: 'File uploaded successfully',
      pdf: pdf,
    }
  })
}

export const getAnswers = async (req, res, next) => {
  const { question, conversationId } = req.body || {};

  // get conversation or create on if not found
  const conversation = await getOrCreateConversation(req.user.id, conversationId);

  // get embeddings
  const embeddingsDetails = await getEmbeddings([question]);

  // search vector database
  const results = await prismaClient.$queryRaw(
    Prisma.sql`
    SELECT pdf_id, chunk_text, 1 - (
      embedding <=> ${JSON.stringify(embeddingsDetails[0].values)}::vector
      ) AS similarity
    FROM pdf_chunk
    WHERE
    user_id = ${req.user.id}::uuid -- return only the pdf chunks that belong to the user
    ORDER BY similarity DESC
    LIMIT 5
    `
  );

  if (results.length === 0 || parseFloat(results[0].similarity) < 0.5) {
    return res.status(200).json({
      data: {
        answer: "No relevant information found across your uploaded documents."
      }
    })
  }

  let data;

  // check if the data is stored in cache 
  const pdfIds = [...new Set(results.map(r => r.pdf_id))]
  const keySource = `${question}:${pdfIds.join()}:${req.user.id}`
  data = await getCache(keySource)

  let isCached = true; // cache flag

  // cache not present, call LLM to generate answers
  if (!data || !data.answer) {

    isCached = false;

    // clean context
    const context = results.map(r => r.chunk_text).join("\n\n");

    // save user's message
    await saveMessage(conversation.id, question, 'USER')

    // generate answer
    const answer = await getAnswersByAi({ context, question });

    //save assistant's message
    await saveMessage(conversation.id, answer, 'ASSISTANT')

    // find pdf sources of answer
    const sources = await prismaClient.pdf.findMany({
      where: {
        id: { in: pdfIds },
        user_id: req.user.id
      },
      select: {
        id: true,
        file_name: true
      }
    });

    data = {
      answer,
      sources: sources
    }

    // store data in redis as a cache
    await setCache(keySource, data, 600)
  }

  // send answer
  res.status(200).json({
    data: {
      content: data,
      conversationId: conversation.id,
      isCached: !!isCached,
    }
  });

}

// user's all uploaded files details (name, created_at)
export const getMyFiles = async (req, res, next) => {
    let { page, limit, skip } = req.pagination;
    
    // pagination-aware cache key
    const keySource = `user-pdfs:${req.user.id}:page=${page}:limit=${limit}`;

    // check cache
    const cachedPdfs = await getCache(keySource);

    if (cachedPdfs) {
      return res.status(200).json({
        data: {
          content: cachedPdfs,
          page,
          limit,
          isCached: true
        }
      });
    }

    // query DB with pagination
    const pdfs = await prismaClient.pdf.findMany({
      where: {
        user_id: req.user.id
      },
      select: {
        id: true,
        file_name: true,
        created_at: true
      },
      skip,
      take: limit,
      orderBy: {
        created_at: 'desc' // important for consistent pagination
      }
    });

    // cache result
    await setCache(keySource, pdfs, 600);

    res.status(200).json({
      data: {
        content: pdfs,
        page,
        limit,
        isCached: false
      }
    });

};

// delete user's file
export const deleteMyFile = async (req, res, next) => {
  const { fileId } = req.params;

  // delete file
  await prismaClient.pdf.delete({
    where: {
      id: fileId,
      user_id: req.user.id
    }
  });

  // delete from cache too
  await deleteCache(`user-pdfs:${req.user.id}`);

  // send response
  res.status(200).json({
    status: 'success',
    message: 'File deleted successfully.'
  });
}

export const getAnswersStream = async (req, res, next) => {
  const { question, conversationId } = req.body || {};
  console.log('conversaiton id received: ', conversationId);
  

  // headers for stream
  res.setHeader('Connection', 'keep-alive') // tells to keep the connection open
  res.setHeader('Cache-Control', 'no-cache') // tells not to cache any response
  res.setHeader('Content-Type', 'text/event-stream') // tells the content type is SSE (server-side event)

  res.flushHeaders() // flush immediately so the client knows the connection is still open

  // get or intiate a conversation
  const conversation = await getOrCreateConversation(req.user.id, conversationId);

  // helper to write an SSE event
  // SSE format is strictly: "data: <payload>\n\n"
  const sendEvent = (eventType, payload) => {
    res.write(`data: ${JSON.stringify({ type: eventType, ...payload })}\n\n`);
  };

  try {
    // get embedding of question
    const embeddingDetails = await getEmbeddings([question]);

    // vector search
    const results = await prismaClient.$queryRaw(
      Prisma.sql`
        SELECT pdf_id, chunk_text, 1 - (
          embedding <=> ${JSON.stringify(embeddingDetails[0].values)}::vector
        ) AS similarity
        FROM pdf_chunk
        WHERE user_id = ${req.user.id}::uuid
        ORDER BY similarity DESC
        LIMIT 5
      `
    );

    // no relevant context found
    if (results.length === 0 || parseFloat(results[0].similarity) < 0.5) {
      sendEvent("done", { token: "No relevant information found across your uploaded documents." });
      res.end();
      return;
    }

    // check cache before streaming
    // if cached — stream the cached answer token by token
    const pdfIds = [...new Set(results.map((r) => r.pdf_id))];
    const keySource = `${question}:${pdfIds.join()}:${req.user.id}`;
    const cached = await getCache(keySource);
    
    if (cached && cached.answer) {
      // save user's message in DB
      await saveMessage(conversation.id, question, 'USER')

      // save assistant's message 
      await saveMessage(conversation.id, cached.answer, 'ASSISTANT')

      // simulate streaming from cache — split by word and send
      const words = cached.answer.split(" ");
      for (const word of words) {
        sendEvent("chunk", { token: word + " " });
      }

      // send final event with sources
      sendEvent("done", { 
        conversationId: conversation.id, 
        sources: cached.sources, 
        isCached: true 
      });

      res.end();
      return;
    }

    // clean context
    const context = results.map(r => r.chunk_text).join("\n\n");

    // save user's message in DB
    await saveMessage(conversation.id, question, 'USER')

    // stream answer from LLM
    await getAnswersByAiStream({
      context,
      question,

      // called for every token — write to SSE immediately
      onChunk: (token) => {
        sendEvent("chunk", { token });
      },

      // called when stream is fully done
      onDone: async (fullAnswer) => {

        // save assistant's message in DB
        await saveMessage(conversation.id, fullAnswer, 'ASSISTANT')

        // get sources
        const sources = await prismaClient.pdf.findMany({
          where: {
            id: { in: pdfIds },
            user_id: req.user.id,
          },
          select: { id: true, file_name: true },
        });

        // save to cache
        await setCache(keySource, { answer: fullAnswer, sources }, 600);

        // send final event with sources
        sendEvent("done", { conversationId: conversation.id, sources, isCached: false });
        res.end();
      },
    });

  } catch (err) {
    console.log(err);
    
    // SSE connections can't use normal error middleware
    // so we send the error as an SSE event and close
    sendEvent("error", { 
      conversationId: conversation.id, 
      message: err.message || "Something went wrong." 
    });

    res.end();
  }

}