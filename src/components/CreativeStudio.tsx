import React, { useState, useRef } from 'react';
import { db, auth, storage } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { GoogleGenAI } from "@google/genai";
import { X, Wand2, Film, Image as ImageIcon, Edit3, Sparkles, Download, Share2, Loader2, Upload, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OperationType } from '../types';
import { handleFirestoreError } from '../lib/firestore-utils';

interface CreativeStudioProps {
  onClose: () => void;
  userProfile: any;
}

export const CreativeStudio: React.FC<CreativeStudioProps> = ({ onClose, userProfile }) => {
  const [activeTab, setActiveTab] = useState<'video' | 'image' | 'edit'>('video');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultType, setResultType] = useState<'video' | 'image' | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateVideo = async () => {
    if (!prompt) return;
    if (!userProfile?.isPremium) {
      alert('هذه الميزة متاحة فقط للمشتركين المميزين! 🌟');
      return;
    }

    setIsGenerating(true);
    setResultUrl(null);
    setProgress('جاري التحقق من الصلاحيات... 🔑');

    try {
      // Check for API key (only in AI Studio environment)
      // @ts-ignore
      if (typeof window !== 'undefined' && window.aistudio) {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          // @ts-ignore
          await window.aistudio.openSelectKey();
        }
      }

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? (process.env.API_KEY || process.env.GEMINI_API_KEY) : '');
      if (!apiKey) {
        throw new Error('Gemini API Key is missing. Please set VITE_GEMINI_API_KEY in your environment.');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      while (!operation.done) {
        setProgress('جاري معالجة الفيديو... يرجى الانتظار 🎬');
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        setProgress('تم الإنشاء بنجاح! جاري التجهيز... 📥');
        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: { 'x-goog-api-key': process.env.API_KEY || process.env.GEMINI_API_KEY! },
        });
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setResultUrl(url);
        setResultType('video');
      }
    } catch (error: any) {
      console.error('AI Video Error:', error);
      const errorMsg = error.message || 'حدث خطأ غير معروف';
      alert(`حدث خطأ أثناء إنشاء الفيديو: ${errorMsg}`);
    } finally {
      setIsGenerating(false);
      setProgress('');
    }
  };

  const generateImage = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setResultUrl(null);
    setProgress('جاري رسم الصورة... 🎨');

    try {
      // Check for API key (only in AI Studio environment)
      // @ts-ignore
      if (typeof window !== 'undefined' && window.aistudio) {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          // @ts-ignore
          await window.aistudio.openSelectKey();
        }
      }

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? (process.env.API_KEY || process.env.GEMINI_API_KEY) : '');
      if (!apiKey) {
        throw new Error('Gemini API Key is missing. Please set VITE_GEMINI_API_KEY in your environment.');
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: "1:1" } }
      });

      let imageUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        setResultUrl(imageUrl);
        setResultType('image');
      }
    } catch (error: any) {
      console.error('AI Image Error:', error);
      const errorMsg = error.message || 'حدث خطأ غير معروف';
      alert(`حدث خطأ أثناء إنشاء الصورة: ${errorMsg}`);
    } finally {
      setIsGenerating(false);
      setProgress('');
    }
  };

  const editImage = async () => {
    if (!selectedImage || !prompt) return;
    setIsGenerating(true);
    setResultUrl(null);
    setProgress('جاري تعديل الصورة... ✨');

    try {
      // Check for API key (only in AI Studio environment)
      // @ts-ignore
      if (typeof window !== 'undefined' && window.aistudio) {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          // @ts-ignore
          await window.aistudio.openSelectKey();
        }
      }

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? (process.env.API_KEY || process.env.GEMINI_API_KEY) : '');
      if (!apiKey) {
        throw new Error('Gemini API Key is missing. Please set VITE_GEMINI_API_KEY in your environment.');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Convert image to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(selectedImage);
      const base64Data = await base64Promise;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: selectedImage.type } },
            { text: `تعديل هذه الصورة بناءً على الوصف التالي: ${prompt}` }
          ]
        }
      });

      let imageUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        setResultUrl(imageUrl);
        setResultType('image');
      }
    } catch (error: any) {
      console.error('AI Edit Error:', error);
      const errorMsg = error.message || 'حدث خطأ غير معروف';
      alert(`حدث خطأ أثناء تعديل الصورة: ${errorMsg}`);
    } finally {
      setIsGenerating(false);
      setProgress('');
    }
  };

  const handleShare = async () => {
    if (!resultUrl || !auth.currentUser) return;
    
    try {
      setProgress('جاري المشاركة... 📤');
      const response = await fetch(resultUrl);
      const blob = await response.blob();
      const ext = resultType === 'video' ? 'mp4' : 'png';
      const file = new File([blob], `ai_creative_${Date.now()}.${ext}`, { type: blob.type });
      
      const tempId = Date.now().toString();
      const storageRef = ref(storage, `creative_studio/${auth.currentUser.uid}/${tempId}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      // Add to public videos if it's a video
      if (resultType === 'video') {
        await addDoc(collection(db, 'public_videos'), {
          userId: auth.currentUser.uid,
          userName: auth.currentUser.displayName || 'Anonymous',
          url: downloadUrl,
          title: prompt || 'AI Generated Video',
          description: 'تم إنشاؤه بواسطة استوديو وطن الإبداعي',
          timestamp: serverTimestamp(),
        });
      }

      alert('تم حفظ العمل في معرض الصور الخاص بك ومشاركته بنجاح! 🎉');
    } catch (error) {
      console.error('Share error:', error);
      alert('حدث خطأ أثناء المشاركة.');
    } finally {
      setProgress('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[150] flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[40px] w-full max-w-4xl overflow-hidden shadow-2xl border border-white/20 flex flex-col md:flex-row h-[90vh] md:h-[700px]"
      >
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 bg-gray-50 border-l border-gray-100 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-[#24a1de] to-[#1e88bc] rounded-2xl flex items-center justify-center shadow-lg">
              <Wand2 className="text-white" size={24} />
            </div>
            <h2 className="text-xl font-black text-gray-800">استوديو وطن</h2>
          </div>

          <nav className="space-y-2 flex-1">
            <button
              onClick={() => { setActiveTab('video'); setResultUrl(null); }}
              className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'video' ? 'bg-[#24a1de] text-white shadow-lg shadow-blue-100' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <Film size={20} />
              <span className="font-bold">إنشاء فيديو</span>
            </button>
            <button
              onClick={() => { setActiveTab('image'); setResultUrl(null); }}
              className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'image' ? 'bg-[#24a1de] text-white shadow-lg shadow-blue-100' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <ImageIcon size={20} />
              <span className="font-bold">توليد صورة</span>
            </button>
            <button
              onClick={() => { setActiveTab('edit'); setResultUrl(null); }}
              className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all ${activeTab === 'edit' ? 'bg-[#24a1de] text-white shadow-lg shadow-blue-100' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <Edit3 size={20} />
              <span className="font-bold">تعديل الصور</span>
            </button>
          </nav>

          <button 
            onClick={onClose}
            className="mt-auto p-4 bg-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-300 transition-all"
          >
            إغلاق الاستوديو
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-8 flex flex-col overflow-y-auto custom-scrollbar relative">
          <div className="absolute top-6 left-6">
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
              <X size={24} />
            </button>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-black text-gray-800 mb-2">
              {activeTab === 'video' && 'صناعة فيديو بالذكاء الاصطناعي'}
              {activeTab === 'image' && 'توليد صور فنية'}
              {activeTab === 'edit' && 'تعديل الصور بالذكاء الاصطناعي'}
            </h3>
            <p className="text-gray-500">
              {activeTab === 'video' && 'حول كلماتك إلى مقاطع فيديو مذهلة باستخدام أقوى تقنيات الذكاء الاصطناعي.'}
              {activeTab === 'image' && 'ارسم أي شيء تتخيله فقط من خلال وصفه بالكلمات.'}
              {activeTab === 'edit' && 'ارفع صورتك وأخبرنا ما الذي تريد تغييره أو إضافته إليها.'}
            </p>
          </div>

          <div className="flex-1 space-y-6">
            {activeTab === 'edit' && (
              <div className="space-y-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-video bg-gray-50 border-2 border-dashed border-gray-200 rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:border-[#24a1de] hover:bg-blue-50 transition-all overflow-hidden group"
                >
                  {imagePreview ? (
                    <img src={imagePreview} className="w-full h-full object-contain" alt="Preview" />
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Upload className="text-[#24a1de]" size={32} />
                      </div>
                      <p className="font-bold text-gray-600">اضغط لرفع الصورة</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG حتى 10 ميجابايت</p>
                    </>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 block">
                {activeTab === 'edit' ? 'ما هو التعديل المطلوب؟' : 'اكتب وصفك هنا'}
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  activeTab === 'video' ? 'مثال: رائد فضاء يركب خيلاً في الفضاء الخارجي، أسلوب سينمائي...' :
                  activeTab === 'image' ? 'مثال: مدينة مستقبلية تحت الماء، ألوان نيون، تفاصيل دقيقة...' :
                  'مثال: أضف نظارات شمسية للشخص، غير الخلفية إلى غابة...'
                }
                className="w-full p-5 bg-gray-50 border border-gray-100 rounded-[24px] focus:outline-none focus:ring-2 focus:ring-[#24a1de] min-h-[120px] text-right resize-none"
              />
            </div>

            <button
              onClick={
                activeTab === 'video' ? generateVideo :
                activeTab === 'image' ? generateImage :
                editImage
              }
              disabled={isGenerating || !prompt || (activeTab === 'edit' && !selectedImage)}
              className="w-full py-5 bg-gradient-to-r from-[#24a1de] to-[#1e88bc] text-white rounded-[24px] font-black text-lg shadow-xl shadow-blue-100 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  <span>جاري العمل...</span>
                </>
              ) : (
                <>
                  <Sparkles size={24} />
                  <span>ابدأ الإبداع الآن</span>
                </>
              )}
            </button>

            {/* Progress Indicator */}
            <AnimatePresence>
              {isGenerating && progress && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3 text-blue-700 text-sm font-bold"
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                  {progress}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Result Area */}
            <AnimatePresence>
              {resultUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4 pt-6 border-t border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-gray-800 flex items-center gap-2">
                      <Check className="text-green-500" size={20} />
                      النتيجة النهائية
                    </h4>
                    <div className="flex gap-2">
                      <a 
                        href={resultUrl} 
                        download={`creative_${Date.now()}.${resultType === 'video' ? 'mp4' : 'png'}`}
                        className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all"
                        title="تحميل"
                      >
                        <Download size={20} />
                      </a>
                      <button 
                        onClick={handleShare}
                        className="p-3 bg-[#24a1de] text-white rounded-xl hover:bg-[#1e88bc] transition-all flex items-center gap-2"
                      >
                        <Share2 size={20} />
                        <span className="text-xs font-bold">حفظ ومشاركة</span>
                      </button>
                    </div>
                  </div>

                  <div className="w-full aspect-video bg-black rounded-[32px] overflow-hidden shadow-2xl relative group">
                    {resultType === 'video' ? (
                      <video src={resultUrl} controls className="w-full h-full object-contain" />
                    ) : (
                      <img src={resultUrl} className="w-full h-full object-contain" alt="AI Result" />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
