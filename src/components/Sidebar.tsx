import React, { useState, useEffect } from 'react';
import { db, auth, logout } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, getDocs, limit } from 'firebase/firestore';
import { Chat, UserProfile, OperationType } from '../types';
import { handleFirestoreError } from '../lib/firestore-utils';
import { Search, Plus, LogOut, Users, MessageSquare, Star, Settings as SettingsIcon, Video as VideoIcon, Shield, AtSign } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  onSelectChat: (chat: Chat) => void;
  onOpenSettings: () => void;
  onOpenVideos: () => void;
  onOpenAdmin: () => void;
  selectedChatId?: string;
  userProfile: UserProfile | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  onSelectChat, 
  onOpenSettings, 
  onOpenVideos, 
  onOpenAdmin,
  selectedChatId,
  userProfile
}) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [groupUsername, setGroupUsername] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  const handleCreateGroup = async () => {
    if (!groupName || !auth.currentUser) return;
    if (isPublic && !groupUsername) {
      alert('يرجى إدخال اسم مستخدم للقناة العامة');
      return;
    }

    try {
      const newChat: any = {
        type: 'group',
        name: groupName,
        isPublic: isPublic,
        memberIds: [...selectedUsers, auth.currentUser.uid],
        createdBy: auth.currentUser.uid,
        lastMessage: isPublic ? 'تم إنشاء القناة' : 'تم إنشاء المجموعة',
        lastMessageTime: serverTimestamp(),
      };

      if (isPublic && groupUsername) {
        newChat.username = groupUsername.toLowerCase().replace('@', '');
        newChat.inviteLink = `${window.location.origin}/join/${groupUsername.replace('@', '')}`;
      }

      await addDoc(collection(db, 'chats'), newChat);
      setShowCreateGroup(false);
      setGroupName('');
      setGroupUsername('');
      setSelectedUsers([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chats');
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchTerm.trim().toLowerCase().replace('@', '');
    if (!term) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = new Map<string, UserProfile>();

      // Username exact match
      const q1 = query(collection(db, 'users'), where('username', '==', term), limit(5));
      const snap1 = await getDocs(q1);
      snap1.docs.forEach(doc => results.set(doc.id, doc.data() as UserProfile));
      
      // Username prefix match
      const q2 = query(collection(db, 'users'), where('username', '>=', term), where('username', '<=', term + '\uf8ff'), limit(5));
      const snap2 = await getDocs(q2);
      snap2.docs.forEach(doc => results.set(doc.id, doc.data() as UserProfile));

      // DisplayName exact match
      const q3 = query(collection(db, 'users'), where('displayName', '==', searchTerm.trim()), limit(5));
      const snap3 = await getDocs(q3);
      snap3.docs.forEach(doc => results.set(doc.id, doc.data() as UserProfile));

      // DisplayName prefix match
      const q4 = query(collection(db, 'users'), where('displayName', '>=', searchTerm.trim()), where('displayName', '<=', searchTerm.trim() + '\uf8ff'), limit(5));
      const snap4 = await getDocs(q4);
      snap4.docs.forEach(doc => results.set(doc.id, doc.data() as UserProfile));
      
      setSearchResults(Array.from(results.values()));
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const startChat = async (targetUser: UserProfile) => {
    if (!auth.currentUser) return;
    
    try {
      // Check if private chat already exists
      const q = query(
        collection(db, 'chats'),
        where('type', '==', 'private'),
        where('memberIds', 'array-contains', auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      
      const existingChat = snapshot.docs.find(doc => {
        const data = doc.data() as Chat;
        return data.memberIds.includes(targetUser.uid);
      });

      if (existingChat) {
        onSelectChat({ id: existingChat.id, ...existingChat.data() } as Chat);
      } else {
        // Create new private chat
        const newChat: any = {
          type: 'private',
          memberIds: [auth.currentUser.uid, targetUser.uid],
          createdBy: auth.currentUser.uid,
          lastMessage: 'بدأت محادثة جديدة',
          lastMessageTime: serverTimestamp(),
          name: targetUser.displayName, // For private chats, we'll use the other user's name
          photoURL: targetUser.photoURL
        };
        const docRef = await addDoc(collection(db, 'chats'), newChat);
        onSelectChat({ id: docRef.id, ...newChat });
      }
      setIsSearching(false);
      setSearchTerm('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chats');
    }
  };

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, 'users'), limit(50));
      const snapshot = await getDocs(q);
      const userList = snapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(userList.filter(u => u.uid !== auth.currentUser?.uid));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    }
  };

  useEffect(() => {
    if (showCreateGroup) {
      fetchUsers();
    }
  }, [showCreateGroup]);

  const filteredChats = chats.filter(chat => 
    chat.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    chat.type === 'private' ||
    chat.type === 'saved'
  );

  const handleOpenSavedMessages = async () => {
    if (!auth.currentUser) return;
    
    try {
      // Check if saved messages chat exists
      const q = query(
        collection(db, 'chats'),
        where('type', '==', 'saved'),
        where('memberIds', 'array-contains', auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        onSelectChat({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Chat);
      } else {
        // Create new saved messages chat
        const newChat: any = {
          type: 'saved',
          name: 'الرسائل المحفوظة',
          memberIds: [auth.currentUser.uid],
          createdBy: auth.currentUser.uid,
          lastMessage: 'مرحباً بك في الرسائل المحفوظة',
          lastMessageTime: serverTimestamp(),
        };
        const docRef = await addDoc(collection(db, 'chats'), newChat);
        onSelectChat({ id: docRef.id, ...newChat });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chats');
    }
  };

  return (
    <div className="w-full h-full bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-[#517da2] text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            <button onClick={logout} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <LogOut size={20} />
            </button>
            <button onClick={onOpenVideos} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <VideoIcon size={20} />
            </button>
            <button onClick={onOpenSettings} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <SettingsIcon size={20} />
            </button>
            <button onClick={handleOpenSavedMessages} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="الرسائل المحفوظة">
              <Star size={20} />
            </button>
            {userProfile?.role === 'admin' && (
              <button 
                onClick={onOpenAdmin} 
                className="p-2.5 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.6)] hover:scale-110 transition-all animate-pulse flex items-center justify-center border-2 border-white/30"
                title="لوحة تحكم المسؤول"
              >
                <Shield size={22} className="text-white" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 text-right">
            <div className="flex flex-col">
              <span className="font-bold text-sm truncate max-w-[120px]">{userProfile?.displayName}</span>
              <span className="text-[10px] opacity-70">@{userProfile?.username || 'no_username'}</span>
            </div>
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-2 border-white/20">
                {userProfile?.isPremium && userProfile?.videoPhotoURL ? (
                  <video 
                    src={userProfile.videoPhotoURL} 
                    className="w-full h-full object-cover" 
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                  />
                ) : userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Users size={20} />
                )}
              </div>
              {userProfile?.isPremium && (
                <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5 shadow-sm">
                  <Star size={8} className="text-white" fill="currentColor" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-white" size={18} />
          <input
            type="text"
            placeholder="البحث عن مستخدم (@username)..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#40688a] text-white placeholder-white/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-white/30 transition-all text-right"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </form>
      </div>

      {/* Chat List / Search Results */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isSearching ? (
          <div className="p-2">
            <div className="flex justify-between items-center px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <button onClick={() => setIsSearching(false)} className="text-[#24a1de] hover:underline">إغلاق</button>
              <span>نتائج البحث</span>
            </div>
            {searchResults.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <AtSign size={48} className="mx-auto mb-2 opacity-10" />
                <p className="text-sm">لم يتم العثور على مستخدم بهذا الاسم</p>
              </div>
            ) : (
              searchResults.map((result) => (
                <button
                  key={result.uid}
                  onClick={() => startChat(result)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 relative">
                    {result.isPremium && result.videoPhotoURL ? (
                      <video 
                        src={result.videoPhotoURL} 
                        className="w-full h-full object-cover" 
                        autoPlay 
                        loop 
                        muted 
                        playsInline
                      />
                    ) : (
                      <img 
                        src={result.photoURL || 'https://via.placeholder.com/400'} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                  <div className="text-right flex-1">
                    <div className="flex items-center justify-end gap-1">
                      {result.isPremium && <Star size={12} className="text-yellow-500" fill="currentColor" />}
                      <p className="font-bold text-gray-800">{result.displayName}</p>
                    </div>
                    <p className="text-xs text-gray-500">@{result.username || 'no_username'}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
            <MessageSquare size={48} className="mb-4 opacity-20" />
            <p>لا توجد محادثات بعد</p>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat)}
              className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                selectedChatId === chat.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-[#24a1de] flex items-center justify-center text-white flex-shrink-0 overflow-hidden relative">
                {chat.type === 'private' ? (
                  (() => {
                    const otherUser = users.find(u => chat.memberIds.includes(u.uid) && u.uid !== auth.currentUser?.uid);
                    if (otherUser?.isPremium && otherUser?.videoPhotoURL) {
                      return (
                        <video 
                          src={otherUser.videoPhotoURL} 
                          className="w-full h-full object-cover" 
                          autoPlay 
                          loop 
                          muted 
                          playsInline
                        />
                      );
                    }
                    return chat.photoURL ? (
                      <img src={chat.photoURL} alt={chat.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-lg font-bold">{chat.name?.[0] || 'U'}</span>
                    );
                  })()
                ) : chat.photoURL ? (
                  <img src={chat.photoURL} alt={chat.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  chat.type === 'group' ? <Users size={24} /> : <span className="text-lg font-bold">{chat.name?.[0] || 'U'}</span>
                )}
              </div>
              <div className="flex-1 text-right overflow-hidden">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1 overflow-hidden">
                    <span className="text-xs text-gray-400">
                      {chat.lastMessageTime?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {chat.type === 'private' && users.find(u => chat.memberIds.includes(u.uid) && u.uid !== auth.currentUser?.uid)?.isPremium && (
                      <Star size={14} className="text-yellow-500" fill="currentColor" />
                    )}
                    <span className="font-bold text-gray-800 truncate">{chat.name || 'محادثة خاصة'}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p>
              </div>
            </button>
          )))
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowCreateGroup(true)}
        className="absolute bottom-6 left-6 w-14 h-14 bg-[#24a1de] text-white rounded-full shadow-lg hover:bg-[#1e88bc] transition-all flex items-center justify-center z-10"
      >
        <Plus size={28} />
      </button>

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreateGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-4 bg-[#517da2] text-white font-bold text-lg text-center">إنشاء مجموعة جديدة</div>
              <div className="p-6 space-y-4">
                <input
                  type="text"
                  placeholder="اسم المجموعة"
                  className="w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#24a1de] text-right"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsPublic(!isPublic)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${isPublic ? 'bg-blue-500' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isPublic ? 'left-7' : 'left-1'}`} />
                    </button>
                    <span className="text-sm font-bold text-gray-700">{isPublic ? 'قناة عامة' : 'قناة خاصة'}</span>
                  </div>
                  <span className="text-sm text-gray-500">نوع القناة</span>
                </div>

                {isPublic && (
                  <input
                    type="text"
                    placeholder="اسم المستخدم للقناة (مثال: @mychannel)"
                    className="w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#24a1de] text-right"
                    value={groupUsername}
                    onChange={(e) => setGroupUsername(e.target.value)}
                  />
                )}

                <div className="max-h-60 overflow-y-auto space-y-2">
                  <p className="text-sm text-gray-500 mb-2 text-right">اختر الأعضاء:</p>
                  {users.map(user => (
                    <label key={user.uid} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-gray-300 text-[#24a1de] focus:ring-[#24a1de]"
                        checked={selectedUsers.includes(user.uid)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedUsers([...selectedUsers, user.uid]);
                          else setSelectedUsers(selectedUsers.filter(id => id !== user.uid));
                        }}
                      />
                      <div className="flex-1 text-right flex items-center gap-3 justify-end">
                        <span className="font-medium">{user.displayName}</span>
                        <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowCreateGroup(false)}
                    className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleCreateGroup}
                    disabled={!groupName}
                    className="flex-1 py-3 bg-[#24a1de] text-white rounded-xl font-bold hover:bg-[#1e88bc] transition-colors disabled:opacity-50"
                  >
                    إنشاء
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
