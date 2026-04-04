import opError from "../utils/classes/opError.class.js";
import { prismaClient as prisma } from "../server.js";
import { parseMessageCursor } from "../utils/services/conversation.service.js";

// get all messages for a specific conversation
export const getMessages = async (req, res, next) => {
  const { conversationId } = req.params;
  let { last_msg_seq, last_msg_time } = req.query;
  
  // parses the cursors (type conversions), throws error if cursors are invalid
  const { lastMsgTime, lastMsgSeq } = parseMessageCursor(last_msg_time, last_msg_seq);

  // find the conversation
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      user_id: req.user.id,
    }
  });

  if (!conversation) {
    return next(new opError('Conversation not found.', 404));
  }

  // to fetch in limit
  const { limit } = req.pagination;

  const whereClause = {
    conversation_id: conversationId,
  };

  // if the last sent msg props are passed 
  if (lastMsgTime && lastMsgSeq) {
    whereClause.OR = [
      { created_at: { lt: lastMsgTime } },

      // ensures we don't skip messages with the exact same Datetime
      {
        created_at: lastMsgTime,
        seq: { lt: lastMsgSeq } // tiebreaker
      }
    ];
  } 
  
  // default filter
  else {
    whereClause.created_at = { lt: lastMsgTime };
  }

  // get messages
  const messages = await prisma.message.findMany({
    where: whereClause,
    orderBy: [
      { created_at: 'desc' },
      { seq: 'desc' }
    ],
    take: limit
  });

  // get last message details
  const nextMsgCursor = messages.length > 0
    ? messages[messages.length - 1]
    : null;

  res.status(200).json({
    status: 'success',
    data: {
    // cursor points to the last message in this batch, used for keyset pagination
      cursor: nextMsgCursor
        ? {
            created_at: nextMsgCursor.created_at,
            last_msg_seq: nextMsgCursor.seq
          }
        : null,
      messages,
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
