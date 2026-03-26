import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { UserProfile, OperationType } from '../types';
import { handleFirestoreError } from '../lib/firestore-utils';
import { X, Shield, Search, Ban, MicOff, Trash2, User, Check, AlertTriangle, Smartphone, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PremiumFeaturesList } from './PremiumFeaturesList';

interface AdminPanelProps {
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadAllUsers = async () => {
    setLoading(true);
    setSearchTerm('');
    try {
      const q = query(collection(db, 'users'), limit(500));
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(results);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllUsers();
  }, []);

  const searchUsers = async () => {
    const term = searchTerm.trim().toLowerCase().replace('@', '');
    if (!term) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('username', '>=', term),
        where('username', '<=', term + '\uf8ff'),
        limit(20)
      );
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(results);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBan = async (user: UserProfile) => {
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isBanned: !user.isBanned
      });
      setSelectedUser(prev => prev ? { ...prev, isBanned: !prev.isBanned } : null);
      setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, isBanned: !u.isBanned } : u));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleMute = async (user: UserProfile) => {
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isMuted: !user.isMuted
      });
      setSelectedUser(prev => prev ? { ...prev, isMuted: !prev.isMuted } : null);
      setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, isMuted: !u.isMuted } : u));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePremium = async (user: UserProfile) => {
    setActionLoading(true);
    try {
      const newPremiumStatus = !user.isPremium;
      await updateDoc(doc(db, 'users', user.uid), {
        isPremium: newPremiumStatus,
        premiumFeatures: newPremiumStatus ? {
          canSetVideoAsPhoto: true,
          canUseAnimatedStickers: true,
          canUseAdvancedThemes: true,
          canHideLastSeen: true,
        } : null
      });
      setSelectedUser(prev => prev ? { ...prev, isPremium: newPremiumStatus, premiumFeatures: newPremiumStatus ? {
          canSetVideoAsPhoto: true,
          canUseAnimatedStickers: true,
          canUseAdvancedThemes: true,
          canHideLastSeen: true,
        } : undefined } : null);
      setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, isPremium: newPremiumStatus, premiumFeatures: newPremiumStatus ? {
          canSetVideoAsPhoto: true,
          canUseAnimatedStickers: true,
          canUseAdvancedThemes: true,
          canHideLastSeen: true,
        } : undefined } : u));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleModerator = async (user: UserProfile) => {
    setActionLoading(true);
    try {
      const newRole = user.role === 'moderator' ? 'user' : 'moderator';
      await updateDoc(doc(db, 'users', user.uid), {
        role: newRole
      });
      setSelectedUser(prev => prev ? { ...prev, role: newRole } : null);
      setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, role: newRole } : u));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleDeviceBan = async (user: UserProfile) => {
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isDeviceBanned: !user.isDeviceBanned,
        isBanned: true // Device ban also implies account ban
      });
      setSelectedUser(prev => prev ? { ...prev, isDeviceBanned: !prev.isDeviceBanned, isBanned: true } : null);
      setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, isDeviceBanned: !u.isDeviceBanned, isBanned: true } : u));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAccount = async (user: UserProfile) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الحساب نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    setActionLoading(true);
    try {
      // Delete user document
      await deleteDoc(doc(db, 'users', user.uid));
      // Delete username mapping
      if (user.username) {
        await deleteDoc(doc(db, 'usernames', user.username));
      }
      setUsers(prev => prev.filter(u => u.uid !== user.uid));
      setSelectedUser(null);
      alert('تم حذف الحساب بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-red-600 via-orange-600 to-red-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black">لوحة تحكم المسؤول</h2>
              <p className="text-xs opacity-80">إدارة المستخدمين والرقابة العامة</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {/* Search Section */}
          <div className="mb-8 flex gap-2">
            <div className="relative group flex-1">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors" size={20} />
              <input
                type="text"
                placeholder="البحث عن مستخدم باليوزر نيم..."
                className="w-full pr-12 pl-20 py-4 bg-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 text-right font-bold transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
              />
              <button 
                onClick={searchUsers}
                className="absolute left-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors"
              >
                بحث
              </button>
            </div>
            <button 
              onClick={loadAllUsers}
              className="px-4 py-4 bg-gray-100 text-gray-700 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-colors flex-shrink-0"
            >
              عرض الكل
            </button>
          </div>

          {/* Results / Selected User */}
          <div className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : selectedUser ? (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1 justify-end w-full"
                >
                  <span>العودة للنتائج</span>
                  <ArrowRight size={16} />
                </button>

                <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 flex items-center gap-4 text-right">
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-gray-800">{selectedUser.displayName}</h3>
                    <p className="text-sm text-gray-500">@{selectedUser.username}</p>
                    <div className="flex gap-2 justify-end mt-2">
                      {selectedUser.isBanned && <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] rounded-full font-bold">محظور</span>}
                      {selectedUser.isMuted && <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] rounded-full font-bold">مكتوم</span>}
                      {selectedUser.isDeviceBanned && <span className="px-2 py-0.5 bg-black text-white text-[10px] rounded-full font-bold">حظر جهاز</span>}
                    </div>
                  </div>
                  <div className="w-20 h-20 rounded-3xl bg-gray-200 overflow-hidden border-4 border-white shadow-lg">
                    {selectedUser.photoURL ? (
                      <img src={selectedUser.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <User size={32} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleTogglePremium(selectedUser)}
                    disabled={actionLoading}
                    className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all ${
                      selectedUser.isPremium 
                        ? 'bg-yellow-50 text-yellow-600 border border-yellow-200 hover:bg-yellow-100' 
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Star size={24} className={selectedUser.isPremium ? "fill-yellow-500" : ""} />
                    <span className="font-bold text-sm">{selectedUser.isPremium ? 'إلغاء الاشتراك المميز' : 'تفعيل الاشتراك المميز'}</span>
                  </button>

                  <button
                    onClick={() => handleToggleModerator(selectedUser)}
                    disabled={actionLoading}
                    className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all ${
                      selectedUser.role === 'moderator'
                        ? 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100' 
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Shield size={24} className={selectedUser.role === 'moderator' ? "fill-blue-500" : ""} />
                    <span className="font-bold text-sm">{selectedUser.role === 'moderator' ? 'إلغاء الإشراف' : 'تعيين مشرف'}</span>
                  </button>

                  <button
                    onClick={() => handleToggleBan(selectedUser)}
                    disabled={actionLoading}
                    className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all ${
                      selectedUser.isBanned 
                        ? 'bg-green-50 text-green-600 border border-green-100 hover:bg-green-100' 
                        : 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100'
                    }`}
                  >
                    <Ban size={24} />
                    <span className="font-bold text-sm">{selectedUser.isBanned ? 'إلغاء الحظر' : 'حظر الحساب'}</span>
                  </button>

                  <button
                    onClick={() => handleToggleMute(selectedUser)}
                    disabled={actionLoading}
                    className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all ${
                      selectedUser.isMuted 
                        ? 'bg-green-50 text-green-600 border border-green-100 hover:bg-green-100' 
                        : 'bg-orange-50 text-orange-600 border border-orange-100 hover:bg-orange-100'
                    }`}
                  >
                    <MicOff size={24} />
                    <span className="font-bold text-sm">{selectedUser.isMuted ? 'إلغاء الكتم' : 'كتم المستخدم'}</span>
                  </button>

                  <button
                    onClick={() => handleToggleDeviceBan(selectedUser)}
                    disabled={actionLoading}
                    className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all ${
                      selectedUser.isDeviceBanned 
                        ? 'bg-green-50 text-green-600 border border-green-100 hover:bg-green-100' 
                        : 'bg-black text-white hover:bg-gray-900'
                    }`}
                  >
                    <Smartphone size={24} />
                    <span className="font-bold text-sm">{selectedUser.isDeviceBanned ? 'إلغاء حظر الجهاز' : 'حظر الجهاز نهائياً'}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteAccount(selectedUser)}
                    disabled={actionLoading}
                    className="p-4 bg-red-600 text-white rounded-2xl flex flex-col items-center gap-2 hover:bg-red-700 transition-all shadow-lg"
                  >
                    <Trash2 size={24} />
                    <span className="font-bold text-sm">حذف الحساب نهائياً</span>
                  </button>
                </div>

                <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-3 text-right">
                  <AlertTriangle className="text-red-500 flex-shrink-0" size={20} />
                  <p className="text-xs text-red-700 leading-relaxed">
                    تحذير: الإجراءات المتخذة هنا تؤثر بشكل مباشر على قدرة المستخدم على الوصول للتطبيق. حظر الجهاز يمنع المستخدم من الدخول حتى لو قام بإنشاء حساب جديد.
                  </p>
                </div>

                <PremiumFeaturesList />
              </motion.div>
            ) : (
              <div className="space-y-2">
                {users.map(user => (
                  <button
                    key={user.uid}
                    onClick={() => setSelectedUser(user)}
                    className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-100 flex items-center gap-3 transition-all text-right"
                  >
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">{user.displayName}</p>
                      <p className="text-xs text-gray-500">@{user.username}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gray-200 overflow-hidden">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <User size={20} />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
                {users.length === 0 && !loading && (
                  <div className="py-12 text-center text-gray-400">
                    <Search size={48} className="mx-auto mb-2 opacity-10" />
                    <p className="text-sm">لا يوجد مستخدمين لعرضهم</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ArrowRight = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m9 18 6-6-6-6"/>
  </svg>
);
