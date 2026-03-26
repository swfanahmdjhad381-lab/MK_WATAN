import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AdminPanel } from './components/AdminPanel';
import { Settings } from './components/Settings';
import { VideoList } from './components/VideoList';
import { Chat, UserProfile, OperationType } from './types';
import { handleFirestoreError } from './lib/firestore-utils';
import { MessageSquare, Shield, Ban } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showVideos, setShowVideos] = useState(false);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          
          // Initial check/create
          const userSnap = await getDoc(userRef).catch(e => {
            handleFirestoreError(e, OperationType.GET, userRef.path);
            throw e;
          });
          
          const profileData: Partial<UserProfile> = {
            uid: currentUser.uid,
            displayName: currentUser.displayName || 'Anonymous',
            searchName: (currentUser.displayName || 'Anonymous').toLowerCase(),
            photoURL: currentUser.photoURL || '',
            email: currentUser.email || '',
            status: 'online',
            lastSeen: new Date().toISOString()
          };

          if (!userSnap.exists()) {
            const defaultUsername = `user_${currentUser.uid.substring(0, 5)}`.toLowerCase();
            const isAdmin = currentUser.email === 'sjdekhddjsaeb@gmail.com';
            const newProfile = {
              ...profileData,
              username: defaultUsername,
              role: isAdmin ? 'admin' : 'user',
              isPremium: isAdmin,
              bio: '',
              phoneNumber: '',
              twoStepEnabled: false,
              createdAt: serverTimestamp()
            };
            await setDoc(userRef, newProfile).catch(e => handleFirestoreError(e, OperationType.WRITE, userRef.path));
            await setDoc(doc(db, 'usernames', defaultUsername), { uid: currentUser.uid }).catch(e => handleFirestoreError(e, OperationType.WRITE, `usernames/${defaultUsername}`));
          } else {
            if (currentUser.email === 'sjdekhddjsaeb@gmail.com' && userSnap.data()?.role !== 'admin') {
              await setDoc(userRef, { role: 'admin', isPremium: true }, { merge: true }).catch(e => handleFirestoreError(e, OperationType.WRITE, userRef.path));
            }
            await setDoc(userRef, profileData, { merge: true }).catch(e => handleFirestoreError(e, OperationType.WRITE, userRef.path));
          }

          // Listen for profile changes
          if (unsubscribeProfile) unsubscribeProfile();
          unsubscribeProfile = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
              setUserProfile(doc.data() as UserProfile);
            }
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, userRef.path);
          });

        } catch (error) {
          console.error('Profile sync error:', error);
          // Don't block the app if profile sync fails, but maybe show a warning
        }
      } else {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setUserProfile(null);
      }
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#517da2]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (userProfile?.isBanned) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-600 text-white p-8 text-center" dir="rtl">
        <Ban size={64} className="mb-6 animate-pulse" />
        <h1 className="text-3xl font-black mb-4">تم حظر حسابك</h1>
        <p className="max-w-md text-lg opacity-90">
          لقد تم حظر حسابك من قبل إدارة التطبيق بسبب مخالفة القوانين. 
          {userProfile.isDeviceBanned && " كما تم حظر جهازك من الوصول للتطبيق نهائياً."}
        </p>
        <button 
          onClick={() => auth.signOut()}
          className="mt-8 px-8 py-3 bg-white text-red-600 rounded-2xl font-bold hover:bg-gray-100 transition-all"
        >
          تسجيل الخروج
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-gray-100 overflow-hidden font-sans" dir="rtl">
        {/* Sidebar */}
        <div className={`${selectedChat ? 'hidden md:block' : 'block'} w-full md:w-80 h-full`}>
          <Sidebar 
            onSelectChat={setSelectedChat} 
            onOpenSettings={() => setShowSettings(true)}
            onOpenVideos={() => setShowVideos(true)}
            onOpenAdmin={() => setShowAdminPanel(true)}
            selectedChatId={selectedChat?.id}
            userProfile={userProfile}
          />
        </div>

        {/* Main Content */}
        <div className={`flex-1 h-full relative ${!selectedChat ? 'hidden md:block' : 'block'}`}>
          {selectedChat ? (
            <ChatWindow 
              chat={selectedChat} 
              onBack={() => setSelectedChat(null)} 
              onSelectChat={setSelectedChat}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-[#f4f4f5] text-gray-400 p-8 text-center">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-6 opacity-50">
                <MessageSquare size={48} />
              </div>
              <h2 className="text-xl font-bold text-gray-600 mb-2">اختر محادثة للبدء</h2>
              <p className="max-w-xs">يمكنك البدء بمراسلة أصدقائك أو إنشاء مجموعات جديدة للتواصل مع الجميع.</p>
            </div>
          )}
        </div>

        {showAdminPanel && (
          <AdminPanel onClose={() => setShowAdminPanel(false)} />
        )}

        {showSettings && userProfile && (
          <Settings 
            profile={userProfile} 
            onClose={() => setShowSettings(false)} 
            onOpenAdmin={() => {
              setShowSettings(false);
              setShowAdminPanel(true);
            }}
          />
        )}

        {showVideos && (
          <VideoList onClose={() => setShowVideos(false)} />
        )}
      </div>
    </ErrorBoundary>
  );
}
