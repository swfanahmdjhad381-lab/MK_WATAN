import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { updateDoc, doc, getDoc, setDoc, deleteDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { UserProfile, OperationType } from '../types';
import { handleFirestoreError } from '../lib/firestore-utils';
import { X, Camera, User, Shield, Phone, Info, Check, AtSign, Star } from 'lucide-react';
import { motion } from 'motion/react';

interface SettingsProps {
  profile: UserProfile;
  onClose: () => void;
  onOpenAdmin: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ profile, onClose, onOpenAdmin }) => {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username || '');
  const [photoURL, setPhotoURL] = useState(profile.photoURL);
  const [videoPhotoURL, setVideoPhotoURL] = useState(profile.videoPhotoURL || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber || '');
  const [twoStepEnabled, setTwoStepEnabled] = useState(profile.twoStepEnabled || false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [usernameError, setUsernameError] = useState('');

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    setUsernameError('');

    try {
      // Check username uniqueness if changed
      if (username !== profile.username) {
        if (username.length < 3) {
          setUsernameError('اسم المستخدم قصير جداً');
          setSaving(false);
          return;
        }

        const usernameRef = doc(db, 'usernames', username.toLowerCase());
        const usernameSnap = await getDoc(usernameRef);

        if (usernameSnap.exists()) {
          setUsernameError('اسم المستخدم مأخوذ بالفعل');
          setSaving(false);
          return;
        }

        // Delete old username if exists
        if (profile.username) {
          await deleteDoc(doc(db, 'usernames', profile.username.toLowerCase()));
        }

        // Reserve new username
        await setDoc(usernameRef, { uid: auth.currentUser.uid });
      }

      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        displayName,
        username: username.toLowerCase(),
        photoURL,
        videoPhotoURL,
        bio,
        phoneNumber,
        twoStepEnabled
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    } finally {
      setSaving(false);
    }
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
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="p-4 bg-[#517da2] text-white flex justify-between items-center">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
          <h2 className="text-xl font-bold">الإعدادات</h2>
        </div>

        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 text-sm font-bold transition-all border-b-2 ${
              activeTab === 'profile' ? 'border-[#24a1de] text-[#24a1de]' : 'border-transparent text-gray-500'
            }`}
          >
            الملف الشخصي
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-3 text-sm font-bold transition-all border-b-2 ${
              activeTab === 'security' ? 'border-[#24a1de] text-[#24a1de]' : 'border-transparent text-gray-500'
            }`}
          >
            الأمان والخصوصية
          </button>
          <button
            onClick={() => (setActiveTab as any)('premium')}
            className={`flex-1 py-3 text-sm font-bold transition-all border-b-2 ${
              (activeTab as any) === 'premium' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500'
            }`}
          >
            الاشتراك المميز
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
          {profile.role === 'admin' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onOpenAdmin}
              className="w-full p-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-lg mb-4"
            >
              <Shield size={22} className="animate-pulse" />
              <span>فتح لوحة تحكم المسؤول</span>
            </motion.button>
          )}

          {activeTab === 'profile' ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center mb-6">
                <div className="relative group">
                  {profile.isPremium && videoPhotoURL ? (
                    <video 
                      src={videoPhotoURL} 
                      className="w-24 h-24 rounded-full object-cover border-4 border-yellow-400 shadow-md" 
                      autoPlay 
                      loop 
                      muted 
                      playsInline
                    />
                  ) : (
                    <img
                      src={photoURL || 'https://via.placeholder.com/150'}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-4 border-gray-100 shadow-md"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <button className="absolute bottom-0 right-0 p-2 bg-[#24a1de] text-white rounded-full shadow-lg hover:bg-[#1e88bc] transition-all">
                    <Camera size={16} />
                  </button>
                </div>
                <div className="w-full space-y-2 mt-4">
                  <input
                    type="text"
                    placeholder="رابط الصورة"
                    className="w-full px-4 py-2 bg-gray-50 rounded-xl text-xs text-right border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#24a1de]"
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                  />
                  {profile.isPremium && (
                    <input
                      type="text"
                      placeholder="رابط فيديو البروفايل (للمميزين فقط)"
                      className="w-full px-4 py-2 bg-yellow-50 rounded-xl text-xs text-right border border-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      value={videoPhotoURL}
                      onChange={(e) => setVideoPhotoURL(e.target.value)}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600 block text-right">الاسم المستعار</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    className="w-full pr-10 pl-4 py-3 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#24a1de] text-right border border-gray-100"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600 block text-right">اسم المستخدم (@)</label>
                <div className="relative">
                  <AtSign className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    className={`w-full pr-10 pl-4 py-3 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#24a1de] text-right border ${
                      usernameError ? 'border-red-500' : 'border-gray-100'
                    }`}
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    placeholder="username"
                  />
                </div>
                {usernameError && <p className="text-xs text-red-500 text-right">{usernameError}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600 block text-right">نبذة تعريفية</label>
                <div className="relative">
                  <Info className="absolute right-3 top-3 text-gray-400" size={18} />
                  <textarea
                    className="w-full pr-10 pl-4 py-3 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#24a1de] text-right border border-gray-100 min-h-[100px]"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : activeTab === 'security' ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600 block text-right">رقم الهاتف</label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    className="w-full pr-10 pl-4 py-3 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#24a1de] text-right border border-gray-100"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+966 50 000 0000"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <button
                  onClick={() => setTwoStepEnabled(!twoStepEnabled)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${
                    twoStepEnabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                      twoStepEnabled ? 'right-7' : 'right-1'
                    }`}
                  />
                </button>
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="font-bold text-gray-800">التحقق بخطوتين</span>
                    <Shield size={18} className="text-blue-500" />
                  </div>
                  <p className="text-xs text-gray-500">إضافة طبقة حماية إضافية لحسابك</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-right">
                <p className="text-xs text-blue-700 leading-relaxed">
                  نظام الحماية المتقدم يقوم بتشفير محادثاتك وتأمين بياناتك الشخصية ضد أي محاولات اختراق.
                </p>
              </div>
            </div>
          ) : (activeTab as any) === 'premium' ? (
            <div className="space-y-6">
              <div className="p-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl text-white text-center shadow-xl">
                <Star size={48} className="mx-auto mb-4 animate-bounce" fill="currentColor" />
                <h3 className="text-2xl font-black mb-2">الاشتراك المميز</h3>
                <p className="text-sm opacity-90">احصل على ميزات حصرية وادعم تطوير التطبيق</p>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-right">
                  <h4 className="font-bold text-gray-800 mb-1">خطة الشهر - 5$</h4>
                  <p className="text-xs text-gray-500">فيديو بروفايل + شارة التحقق + ميزات حصرية</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-right">
                  <h4 className="font-bold text-gray-800 mb-1">خطة السنة - 45$</h4>
                  <p className="text-xs text-gray-500">وفر 25% واحصل على دعم فني مباشر</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-200 text-right">
                  <h4 className="font-bold text-yellow-800 mb-1">خطة مدى الحياة - 99$</h4>
                  <p className="text-xs text-yellow-600">ادفع مرة واحدة واستمتع للأبد</p>
                </div>
              </div>

              <button
                onClick={async () => {
                  try {
                    const q = query(collection(db, 'users'), where('email', '==', 'sjdekhddjsaeb@gmail.com'));
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                      const admin = snap.docs[0].data() as UserProfile;
                      // We need to trigger startChat from here, but Settings doesn't have onSelectChat
                      // For now, let's just alert or find a way to notify the parent
                      alert('يرجى مراسلة المطور @' + admin.username + ' لتفعيل الاشتراك');
                    }
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="w-full py-4 bg-black text-white rounded-2xl font-black hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <span>تواصل مع المطور للاشتراك</span>
                <AtSign size={20} />
              </button>
            </div>
          ) : null}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-[#24a1de] text-white rounded-xl font-bold hover:bg-[#1e88bc] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check size={20} />
                <span>حفظ التغييرات</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
