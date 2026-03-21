import googleGenAI from "../../configs/googleGenAi.config.js";
import { openai } from "../../configs/openAi.config.js";
import opError from "../classes/opError.class.js";

// generate embeddings
export const getEmbeddings = async (textArr) => {
    const response = await googleGenAI.models.embedContent({
        model: 'gemini-embedding-001',
        contents: textArr,
        config: {
            outputDimensionality: 768  // to get arr of 768 vectors[]
        }
    });

    // model fails to generate embeddings
    if(response.embeddings?.length === 0 || response.embeddings[0].values.length === 0)
        throw new opError("Couldn’t process your request. Please try again.", 502)

    return response.embeddings;
}

// generate text-based answers
export const getAnswersByAi = async (question) => {
    // GENERATE ANSWER USING LLM
    const response = await openai.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
            {
                role: "system",
                content: `
You are an assistant that answers questions strictly based on the provided context.

Rules:
- Use only the given context to answer.
- Be concise and clear.
- Do not add assumptions or external knowledge.
`
            },
            {
                role: "user",
                content: question
                }
        ],     temperature: 0

    });

    const answer = response.choices[0].message.content;

    // openai fails to respond with a message
    if(answer.length === 0)
        throw new opError('Could not generate answer for the provided question.', 502);

    return answer;

}  