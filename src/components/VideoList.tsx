import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { Video, OperationType } from '../types';
import { handleFirestoreError } from '../lib/firestore-utils';
import { X, Plus, Play, Trash2, Video as VideoIcon, Info, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VideoListProps {
  onClose: () => void;
}

export const VideoList: React.FC<VideoListProps> = ({ onClose }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [communityVideos, setCommunityVideos] = useState<Video[]>([]);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoDesc, setNewVideoDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'community'>('my');

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'users', auth.currentUser.uid, 'videos'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const videoList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Video));
      setVideos(videoList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${auth.currentUser?.uid}/videos`);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Fetch community videos (this is a bit complex in Firestore without a root collection, 
    // but for now we'll fetch from a dedicated 'public_videos' collection or similar.
    // Actually, let's create a root 'videos' collection for public access as well.)
    const q = query(
      collection(db, 'public_videos'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const videoList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Video));
      setCommunityVideos(videoList);
    }, (error) => {
      console.error('Error fetching community videos:', error);
    });

    return () => unsubscribe();
  }, []);

  const handleAddVideo = async () => {
    if (!newVideoUrl || !newVideoTitle || !auth.currentUser) return;
    setSaving(true);
    try {
      const videoData = {
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Anonymous',
        url: newVideoUrl,
        title: newVideoTitle,
        description: newVideoDesc,
        timestamp: serverTimestamp(),
      };

      // Add to user's private list
      const docRef = await addDoc(collection(db, 'users', auth.currentUser.uid, 'videos'), videoData);
      
      // Also add to public list
      await setDoc(doc(db, 'public_videos', docRef.id), {
        ...videoData,
        id: docRef.id
      });

      setShowAddVideo(false);
      setNewVideoUrl('');
      setNewVideoTitle('');
      setNewVideoDesc('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${auth.currentUser.uid}/videos`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'videos', videoId));
      await deleteDoc(doc(db, 'public_videos', videoId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${auth.currentUser.uid}/videos/${videoId}`);
    }
  };

  const displayedVideos = activeTab === 'my' ? videos : communityVideos;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
      >
        <div className="p-6 bg-[#517da2] text-white flex justify-between items-center">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">الفيديوهات</h2>
            <VideoIcon size={24} />
          </div>
        </div>

        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('my')}
            className={`flex-1 py-3 text-sm font-bold transition-all border-b-2 ${
              activeTab === 'my' ? 'border-[#24a1de] text-[#24a1de]' : 'border-transparent text-gray-500'
            }`}
          >
            فيديوهاتي
          </button>
          <button
            onClick={() => setActiveTab('community')}
            className={`flex-1 py-3 text-sm font-bold transition-all border-b-2 ${
              activeTab === 'community' ? 'border-[#24a1de] text-[#24a1de]' : 'border-transparent text-gray-500'
            }`}
          >
            المجتمع
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {displayedVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-center">
              <VideoIcon size={64} className="mb-4 opacity-20" />
              <p>{activeTab === 'my' ? 'لا توجد فيديوهات في قائمتك بعد' : 'لا توجد فيديوهات عامة بعد'}</p>
              {activeTab === 'my' && (
                <button
                  onClick={() => setShowAddVideo(true)}
                  className="mt-4 px-6 py-2 bg-[#24a1de] text-white rounded-xl font-bold hover:bg-[#1e88bc] transition-all"
                >
                  إضافة فيديو أول
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayedVideos.map((video) => (
                <motion.div
                  key={video.id}
                  layout
                  className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex flex-col"
                >
                  <div className="aspect-video bg-black relative group">
                    <video
                      src={video.url}
                      className="w-full h-full object-cover opacity-80"
                      poster="https://via.placeholder.com/400x225?text=Video+Preview"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 bg-[#24a1de] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                      >
                        <Play size={24} fill="currentColor" />
                      </a>
                    </div>
                  </div>
                  <div className="p-4 flex-1 text-right flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      {activeTab === 'my' ? (
                        <button
                          onClick={() => handleDeleteVideo(video.id)}
                          className="p-2 text-red-400 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      ) : (
                        <div className="text-xs font-bold text-[#24a1de] bg-blue-50 px-2 py-1 rounded-lg">
                          {video.userName}
                        </div>
                      )}
                      <h3 className="font-bold text-gray-800 truncate flex-1">{video.title}</h3>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-4">{video.description}</p>
                    <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
                      <span>{video.timestamp?.toDate().toLocaleDateString('ar-SA')}</span>
                      <div className="flex items-center gap-1">
                        <ExternalLink size={12} />
                        <span className="truncate max-w-[100px]">{video.url}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100">
          <button
            onClick={() => setShowAddVideo(true)}
            className="w-full py-3 bg-[#24a1de] text-white rounded-xl font-bold hover:bg-[#1e88bc] transition-all flex items-center justify-center gap-2 shadow-md"
          >
            <Plus size={20} />
            <span>إضافة فيديو جديد</span>
          </button>
        </div>
      </motion.div>

      {/* Add Video Modal */}
      <AnimatePresence>
        {showAddVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[110] flex items-center justify-center p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-4 bg-[#517da2] text-white font-bold text-lg text-center flex justify-between items-center">
                <button onClick={() => setShowAddVideo(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
                <span>إضافة فيديو جديد</span>
                <div className="w-8" />
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600 block text-right">رابط الفيديو</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#24a1de] text-right border border-gray-100"
                    placeholder="https://example.com/video.mp4"
                    value={newVideoUrl}
                    onChange={(e) => setNewVideoUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600 block text-right">عنوان الفيديو</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#24a1de] text-right border border-gray-100"
                    placeholder="عنوان الفيديو"
                    value={newVideoTitle}
                    onChange={(e) => setNewVideoTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600 block text-right">وصف الفيديو</label>
                  <textarea
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#24a1de] text-right border border-gray-100 min-h-[100px]"
                    placeholder="اكتب وصفاً مختصراً للفيديو"
                    value={newVideoDesc}
                    onChange={(e) => setNewVideoDesc(e.target.value)}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowAddVideo(false)}
                    className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleAddVideo}
                    disabled={saving || !newVideoUrl || !newVideoTitle}
                    className="flex-1 py-3 bg-[#24a1de] text-white rounded-xl font-bold hover:bg-[#1e88bc] transition-all disabled:opacity-50"
                  >
                    {saving ? 'جاري الحفظ...' : 'إضافة'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
