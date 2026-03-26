import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, updateDoc, doc, getDocs, where, getDoc } from 'firebase/firestore';
import { Chat, Message, OperationType, UserProfile, ChatPermissions } from '../types';
import { handleFirestoreError } from '../lib/firestore-utils';
import { Send, Paperclip, Smile, MoreVertical, Phone, Video, Star, Settings, ArrowRight, Pin, Reply, X, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { CallOverlay } from './CallOverlay';
import { ChatSettings } from './ChatSettings';
import { ForwardModal } from './ForwardModal';

interface ChatWindowProps {
  chat: Chat;
  onBack: () => void;
  onSelectChat: (chat: Chat) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ chat, onBack, onSelectChat }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Record<string, UserProfile>>({});
  const [inputText, setInputText] = useState('');
  const [showCall, setShowCall] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [chatUsers, setChatUsers] = useState<Record<string, UserProfile>>({});

  useEffect(() => {
    const fetchChatUsers = async () => {
      if (messages.length === 0) return;
      const uniqueIds = Array.from(new Set(messages.map(m => m.senderId as string)));
      const newUsers: Record<string, UserProfile> = { ...chatUsers };
      let changed = false;

      for (const uid of uniqueIds as string[]) {
        if (!newUsers[uid]) {
          const userSnap = await getDoc(doc(db, 'users', uid));
          if (userSnap.exists()) {
            newUsers[uid] = userSnap.data() as UserProfile;
            changed = true;
          }
        }
      }
      if (changed) setChatUsers(newUsers);
    };
    fetchChatUsers();
  }, [messages]);

  const handleDirectMessage = async (targetUserId: string, targetUserName: string, targetPhoto: string) => {
    if (!auth.currentUser || targetUserId === auth.currentUser.uid) return;

    try {
      const q = query(
        collection(db, 'chats'),
        where('type', '==', 'private'),
        where('memberIds', 'array-contains', auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const existingChat = snapshot.docs.find(doc => {
        const data = doc.data() as Chat;
        return data.memberIds.includes(targetUserId);
      });

      if (existingChat) {
        onSelectChat({ id: existingChat.id, ...existingChat.data() } as Chat);
      } else {
        const newChat: any = {
          type: 'private',
          memberIds: [auth.currentUser.uid, targetUserId],
          createdBy: auth.currentUser.uid,
          lastMessage: 'بدأت محادثة جديدة',
          lastMessageTime: serverTimestamp(),
          name: targetUserName,
          photoURL: targetPhoto
        };
        const docRef = await addDoc(collection(db, 'chats'), newChat);
        onSelectChat({ id: docRef.id, ...newChat });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chats');
    }
  };
  const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [currentUserPermissions, setCurrentUserPermissions] = useState<ChatPermissions | null>(null);
  const isMutedInGroup = chat.mutedUserIds?.includes(auth.currentUser?.uid || '');

  useEffect(() => {
    if (!auth.currentUser || !chat.id) return;

    const q = query(
      collection(db, 'chats', chat.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${chat.id}/messages`);
    });

    return () => unsubscribe();
  }, [chat.id, auth.currentUser]);

  useEffect(() => {
    if (!chat.memberIds || chat.memberIds.length === 0) return;

    // Listen to all users involved in the chat
    const q = query(collection(db, 'users'), where('uid', 'in', chat.memberIds));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMembers: Record<string, UserProfile> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data() as UserProfile;
        newMembers[data.uid] = data;
      });
      setMembers(newMembers);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    
    return () => unsubscribe();
  }, [chat.memberIds]);

  useEffect(() => {
    if (chat.type === 'group' && chat.admins && auth.currentUser) {
      const adminData = chat.admins[auth.currentUser.uid];
      if (adminData) {
        setCurrentUserPermissions(adminData.permissions);
      } else if (chat.createdBy === auth.currentUser.uid) {
        // Creator is super admin
        setCurrentUserPermissions({
          canChangeInfo: true,
          canDeleteMessages: true,
          canBanUsers: true,
          canInviteUsers: true,
          canPinMessages: true,
          canManageVideoChats: true,
          canAddAdmins: true,
          canSendMessages: true,
          canSendMedia: true,
          canSendStickers: true,
          canSendPolls: true,
          canEmbedLinks: true,
          canAddUsers: true,
        });
      } else {
        // Default member permissions (could be fetched from chat settings)
        setCurrentUserPermissions({
          canChangeInfo: false,
          canDeleteMessages: false,
          canBanUsers: false,
          canInviteUsers: false,
          canPinMessages: false,
          canManageVideoChats: false,
          canAddAdmins: false,
          canSendMessages: true,
          canSendMedia: true,
          canSendStickers: true,
          canSendPolls: true,
          canEmbedLinks: true,
          canAddUsers: false,
        });
      }
    }
  }, [chat, auth.currentUser]);

  useEffect(() => {
    if (chat.pinnedMessageId) {
      const fetchPinned = async () => {
        const snap = await getDocs(query(collection(db, 'chats', chat.id, 'messages'), where('__name__', '==', chat.pinnedMessageId)));
        if (!snap.empty) {
          setPinnedMessage({ id: snap.docs[0].id, ...snap.docs[0].data() } as Message);
        }
      };
      fetchPinned();
    } else {
      setPinnedMessage(null);
    }
  }, [chat.pinnedMessageId, chat.id]);

  useEffect(() => {
    if (!auth.currentUser || !chat.id || messages.length === 0) return;

    const unseenMessages = messages.filter(m => 
      m.senderId !== auth.currentUser?.uid && 
      (!m.seenBy || !m.seenBy.includes(auth.currentUser!.uid))
    );

    if (unseenMessages.length > 0) {
      unseenMessages.forEach(async (m) => {
        try {
          await updateDoc(doc(db, 'chats', chat.id, 'messages', m.id), {
            seenBy: [...(m.seenBy || []), auth.currentUser!.uid]
          });
        } catch (error) {
          console.error('Error updating seenBy:', error);
        }
      });
    }
  }, [messages, chat.id, auth.currentUser]);

  const handleSendMessage = async (e?: React.FormEvent, fileData?: { url: string, name: string, type: 'image' | 'file' | 'sticker' }) => {
    e?.preventDefault();
    if (!inputText.trim() && !fileData && !auth.currentUser) return;

    if (editingMessage) {
      try {
        await updateDoc(doc(db, 'chats', chat.id, 'messages', editingMessage.id), {
          text: inputText,
          isEdited: true
        });
        setEditingMessage(null);
        setInputText('');
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `chats/${chat.id}/messages/${editingMessage.id}`);
        return;
      }
    }

    const text = inputText;
    setInputText('');
    const currentReply = replyTo;
    setReplyTo(null);

    try {
      const newMessage: any = {
        chatId: chat.id,
        senderId: auth.currentUser!.uid,
        senderName: auth.currentUser!.displayName || 'Anonymous',
        text: fileData?.type === 'sticker' ? '' : text,
        timestamp: serverTimestamp(),
        type: fileData ? (fileData.type === 'sticker' ? 'text' : fileData.type) : 'text',
        reactions: {},
        seenBy: [auth.currentUser!.uid]
      };

      if (fileData) {
        if (fileData.type === 'sticker') {
          newMessage.text = fileData.url; // The emoji itself
          newMessage.isSticker = true;
        } else {
          newMessage.fileUrl = fileData.url;
          newMessage.fileName = fileData.name;
        }
      }

      if (currentReply) {
        newMessage.replyTo = {
          id: currentReply.id,
          text: currentReply.text,
          senderName: currentReply.senderName
        };
      }

      await addDoc(collection(db, 'chats', chat.id, 'messages'), newMessage);
      
      // Update chat last message
      await updateDoc(doc(db, 'chats', chat.id), {
        lastMessage: fileData ? (fileData.type === 'image' ? '📷 صورة' : fileData.type === 'sticker' ? '✨ ملصق' : '📁 ملف') : text,
        lastMessageTime: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `chats/${chat.id}/messages`);
    }
  };

  const handlePinMessage = async (messageId: string) => {
    if (chat.type === 'group' && !currentUserPermissions?.canPinMessages) return;
    try {
      await updateDoc(doc(db, 'chats', chat.id), {
        pinnedMessageId: messageId
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chats/${chat.id}`);
    }
  };

  const handleUnpinMessage = async () => {
    try {
      await updateDoc(doc(db, 'chats', chat.id), {
        pinnedMessageId: null
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chats/${chat.id}`);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await updateDoc(doc(db, 'chats', chat.id, 'messages', messageId), {
        text: '🚫 تم حذف هذه الرسالة',
        type: 'text',
        fileUrl: null,
        fileName: null,
        isDeleted: true // We'll just mark it for UI
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `chats/${chat.id}/messages/${messageId}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    const tempId = 'temp-' + Date.now();
    const type = file.type.startsWith('image/') ? 'image' : 'file';
    
    // Optimistic UI
    const optimisticMessage: Message = {
      id: tempId,
      chatId: chat.id,
      senderId: auth.currentUser!.uid,
      senderName: auth.currentUser!.displayName || 'Anonymous',
      text: '',
      timestamp: { toDate: () => new Date() } as any,
      type: type,
      fileUrl: URL.createObjectURL(file), // Use local URL for immediate display
      fileName: file.name,
      reactions: {},
      seenBy: [auth.currentUser!.uid],
      isUploading: true
    };
    setMessages(prev => [...prev, optimisticMessage]);

    // Background upload
    const uploadFile = async () => {
      try {
        let fileToUpload = file;
        // Simple compression for images
        if (file.type.startsWith('image/')) {
          const img = new Image();
          img.src = URL.createObjectURL(file);
          await new Promise((resolve) => (img.onload = resolve));
          
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          const blob = await new Promise<Blob | null>((resolve) => 
            canvas.toBlob(resolve, 'image/jpeg', 0.7)
          );
          
          if (blob) {
            fileToUpload = new File([blob], file.name, { type: 'image/jpeg' });
          }
        }

        const storageRef = ref(storage, `chats/${chat.id}/${tempId}_${fileToUpload.name}`);
        await uploadBytes(storageRef, fileToUpload);
        const url = await getDownloadURL(storageRef);
        console.log('Image uploaded successfully, URL:', url);
        
        // Add to Firestore
        const newMessage: any = {
          chatId: chat.id,
          senderId: auth.currentUser!.uid,
          senderName: auth.currentUser!.displayName || 'Anonymous',
          text: '',
          timestamp: serverTimestamp(),
          type: type,
          fileUrl: url,
          fileName: fileToUpload.name,
          reactions: {},
          seenBy: [auth.currentUser!.uid]
        };
        const docRef = await addDoc(collection(db, 'chats', chat.id, 'messages'), newMessage);
        
        // Update optimistic message with real ID instead of removing it
        console.log('Updating optimistic message:', tempId, 'to', docRef.id);
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: docRef.id, isUploading: false } : m));
      } catch (error) {
        console.error('Error uploading:', error);
        console.log('Removing failed optimistic message:', tempId);
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    };
    uploadFile();
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!auth.currentUser) return;
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;

    const currentReactions = msg.reactions || {};
    const userIds = currentReactions[emoji] || [];
    
    let newUserIds;
    if (userIds.includes(auth.currentUser.uid)) {
      newUserIds = userIds.filter(id => id !== auth.currentUser!.uid);
    } else {
      newUserIds = [...userIds, auth.currentUser.uid];
    }

    const updatedReactions = { ...currentReactions, [emoji]: newUserIds };
    if (newUserIds.length === 0) delete updatedReactions[emoji];

    try {
      await updateDoc(doc(db, 'chats', chat.id, 'messages', messageId), {
        reactions: updatedReactions
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chats/${chat.id}/messages/${messageId}`);
    }
  };

  const isOwner = chat.createdBy === auth.currentUser?.uid;

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col bg-[#e7ebf0] relative overflow-hidden font-sans">
      {/* Chat Header */}
      <div className="p-3 bg-white border-b border-gray-200 flex items-center justify-between shadow-sm z-10 flex-shrink-0">
        <div className="flex items-center gap-3 text-right">
          <button 
            onClick={onBack}
            className="md:hidden p-2 hover:bg-gray-100 rounded-full text-gray-500"
          >
            <ArrowRight size={24} />
          </button>
          <div className="w-10 h-10 rounded-full bg-[#24a1de] flex items-center justify-center text-white overflow-hidden relative flex-shrink-0">
            {chat.photoURL ? (
              <img src={chat.photoURL} alt={chat.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="font-bold">{chat.name?.[0] || 'U'}</span>
            )}
          </div>
          <div className="overflow-hidden">
            <h2 className="font-bold text-gray-800 truncate">{chat.name || 'محادثة خاصة'}</h2>
            {chat.isPublic && chat.username ? (
              <a 
                href={chat.inviteLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] text-blue-500 hover:underline block truncate"
              >
                @{chat.username}
              </a>
            ) : (
              <p className={`text-xs font-medium truncate ${chat.type === 'private' && members[chat.memberIds.find(id => id !== auth.currentUser?.uid) || '']?.status === 'online' ? 'text-blue-500' : 'text-gray-500'}`}>
                {chat.type === 'private' 
                  ? (members[chat.memberIds.find(id => id !== auth.currentUser?.uid) || '']?.status === 'online' 
                      ? 'متصل الآن' 
                      : 'كان نشط منذ قليل')
                  : 'مجموعة'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
          <div className="flex gap-1 sm:gap-2">
            {chat.type === 'group' && (chat.createdBy === auth.currentUser?.uid || chat.admins?.[auth.currentUser?.uid || '']) && (
              <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                <Settings size={20} />
              </button>
            )}
            <button onClick={() => setShowCall(true)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
              <Video size={20} />
            </button>
            <button onClick={() => setShowCall(true)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
              <Phone size={20} />
            </button>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Pinned Message Bar */}
      {pinnedMessage && (
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 p-2 flex items-center justify-between px-4 shadow-sm animate-in slide-in-from-top duration-300 flex-shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <Pin size={14} className="text-[#24a1de] flex-shrink-0" />
            <div className="text-right overflow-hidden">
              <p className="text-[10px] font-bold text-[#24a1de]">رسالة مثبتة</p>
              <p className="text-xs text-gray-600 truncate">{pinnedMessage.text}</p>
            </div>
          </div>
          {(isOwner || currentUserPermissions?.canPinMessages) && (
            <button onClick={handleUnpinMessage} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.senderId === auth.currentUser?.uid;
            const senderProfile = members[msg.senderId];
            const isSenderAdmin = senderProfile?.role === 'admin';
            const isSenderModerator = senderProfile?.role === 'moderator';

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                drag="x"
                dragConstraints={{ left: -100, right: 0 }}
                onDragEnd={(event, info) => {
                  if (info.offset.x < -50) {
                    setReplyTo(msg);
                  }
                }}
                className={`flex ${isMe ? 'justify-start' : 'justify-end'} mb-2 gap-2 items-end`}
              >
                {!isMe && (
                  <div 
                    className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden cursor-pointer shadow-sm border border-gray-100"
                    onClick={() => handleDirectMessage(msg.senderId, msg.senderName, members[msg.senderId]?.photoURL || '')}
                  >
                    {members[msg.senderId]?.isPremium && members[msg.senderId]?.videoPhotoURL ? (
                      <video 
                        src={members[msg.senderId]?.videoPhotoURL} 
                        className="w-full h-full object-cover" 
                        autoPlay 
                        loop 
                        muted 
                        playsInline
                      />
                    ) : (
                      <img 
                        src={members[msg.senderId]?.photoURL || `https://ui-avatars.com/api/?name=${msg.senderName}&background=random`} 
                        alt={msg.senderName} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                )}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                  <div
                    className={`p-3 rounded-2xl shadow-sm relative group ${
                      isMe 
                        ? 'bg-[#effdde] text-gray-800 rounded-tl-none' 
                        : 'bg-white text-gray-800 rounded-tr-none'
                    } ${isSenderAdmin ? 'luxury-message-admin' : isSenderModerator ? 'luxury-message-moderator' : ''}`}
                  >
                    {isSenderAdmin && (
                      <div className="absolute -top-3 -right-3 w-8 h-8 pointer-events-none animate-flame">
                        <span className="text-xl">🔥</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1 justify-end mb-1">
                      {isSenderAdmin && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-black border border-yellow-200">مسؤول</span>}
                      {isSenderModerator && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold border border-blue-200">مشرف</span>}
                      {senderProfile?.isPremium && <Star size={12} className="text-yellow-500" fill="currentColor" />}
                      {!isMe && chat.type === 'group' && (
                        <p 
                          className={`text-xs font-bold text-right cursor-pointer hover:underline ${isSenderAdmin ? 'text-yellow-600' : 'text-blue-600'}`}
                          onClick={() => handleDirectMessage(msg.senderId, msg.senderName, members[msg.senderId]?.photoURL || '')}
                        >
                          {msg.senderName}
                        </p>
                      )}
                    </div>

                    {msg.replyTo && (
                      <div className="mb-2 p-2 bg-black/5 rounded-lg border-r-4 border-blue-400 text-right cursor-pointer hover:bg-black/10 transition-colors">
                        <p className="text-[10px] font-bold text-blue-600">{msg.replyTo.senderName}</p>
                        <p className="text-xs text-gray-600 truncate">{msg.replyTo.text}</p>
                      </div>
                    )}

                    {msg.isForwarded && (
                      <div className="mb-1 flex items-center justify-end gap-1 text-blue-500 italic">
                        <span className="text-[10px]">محولة من {msg.forwardedFrom}</span>
                        <Reply size={10} className="rotate-180" />
                      </div>
                    )}

                  {msg.type === 'image' && msg.fileUrl && (
                    <img src={msg.fileUrl} className="w-full rounded-lg mb-2 max-h-60 object-cover cursor-pointer" alt="Sent" />
                  )}

                  {msg.type === 'file' && msg.fileUrl && (
                    <div className="flex items-center gap-3 bg-black/5 p-3 rounded-xl mb-2">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                        <Paperclip size={20} />
                      </div>
                      <div className="flex-1 text-right overflow-hidden">
                        <p className="text-sm font-bold truncate">{msg.fileName}</p>
                        <a href={msg.fileUrl} download={msg.fileName} className="text-[10px] text-blue-500 hover:underline">تحميل الملف</a>
                      </div>
                    </div>
                  )}

                  <p className={`text-sm leading-relaxed text-right whitespace-pre-wrap ${msg.text.startsWith('`') ? 'font-mono bg-black/5 p-2 rounded' : ''} ${(msg as any).isSticker ? 'text-5xl py-2' : ''} ${senderProfile?.isPremium ? 'font-premium-1' : ''}`}>
                    {msg.text}
                  </p>

                  {/* Reactions Display */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 justify-end">
                      {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                        const ids = userIds as string[];
                        return (
                          <button
                            key={emoji}
                            onClick={() => addReaction(msg.id, emoji)}
                            className={`px-1.5 py-0.5 rounded-full text-xs flex items-center gap-1 border transition-all ${
                              ids.includes(auth.currentUser?.uid || '') 
                                ? 'bg-blue-100 border-blue-200 text-blue-600' 
                                : 'bg-gray-50 border-gray-100 text-gray-500'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span className="font-bold">{ids.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Reaction Picker (Simple) */}
                  <div className="absolute top-0 -left-12 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 bg-white p-1 rounded-lg shadow-md border border-gray-100 z-20">
                    {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                      <button 
                        key={emoji} 
                        onClick={() => addReaction(msg.id, emoji)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors text-sm"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-1 mt-1">
                    {msg.isEdited && <span className="text-[10px] text-gray-400 italic">معدلة</span>}
                    <span className="text-[10px] text-gray-400">
                      {msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && (
                      <span className={`text-[10px] ${msg.seenBy && msg.seenBy.length > 1 ? 'text-blue-400' : 'text-gray-400'}`}>
                        {msg.seenBy && msg.seenBy.length > 1 ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Message Actions Menu */}
                <div className="absolute top-0 -left-20 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 bg-white p-1 rounded-lg shadow-md border border-gray-100 z-20">
                  <button onClick={() => setReplyTo(msg)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="رد">
                    <Reply size={14} />
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(msg.text); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="نسخ">
                    <Copy size={14} />
                  </button>
                  <button onClick={() => setForwardingMessage(msg)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="تحويل">
                    <Send size={14} className="rotate-180" />
                  </button>
                  {(chat.createdBy === auth.currentUser?.uid || currentUserPermissions?.canPinMessages) && (
                    <button onClick={() => handlePinMessage(msg.id)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="تثبيت">
                      <Pin size={14} />
                    </button>
                  )}
                  {isMe && (
                    <button onClick={() => { setEditingMessage(msg); setInputText(msg.text); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="تعديل">
                      <Settings size={14} />
                    </button>
                  )}
                  {(isMe || currentUserPermissions?.canDeleteMessages) && (
                    <button onClick={() => handleDeleteMessage(msg.id)} className="p-1.5 hover:bg-gray-100 rounded text-red-500" title="حذف">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-gray-200 flex flex-col gap-2 flex-shrink-0">
        {/* Sticker Picker */}
        <div className="flex gap-2 overflow-x-auto p-1 custom-scrollbar">
          {['🚀', '💎', '🔥', '✨', '🎉', '🐱', '🐶', '🍕', '🌍', '🎮'].map(sticker => (
            <button 
              key={sticker}
              onClick={() => handleSendMessage(undefined, { url: sticker, name: 'sticker', type: 'sticker' })}
              className="text-2xl hover:scale-125 transition-transform p-1"
            >
              {sticker}
            </button>
          ))}
        </div>

        {replyTo && (
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border-r-4 border-blue-400">
            <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-red-500">
              <X size={16} />
            </button>
            <div className="text-right flex-1 px-2">
              <p className="text-xs font-bold text-blue-600">الرد على {replyTo.senderName}</p>
              <p className="text-xs text-gray-500 truncate">{replyTo.text}</p>
            </div>
            <Reply size={16} className="text-blue-400" />
          </div>
        )}

        {editingMessage && (
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border-r-4 border-green-400">
            <button onClick={() => { setEditingMessage(null); setInputText(''); }} className="text-gray-400 hover:text-red-500">
              <X size={16} />
            </button>
            <div className="text-right flex-1 px-2">
              <p className="text-xs font-bold text-green-600">تعديل الرسالة</p>
              <p className="text-xs text-gray-500 truncate">{editingMessage.text}</p>
            </div>
            <Settings size={16} className="text-green-400" />
          </div>
        )}

        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-400 hover:text-[#24a1de] transition-colors">
            <Smile size={24} />
          </button>
          <form onSubmit={(e) => handleSendMessage(e)} className="flex-1 flex items-center gap-2 min-w-0">
            <input
              type="text"
              placeholder={editingMessage ? "تعديل الرسالة..." : (isMutedInGroup ? "أنت مكتوم في هذه المجموعة" : (chat.type === 'group' && currentUserPermissions && !currentUserPermissions.canSendMessages ? "ليس لديك صلاحية للإرسال" : "اكتب رسالة..."))}
              disabled={isMutedInGroup || (chat.type === 'group' && currentUserPermissions && !currentUserPermissions.canSendMessages)}
              className="flex-1 min-w-0 py-2 px-4 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-[#24a1de] transition-all text-right disabled:opacity-50"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <label className={`p-2 text-gray-400 hover:text-[#24a1de] transition-colors cursor-pointer ${isMutedInGroup || (chat.type === 'group' && currentUserPermissions && !currentUserPermissions.canSendMedia) ? 'opacity-30 pointer-events-none' : ''}`}>
              <Paperclip size={24} />
              <input type="file" className="hidden" onChange={handleFileUpload} disabled={isMutedInGroup || (chat.type === 'group' && currentUserPermissions && !currentUserPermissions.canSendMedia)} />
            </label>
            <button
              type="submit"
              disabled={!inputText.trim() || isMutedInGroup || (chat.type === 'group' && currentUserPermissions && !currentUserPermissions.canSendMessages)}
              className="w-10 h-10 bg-[#24a1de] text-white rounded-full flex items-center justify-center hover:bg-[#1e88bc] transition-all disabled:opacity-50 disabled:bg-gray-300"
            >
              <Send size={20} className="rotate-180" />
            </button>
          </form>
        </div>
      </div>

      {showCall && (
        <CallOverlay
          userName={chat.name || 'مستخدم'}
          userPhoto={chat.photoURL}
          onClose={() => setShowCall(false)}
        />
      )}

      {showSettings && (
        <ChatSettings
          chat={chat}
          onClose={() => setShowSettings(false)}
        />
      )}

      <AnimatePresence>
        {forwardingMessage && (
          <ForwardModal 
            message={forwardingMessage} 
            onClose={() => setForwardingMessage(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};
