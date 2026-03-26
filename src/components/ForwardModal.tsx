import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { Chat, Message, OperationType } from '../types';
import { handleFirestoreError } from '../lib/firestore-utils';
import { X, Send, Search, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ForwardModalProps {
  message: Message;
  onClose: () => void;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({ message, onClose }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'chats'),
      where('memberIds', 'array-contains', auth.currentUser.uid),
      orderBy('lastMessageTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      setChats(chatList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });

    return () => unsubscribe();
  }, []);

  const handleForward = async (chat: Chat) => {
    if (!auth.currentUser) return;

    try {
      const forwardedMessage: any = {
        chatId: chat.id,
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || 'Anonymous',
        text: message.text,
        timestamp: serverTimestamp(),
        type: message.type,
        isForwarded: true,
        forwardedFrom: message.senderName,
        reactions: {}
      };

      if (message.fileUrl) {
        forwardedMessage.fileUrl = message.fileUrl;
        forwardedMessage.fileName = message.fileName;
        forwardedMessage.fileSize = message.fileSize;
      }

      await addDoc(collection(db, 'chats', chat.id, 'messages'), forwardedMessage);
      
      // Update chat last message
      await updateDoc(doc(db, 'chats', chat.id), {
        lastMessage: `تم تحويل رسالة: ${message.text.substring(0, 20)}...`,
        lastMessageTime: serverTimestamp()
      });

      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `chats/${chat.id}/messages`);
    }
  };

  const filteredChats = chats.filter(chat => 
    chat.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    chat.type === 'private' ||
    chat.type === 'saved'
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
      >
        <div className="p-4 bg-[#517da2] text-white flex items-center justify-between">
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full">
            <X size={20} />
          </button>
          <span className="font-bold">تحويل الرسالة إلى...</span>
        </div>

        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="البحث عن محادثة..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#24a1de] text-right"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => handleForward(chat)}
              className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 rounded-xl transition-colors text-right"
            >
              <div className="w-10 h-10 rounded-full bg-[#24a1de] flex items-center justify-center text-white flex-shrink-0 overflow-hidden">
                {chat.photoURL ? (
                  <img src={chat.photoURL} alt={chat.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  chat.type === 'group' ? <Users size={20} /> : <span className="font-bold">{chat.name?.[0] || 'U'}</span>
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-800">{chat.name || (chat.type === 'saved' ? 'الرسائل المحفوظة' : 'محادثة خاصة')}</p>
                <p className="text-xs text-gray-500">{chat.type === 'group' ? 'مجموعة' : 'محادثة'}</p>
              </div>
              <Send size={18} className="text-[#24a1de] rotate-180" />
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};
