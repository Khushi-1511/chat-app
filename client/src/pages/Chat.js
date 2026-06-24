import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5001');

const Chat = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [typingUser, setTypingUser] = useState('');
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Fetch all rooms on load
  useEffect(() => {
    axios.get('http://localhost:5001/api/rooms')
      .then(res => setRooms(res.data))
      .catch(err => console.log(err));
  }, []);

  // Socket listeners
  useEffect(() => {
    socket.on('message_history', (history) => {
      setMessages(history);
    });

    socket.on('receive_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('user_joined', ({ username }) => {
      setMessages(prev => [...prev, {
        _id: Date.now(),
        content: `${username} joined the room`,
        isSystem: true
      }]);
    });

    socket.on('user_typing', ({ username }) => {
      setTypingUser(username);
    });

    socket.on('user_stop_typing', () => {
      setTypingUser('');
    });

    return () => {
      socket.off('message_history');
      socket.off('receive_message');
      socket.off('user_joined');
      socket.off('user_typing');
      socket.off('user_stop_typing');
    };
  }, []);

  // Auto scroll to bottom when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const joinRoom = (room) => {
    if (currentRoom) {
      socket.emit('leave_room', { room: currentRoom.name });
    }
    setCurrentRoom(room);
    setMessages([]);
    socket.emit('join_room', { room: room.name, username: user.username });
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !currentRoom) return;
    socket.emit('send_message', {
      room: currentRoom.name,
      content: newMessage,
      senderId: user.id,
      username: user.username
    });
    setNewMessage('');
    socket.emit('stop_typing', { room: currentRoom.name });
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    socket.emit('typing', { room: currentRoom?.name, username: user.username });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { room: currentRoom?.name });
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  const createRoom = async () => {
    if (!newRoomName.trim()) return;
    try {
      const res = await axios.post('http://localhost:5001/api/rooms/create', {
        name: newRoomName.toLowerCase(),
        userId: user.id
      });
      setRooms(prev => [...prev, res.data]);
      setNewRoomName('');
    } catch (err) {
      alert(err.response?.data?.message || 'Could not create room');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div style={styles.container}>

      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <span style={styles.username}>👤 {user.username}</span>
          <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>

        <p style={styles.sectionLabel}>ROOMS</p>
        <div style={styles.roomList}>
          {rooms.map(room => (
            <div
              key={room._id}
              style={{
                ...styles.roomItem,
                backgroundColor: currentRoom?._id === room._id ? '#6c63ff' : 'transparent',
                color: currentRoom?._id === room._id ? 'white' : '#ccc'
              }}
              onClick={() => joinRoom(room)}
            >
              # {room.name}
            </div>
          ))}
        </div>

        <div style={styles.createRoom}>
          <input
            style={styles.roomInput}
            placeholder="New room name"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
          />
          <button style={styles.createBtn} onClick={createRoom}>+</button>
        </div>
      </div>

      {/* Main chat area */}
      <div style={styles.main}>
        {currentRoom ? (
          <>
            <div style={styles.chatHeader}>
              <span style={styles.roomTitle}># {currentRoom.name}</span>
            </div>

            <div style={styles.messages}>
              {messages.map((msg) => (
                <div
                  key={msg._id}
                  style={msg.isSystem ? styles.systemMsg :
                    msg.sender?._id === user.id ? styles.myMessage : styles.otherMessage}
                >
                  {!msg.isSystem && msg.sender?._id !== user.id && (
                    <p style={styles.senderName}>{msg.sender?.username}</p>
                  )}
                  <p style={styles.msgContent}>{msg.content}</p>
                  {!msg.isSystem && (
                    <p style={styles.timestamp}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              ))}
              {typingUser && (
                <p style={styles.typing}>{typingUser} is typing...</p>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={styles.inputArea}>
              <input
                style={styles.messageInput}
                placeholder={`Message #${currentRoom.name}`}
                value={newMessage}
                onChange={handleTyping}
                onKeyDown={handleKeyDown}
              />
              <button style={styles.sendBtn} onClick={sendMessage}>Send</button>
            </div>
          </>
        ) : (
          <div style={styles.placeholder}>
            <h2 style={styles.placeholderText}>👈 Select a room to start chatting</h2>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    backgroundColor: '#1a1a2e'
  },
  sidebar: {
    width: '240px',
    backgroundColor: '#16213e',
    display: 'flex',
    flexDirection: 'column',
    padding: '0'
  },
  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid #2a2a4a'
  },
  username: {
    color: 'white',
    fontSize: '14px',
    fontWeight: '500'
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #6c63ff',
    color: '#6c63ff',
    padding: '4px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  sectionLabel: {
    color: '#888',
    fontSize: '11px',
    padding: '16px 16px 8px',
    letterSpacing: '1px'
  },
  roomList: {
    flex: 1,
    overflowY: 'auto'
  },
  roomItem: {
    padding: '10px 16px',
    cursor: 'pointer',
    borderRadius: '6px',
    margin: '2px 8px',
    fontSize: '14px',
    transition: 'background 0.2s'
  },
  createRoom: {
    display: 'flex',
    padding: '12px',
    gap: '8px',
    borderTop: '1px solid #2a2a4a'
  },
  roomInput: {
    flex: 1,
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid #2a2a4a',
    backgroundColor: '#1a1a2e',
    color: 'white',
    fontSize: '13px'
  },
  createBtn: {
    backgroundColor: '#6c63ff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    width: '32px',
    fontSize: '18px',
    cursor: 'pointer'
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  chatHeader: {
    padding: '16px 24px',
    borderBottom: '1px solid #2a2a4a',
    backgroundColor: '#16213e'
  },
  roomTitle: {
    color: 'white',
    fontSize: '16px',
    fontWeight: '500'
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#6c63ff',
    color: 'white',
    padding: '10px 14px',
    borderRadius: '12px 12px 0 12px',
    maxWidth: '60%'
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#2a2a4a',
    color: 'white',
    padding: '10px 14px',
    borderRadius: '12px 12px 12px 0',
    maxWidth: '60%'
  },
  systemMsg: {
    alignSelf: 'center',
    color: '#888',
    fontSize: '12px',
    fontStyle: 'italic'
  },
  senderName: {
    fontSize: '11px',
    color: '#aaa',
    marginBottom: '4px',
    margin: '0 0 4px 0'
  },
  msgContent: {
    margin: 0,
    fontSize: '14px',
    lineHeight: '1.4'
  },
  timestamp: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.5)',
    margin: '4px 0 0 0',
    textAlign: 'right'
  },
  typing: {
    color: '#888',
    fontSize: '12px',
    fontStyle: 'italic'
  },
  inputArea: {
    display: 'flex',
    padding: '16px 24px',
    gap: '12px',
    borderTop: '1px solid #2a2a4a',
    backgroundColor: '#16213e'
  },
  messageInput: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #2a2a4a',
    backgroundColor: '#1a1a2e',
    color: 'white',
    fontSize: '14px'
  },
  sendBtn: {
    backgroundColor: '#6c63ff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0 20px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  placeholder: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  placeholderText: {
    color: '#555',
    fontSize: '18px'
  }
};

export default Chat;