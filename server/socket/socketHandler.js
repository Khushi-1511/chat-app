const Message = require('../models/Message');

const socketHandler = (io) => {

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // User joins a room
    socket.on('join_room', async ({ room, username }) => {
      socket.join(room);
      console.log(`${username} joined room: ${room}`);

      // Load last 50 messages from database for this room
      const messages = await Message.find({ room })
        .populate('sender', 'username')
        .sort({ createdAt: 1 })
        .limit(50);

      // Send message history only to this user
      socket.emit('message_history', messages);

      // Tell everyone else in the room this user joined
      socket.to(room).emit('user_joined', { username, room });
    });

    // User sends a message
    socket.on('send_message', async ({ room, content, senderId, username }) => {
      try {
        // Save message to database
        const message = new Message({
          sender: senderId,
          room,
          content
        });
        await message.save();

        // Send message to everyone in the room
        io.to(room).emit('receive_message', {
          _id: message._id,
          content,
          room,
          sender: { _id: senderId, username },
          createdAt: message.createdAt
        });

      } catch (error) {
        console.log('Message error:', error);
      }
    });

    // User is typing
    socket.on('typing', ({ room, username }) => {
      socket.to(room).emit('user_typing', { username });
    });

    // User stopped typing
    socket.on('stop_typing', ({ room }) => {
      socket.to(room).emit('user_stop_typing');
    });

    // User disconnects
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });

  });

};

module.exports = socketHandler;