import React, { useState, useEffect } from 'react';
import { MessageSquare, User, Search, Send, Clock, Loader, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { ref, onValue, get, push, set, update } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import CryptoJS from 'crypto-js';

const CHAT_SECRET = import.meta.env.VITE_CHAT_SECRET || 'fallback-secret-key';

function encryptText(text) {
  return CryptoJS.AES.encrypt(text, CHAT_SECRET).toString();
}

function decryptText(cipherText) {
  if (!cipherText) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, CHAT_SECRET);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText || cipherText;
  } catch (e) {
    return cipherText;
  }
}

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const chatsRef = ref(db, 'chats');
    const unsubscribe = onValue(chatsRef, async (snapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const chatList = [];
          for (const [id, chat] of Object.entries(data)) {
            if (chat.participants && chat.participants[user.uid]) {
              const otherId = Object.keys(chat.participants).find(uid => uid !== user.uid);
              if (otherId) {
                const uSnap = await get(ref(db, `users/${otherId}`));
                chatList.push({
                  id,
                  otherId,
                  otherName: uSnap.exists() ? uSnap.val().fullName : 'User',
                  otherAvatar: uSnap.exists() ? uSnap.val().profileImage : null,
                  lastUpdate: chat.lastUpdated || 0,
                  lastMsg: decryptText(chat.lastMessage || '')
                });
              }
            }
          }
          setChats(chatList.sort((a,b) => b.lastUpdate - a.lastUpdate));
        } else {
          setChats([]);
        }
      } catch (err) {
        console.error("Error loading chats:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!selectedChat) return;
    const msgsRef = ref(db, `chats/${selectedChat.id}/messages`);
    const unsubscribe = onValue(msgsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([mid, msg]) => ({
          mid,
          ...msg,
          text: decryptText(msg.text)
        })).sort((a,b) => a.timestamp - b.timestamp);
        setMessages(list);
      } else {
        setMessages([]);
      }
    });
    return () => unsubscribe();
  }, [selectedChat]);

  const handleSend = async (e) => {
    e.preventDefault();
    const currentInput = input.trim();
    if (!currentInput || !selectedChat) return;

    // Instant UI clear
    setInput('');

    try {
      const safeText = encryptText(currentInput);
      const msgsRef = ref(db, `chats/${selectedChat.id}/messages`);
      const newMsg = push(msgsRef);
      
      await set(newMsg, {
        senderId: user.uid,
        senderName: user.fullName || 'User',
        text: safeText,
        timestamp: Date.now()
      });

      await update(ref(db, `chats/${selectedChat.id}`), {
        lastMessage: safeText,
        lastUpdated: Date.now()
      });

      // Send generic notification to receiver to alert them (secure payload)
      const { sendNotification } = await import('../utils/notificationUtils');
      sendNotification(selectedChat.otherId, {
        title: `New message from ${user.fullName || 'User'}`,
        message: 'You received a new secure message. Tap to view it in encrypted chat.',
        type: 'chat',
        link: '/messages'
      });
    } catch (err) {
      console.error(err);
      setInput(currentInput); // Re-populate on crash
    }
  };

  if (!user) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', margin: '-1rem -2rem' }}>
      <div style={{ padding: '0.8rem 2rem', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
        <button className="btn-back" onClick={() => navigate(-1)} style={{ margin: 0 }}>
          <ArrowLeft size={18} /> Back
        </button>
      </div>
      <div style={{ display: 'flex', flex: 1, background: 'var(--bg-main)' }}>
      {/* Sidebar - Chat List */}
      <div style={{ width: '350px', borderRight: '1px solid var(--border-color)', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '1.5rem' }}>
            <MessageSquare color="var(--primary)" /> Messages
          </h2>
          <div style={{ position: 'relative', marginTop: '1rem' }}>
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Search chats..." className="form-input" style={{ paddingLeft: '2.5rem', borderRadius: '20px' }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
             <div style={{ padding: '2rem', textAlign: 'center' }}><Loader className="spin" /></div>
          ) : chats.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No conversations found.</p>
          ) : (
            chats.map(chat => (
              <div 
                key={chat.id} 
                onClick={() => setSelectedChat(chat)}
                style={{ 
                  padding: '1.2rem', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  gap: '1rem', 
                  alignItems: 'center',
                  background: selectedChat?.id === chat.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  borderBottom: '1px solid var(--border-color)',
                  transition: 'background 0.2s'
                }}
              >
                <img 
                  src={chat.otherAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.otherName)}&background=random`} 
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} 
                  alt="avatar"
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{chat.otherName}</h4>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(chat.lastUpdate).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {chat.lastMsg}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedChat ? (
          <>
            <div style={{ padding: '1rem 2rem', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                 <img src={selectedChat.otherAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedChat.otherName)}&background=random`} style={{ width: '40px', height: '40px', borderRadius: '50%' }} alt="av" />
                 <h3 style={{ fontSize: '1.1rem' }}>{selectedChat.otherName}</h3>
               </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-main)' }}>
              {messages.map(m => {
                const isMe = m.senderId === user.uid;
                return (
                  <div key={m.mid} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%', background: isMe ? 'var(--primary)' : 'var(--bg-card)', color: isMe ? 'white' : 'var(--text-main)', padding: '0.8rem 1.2rem', borderRadius: '12px', borderBottomRightRadius: isMe ? 0 : '12px', borderBottomLeftRadius: isMe ? '12px' : 0, boxShadow: 'var(--shadow-sm)' }}>
                    <p style={{ margin: 0, fontSize: '0.95rem' }}>{m.text}</p>
                    <span style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '0.3rem', display: 'block', textAlign: 'right' }}>
                      {new Date(m.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSend} style={{ padding: '1.5rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Type a secure message..." 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                style={{ borderRadius: '25px', paddingLeft: '1.5rem' }}
              />
              <button type="submit" className="btn-primary" style={{ padding: '0.8rem', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Send size={20} />
              </button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            <MessageSquare size={64} style={{ marginBottom: '1.5rem', opacity: 0.2 }} />
            <h2>NewbieHub Messenger</h2>
            <p>Select a contact to start messaging securely. All chats are end-to-end encrypted.</p>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
