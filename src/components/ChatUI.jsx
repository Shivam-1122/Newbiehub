import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { ref, push, onValue, set, get } from 'firebase/database';
import { sendNotification } from '../utils/notificationUtils';
import CryptoJS from 'crypto-js';
import { useNavigate } from 'react-router-dom';

const CHAT_SECRET = import.meta.env.VITE_CHAT_SECRET;

function getChatId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

function encryptText(text) {
  return CryptoJS.AES.encrypt(text, CHAT_SECRET).toString();
}

function decryptText(cipherText) {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, CHAT_SECRET);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    // Fallback if it wasn't encrypted (for old messages)
    if (!originalText) return cipherText;
    return originalText;
  } catch (e) {
    return cipherText;
  }
}

export default function ChatUI({ title, onClose, otherUserId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const chatId = otherUserId && user ? getChatId(user.uid, otherUserId) : null;
  // Dragging logic
  const chatWindowRef = useRef(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Default position: bottom right corner ish
  const [position, setPosition] = useState({ x: window.innerWidth - 380, y: window.innerHeight - 530 });

  const handleMouseDown = (e) => {
    isDragging.current = true;
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    setPosition({
      x: e.clientX - dragOffset.current.x,
      y: Math.max(0, e.clientY - dragOffset.current.y) // Don't drag off top of screen
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [position]);

  useEffect(() => {
    if (!chatId) return;

    // Ensure chat metadata exists
    const chatMetaRef = ref(db, `chats/${chatId}`);
    get(chatMetaRef).then(snapshot => {
      if (!snapshot.exists()) {
        set(chatMetaRef, {
          participants: { [user.uid]: true, [otherUserId]: true },
          createdAt: new Date().toISOString()
        });
      }
    });

    // Listen for messages in real-time
    const messagesRef = ref(db, `chats/${chatId}/messages`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const messageList = Object.entries(data)
          .map(([id, msg]) => ({ 
            id, 
            ...msg,
            text: decryptText(msg.text) // Decrypt on read
          }))
          .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessages(messageList);
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [chatId, user, otherUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const currentInput = input.trim();
    if (!currentInput || !chatId || !user) return;

    // Clear text field immediately after sending
    setInput('');

    try {
      const messagesRef = ref(db, `chats/${chatId}/messages`);
      const newMsgRef = push(messagesRef);
      
      const safeText = encryptText(currentInput);

      await set(newMsgRef, {
        senderId: user.uid,
        senderName: user.fullName || user.email.split('@')[0],
        text: safeText,
        timestamp: Date.now()
      });

      await set(ref(db, `chats/${chatId}/lastMessage`), safeText);
      await set(ref(db, `chats/${chatId}/lastUpdated`), Date.now());

      if (otherUserId) {
        sendNotification(otherUserId, {
          title: `New message from ${user.fullName || user.email.split('@')[0]}`,
          message: 'You received a new secure message. Tap to view it in encrypted chat.',
          type: 'chat',
          link: '/messages'
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Revert input field if failed
      setInput(currentInput);
    }
  };

  // Group messages by Date
  const groupedMessages = messages.reduce((groups, msg) => {
    const dateObj = new Date(msg.timestamp);
    const dateStr = dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    
    // Convert to 'Today', 'Yesterday' if applicable
    const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const yesterdayObj = new Date();
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterdayStr = yesterdayObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

    let label = dateStr;
    if (dateStr === today) label = 'Today';
    if (dateStr === yesterdayStr) label = 'Yesterday';

    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(msg);
    return groups;
  }, {});

  return (
    <div 
      ref={chatWindowRef}
      style={{
        position: 'fixed', left: `${position.x}px`, top: `${position.y}px`, 
        width: '350px', height: '500px', backgroundColor: 'var(--bg-card)', 
        borderRadius: '12px', boxShadow: 'var(--shadow-lg)', 
        border: '1px solid var(--border-color)', display: 'flex', 
        flexDirection: 'column', zIndex: 1000, overflow: 'hidden'
      }} 
      className="animate-fade-in chat-window"
    >
      
      {/* Header (Draggable) */}
      <div 
        onMouseDown={handleMouseDown}
        style={{ 
          padding: '1rem', background: 'var(--primary)', color: 'white', 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: isDragging.current ? 'grabbing' : 'grab'
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', userSelect: 'none' }}>
          <User size={18} /> {title}
        </h3>
        <button onClick={onClose} style={{ color: 'white', border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
      </div>

      {/* Messages Area */}
      <div style={{ flexGrow: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem', background: 'var(--bg-main)' }}>
        {!otherUserId ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 'auto', marginBottom: 'auto' }}>
            Chat is not available for this conversation.
          </div>
        ) : messages.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 'auto', marginBottom: 'auto' }}>
            No messages yet. Send a message to start securely!
          </div>
        ) : (
          Object.entries(groupedMessages).map(([dateLabel, msgs], index) => (
            <React.Fragment key={index}>
              <div style={{ textAlign: 'center', margin: '1rem 0 0.5rem' }}>
                <span style={{ background: 'var(--bg-card)', padding: '0.2rem 0.8rem', borderRadius: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                  {dateLabel}
                </span>
              </div>
              
              {msgs.map((msg) => {
                const isMe = msg.senderId === user?.uid;
                const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <div key={msg.id} style={{
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    display: 'flex', flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '85%'
                  }}>
                    <div style={{
                      background: isMe ? 'var(--primary)' : 'var(--bg-card)',
                      color: isMe ? 'white' : 'var(--text-main)',
                      padding: '0.6rem 1rem',
                      borderRadius: '16px',
                      borderBottomRightRadius: isMe ? '0' : '16px',
                      borderBottomLeftRadius: !isMe ? '0' : '16px',
                      border: isMe ? 'none' : '1px solid var(--border-color)',
                      fontSize: '0.9rem',
                      boxShadow: 'var(--shadow-sm)',
                      wordBreak: 'break-word'
                    }}>
                      {!isMe && (
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.2rem', color: 'var(--primary)', opacity: 0.9 }}>
                          {msg.senderName}
                        </div>
                      )}
                      {msg.text}
                    </div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem', padding: '0 0.5rem' }}>
                      {timeStr}
                    </span>
                  </div>
                );
              })}
            </React.Fragment>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} style={{ padding: '0.8rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)', display: 'flex', gap: '0.5rem' }}>
        <input 
          type="text" 
          className="form-input" 
          style={{ flexGrow: 1, padding: '0.6rem', borderRadius: '20px' }} 
          placeholder="Secure message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={!otherUserId}
        />
        <button type="submit" className="btn-primary" style={{ padding: '0.6rem', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} disabled={!otherUserId}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
