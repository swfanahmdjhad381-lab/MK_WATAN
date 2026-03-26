import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, updateDoc, getDocs, collection, query, where, orderBy } from 'firebase/firestore';
import { Chat, UserProfile, ChatAdmin, ChatPermissions, OperationType } from '../types';
import { handleFirestoreError } from '../lib/firestore-utils';
import { X, Shield, UserPlus, Trash2, Check, Star, Ban, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatSettingsProps {
  chat: Chat;
  onClose: () => void;
}

const DEFAULT_PERMISSIONS: ChatPermissions = {
  canChangeInfo: true,
  canDeleteMessages: true,
  canBanUsers: true,
  canInviteUsers: true,
  canPinMessages: true,
  canManageVideoChats: true,
  canAddAdmins: false,
  canSendMessages: true,
  canSendMedia: true,
  canSendStickers: true,
  canSendPolls: true,
  canEmbedLinks: true,
  canAddUsers: true,
};

export const ChatSettings: React.FC<ChatSettingsProps> = ({ chat, onClose }) => {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAdmin, setEditingAdmin] = useState<ChatAdmin | null>(null);
  const [isPublic, setIsPublic] = useState(chat.isPublic || false);
  const [username, setUsername] = useState(chat.username || '');
  const [chatName, setChatName] = useState(chat.name || '');
  const [chatPhoto, setChatPhoto] = useState(chat.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const membersList: UserProfile[] = [];
        for (const uid of chat.memberIds) {
          const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)));
          if (!userSnap.empty) {
            membersList.push(userSnap.docs[0].data() as UserProfile);
          }
        }
        setMembers(membersList);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching members:', error);
      }
    };
    fetchMembers();
  }, [chat.memberIds]);

  const isOwner = chat.createdBy === auth.currentUser?.uid;
  const currentUserAdmin = chat.admins?.[auth.currentUser?.uid || ''];
  const canAddAdmins = isOwner || currentUserAdmin?.permissions.canAddAdmins;
  const canChangeInfo = isOwner || currentUserAdmin?.permissions.canChangeInfo;
  const canBanUsers = isOwner || currentUserAdmin?.permissions.canBanUsers;

  const promoteToAdmin = async (uid: string) => {
    if (!canAddAdmins) return;

    const updatedAdmins = {
      ...(chat.admins || {}),
      [uid]: {
        permissions: { ...DEFAULT_PERMISSIONS }
      }
    };

    try {
      await updateDoc(doc(db, 'chats', chat.id), { admins: updatedAdmins });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chats/${chat.id}`);
    }
  };

  const removeAdmin = async (uid: string) => {
    if (!isOwner) return;
    const updatedAdmins = { ...(chat.admins || {}) };
    delete updatedAdmins[uid];
    try {
      await updateDoc(doc(db, 'chats', chat.id), { admins: updatedAdmins });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chats/${chat.id}`);
    }
  };

  const updatePermissions = async (uid: string, permissions: ChatPermissions) => {
    if (!isOwner) return;
    const updatedAdmins = {
      ...(chat.admins || {}),
      [uid]: {
        ...chat.admins?.[uid],
        permissions
      }
    };
    try {
      await updateDoc(doc(db, 'chats', chat.id), { admins: updatedAdmins });
      setEditingAdmin(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chats/${chat.id}`);
    }
  };

  const handleSaveGeneralSettings = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'chats', chat.id), {
        name: chatName,
        photoURL: chatPhoto,
        isPublic,
        username: isPublic ? username.toLowerCase().replace('@', '') : null,
        inviteLink: isPublic ? `${window.location.origin}/join/${username.replace('@', '')}` : null
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chats/${chat.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleBanUser = async (uid: string) => {
    if (!canBanUsers) return;
    const bannedUserIds = chat.bannedUserIds || [];
    const isBanned = bannedUserIds.includes(uid);
    const updatedBanned = isBanned 
      ? bannedUserIds.filter(id => id !== uid)
      : [...bannedUserIds, uid];
    
    try {
      await updateDoc(doc(db, 'chats', chat.id), { 
        bannedUserIds: updatedBanned,
        // If banning, also remove from members
        memberIds: isBanned ? chat.memberIds : chat.memberIds.filter(id => id !== uid)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chats/${chat.id}`);
    }
  };

  const toggleMuteUser = async (uid: string) => {
    if (!canBanUsers) return;
    const mutedUserIds = chat.mutedUserIds || [];
    const isMuted = mutedUserIds.includes(uid);
    const updatedMuted = isMuted 
      ? mutedUserIds.filter(id => id !== uid)
      : [...mutedUserIds, uid];
    
    try {
      await updateDoc(doc(db, 'chats', chat.id), { mutedUserIds: updatedMuted });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chats/${chat.id}`);
    }
  };

  const permissionLabels: Record<keyof ChatPermissions, string> = {
    canChangeInfo: 'تغيير معلومات المجموعة',
    canDeleteMessages: 'حذف رسائل الآخرين',
    canBanUsers: 'حظر المستخدمين',
    canInviteUsers: 'دعوة مستخدمين عبر رابط',
    canPinMessages: 'تثبيت الرسائل',
    canManageVideoChats: 'إدارة المحادثات المرئية',
    canAddAdmins: 'إضافة مشرفين جدد',
    canSendMessages: 'إرسال الرسائل',
    canSendMedia: 'إرسال الوسائط',
    canSendStickers: 'إرسال الملصقات',
    canSendPolls: 'إرسال الاستطلاعات',
    canEmbedLinks: 'تضمين الروابط',
    canAddUsers: 'إضافة أعضاء مباشرة',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
      >
        <div className="p-4 bg-[#517da2] text-white flex justify-between items-center">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">إعدادات المجموعة</h2>
            <Shield size={24} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center p-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#24a1de]"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* General Settings */}
              {(isOwner || canChangeInfo) && (
                <div className="bg-gray-50 p-4 rounded-2xl space-y-4 border border-gray-100">
                  <h3 className="font-bold text-gray-800 text-right">إعدادات القناة</h3>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 block text-right">اسم القناة</label>
                    <input
                      type="text"
                      placeholder="اسم القناة"
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#24a1de] text-right text-sm font-bold"
                      value={chatName}
                      onChange={(e) => setChatName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 block text-right">رابط صورة القناة</label>
                    <input
                      type="text"
                      placeholder="رابط الصورة"
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#24a1de] text-right text-sm"
                      value={chatPhoto}
                      onChange={(e) => setChatPhoto(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
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
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="اسم المستخدم للقناة"
                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#24a1de] text-right text-sm"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                      {chat.inviteLink && (
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg text-[10px] break-all text-center font-mono">
                          {chat.inviteLink}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleSaveGeneralSettings}
                    disabled={isSaving}
                    className="w-full py-2 bg-[#24a1de] text-white rounded-xl text-sm font-bold hover:bg-[#1e88bc] transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات العامة'}
                  </button>
                </div>
              )}

              <section>
                <h3 className="text-sm font-bold text-gray-400 mb-4 text-right uppercase tracking-wider">الأعضاء والمشرفون</h3>
                <div className="space-y-3">
                  {members.map(member => {
                    const adminPermissions = chat.admins?.[member.uid]?.permissions;
                    const isChatOwner = chat.createdBy === member.uid;
                    const isBanned = chat.bannedUserIds?.includes(member.uid);
                    const isMuted = chat.mutedUserIds?.includes(member.uid);
                    
                    return (
                      <div key={member.uid} className={`flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100 ${isBanned ? 'opacity-50 grayscale' : ''}`}>
                        <div className="flex items-center gap-2">
                          {!isChatOwner && member.uid !== auth.currentUser?.uid && (
                            <div className="flex gap-2">
                              {canBanUsers && (
                                <>
                                  <button 
                                    onClick={() => toggleMuteUser(member.uid)}
                                    className={`p-2 rounded-full transition-colors ${isMuted ? 'text-orange-500 bg-orange-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                    title={isMuted ? "إلغاء الكتم" : "كتم من المجموعة"}
                                  >
                                    <VolumeX size={18} />
                                  </button>
                                  <button 
                                    onClick={() => toggleBanUser(member.uid)}
                                    className={`p-2 rounded-full transition-colors ${isBanned ? 'text-red-600 bg-red-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                    title={isBanned ? "إلغاء الحظر" : "حظر من المجموعة"}
                                  >
                                    <Ban size={18} />
                                  </button>
                                </>
                              )}
                              {adminPermissions ? (
                                <>
                                  {isOwner && (
                                    <>
                                      <button 
                                        onClick={() => setEditingAdmin({ uid: member.uid, permissions: adminPermissions })}
                                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                                        title="تعديل الصلاحيات"
                                      >
                                        <Shield size={18} />
                                      </button>
                                      <button 
                                        onClick={() => removeAdmin(member.uid)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                        title="إزالة من الإشراف"
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                    </>
                                  )}
                                </>
                              ) : (
                                canAddAdmins && !isBanned && (
                                  <button 
                                    onClick={() => promoteToAdmin(member.uid)}
                                    className="p-2 text-green-500 hover:bg-green-50 rounded-full transition-colors"
                                    title="ترقية لمشرف"
                                  >
                                    <UserPlus size={18} />
                                  </button>
                                )
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 text-right">
                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1">
                              {member.isPremium && <Star size={12} className="text-yellow-500" fill="currentColor" />}
                              <span className="font-bold text-gray-800">{member.displayName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {isChatOwner ? (
                                <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">المالك</span>
                              ) : adminPermissions ? (
                                <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-bold">مشرف</span>
                              ) : isBanned ? (
                                <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">محظور</span>
                              ) : isMuted ? (
                                <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold">مكتوم</span>
                              ) : null}
                              <span className="text-xs text-gray-500">@{member.username}</span>
                            </div>
                          </div>
                          <img 
                            src={member.photoURL} 
                            alt={member.displayName} 
                            className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
        </div>
      </motion.div>

      {/* Permissions Modal */}
      <AnimatePresence>
        {editingAdmin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[110] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-4 bg-[#24a1de] text-white font-bold text-center">صلاحيات المشرف</div>
              <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                {Object.entries(permissionLabels).map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors">
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${editingAdmin.permissions[key as keyof ChatPermissions] ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={editingAdmin.permissions[key as keyof ChatPermissions]}
                        onChange={(e) => {
                          setEditingAdmin({
                            ...editingAdmin,
                            permissions: {
                              ...editingAdmin.permissions,
                              [key]: e.target.checked
                            }
                          });
                        }}
                      />
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${editingAdmin.permissions[key as keyof ChatPermissions] ? 'left-6' : 'left-1'}`} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
              <div className="p-4 border-t border-gray-100 flex gap-3">
                <button 
                  onClick={() => setEditingAdmin(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  إلغاء
                </button>
                <button 
                  onClick={() => updatePermissions(editingAdmin.uid, editingAdmin.permissions)}
                  className="flex-1 py-3 bg-[#24a1de] text-white rounded-xl font-bold hover:bg-[#1e88bc] transition-colors"
                >
                  حفظ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
