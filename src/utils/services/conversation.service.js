// conversation service
import { prismaClient as prisma } from '../../server.js';

export const getOrCreateConversation = async (userId, conversationId) => {
  let conversation = null;

  if (conversationId) {
    conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
        user_id: userId,
      },
    });
  }

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        user_id: userId,
      },
    });
  }

  return conversation;
};

// save message
export const saveMessage = async (conversationId, message, role) => {
  return await prisma.message.create({
    data: {
      conversation_id: conversationId,
      content: message,
      role
    },
  });
};

// get conversation history
export const getConversationHistory = async (conversationId, userId) => {
  return await prisma.conversation.findUnique({
    where: {
      id: conversationId,
      user_id: userId,
    },
    include: {
      messages: {
        orderBy: {
          created_at: 'asc',
        },
      },
    },
  });
};