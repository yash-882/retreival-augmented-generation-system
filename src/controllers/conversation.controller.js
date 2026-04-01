import opError from "../utils/classes/opError.class.js";
import { prismaClient as prisma } from "../server.js";

// get all messages for a specific conversation
export const getMessages = async (req, res, next) => {
  const { conversationId } = req.params;
  const { page, limit } = req.pagination;
  const skip = (page - 1) * limit;

  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationId,
      user_id: req.user.id,
    },
    include: {
      messages: {
        orderBy: {
          created_at: 'asc',
        },
        skip,
        take: limit,
      },
    },
  });


  if (!conversation) {
    return next(new opError('Conversation not found.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      page,
      limit,
      messages: conversation.messages,
    },
  });
};

// delete conversation
export const deleteConversation = async (req, res, next) => {
  const { conversationId } = req.params;

  await prisma.conversation.delete({
    where: {
      id: conversationId,
      user_id: req.user.id,
    },
  });

  res.status(200).json({
    status: 'success',
    message: 'Conversation deleted successfully.',
  });
};

// get all conversations for a user
export const getMyConversations = async (req, res, next) => {
  const {skip, limit, page} = req.pagination;
  const conversations = await prisma.conversation.findMany({
    where: {
      user_id: req.user.id,
    },
    orderBy: {
      created_at: 'desc',
    },
    skip,
    take: limit,
  });

  res.status(200).json({
    status: 'success',
    data: {
      page,
      limit,
      conversations,
    },
  });
};
