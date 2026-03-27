import React from 'react';
import { Star, Video, Zap, EyeOff, Palette, Sticker } from 'lucide-react';
import { motion } from 'motion/react';

interface PremiumFeaturesListProps {
  onClose: () => void;
}

export const PremiumFeaturesList: React.FC<PremiumFeaturesListProps> = ({ onClose }) => {
  const features = [
    {
      title: 'إنشاء فيديو بالذكاء الاصطناعي',
      description: 'يمكنك إنشاء فيديوهات مذهلة من خلال وصف نصي فقط.',
      icon: <Video className="text-yellow-500" />,
      howTo: 'افتح أي محادثة، اضغط على أيقونة الشرارة ✨، واختر "إنشاء فيديو".'
    },
    {
      title: 'إنشاء صور بالذكاء الاصطناعي',
      description: 'حول أفكارك إلى صور فنية رائعة بلمح البصر.',
      icon: <Zap className="text-yellow-500" />,
      howTo: 'افتح أي محادثة، اضغط على أيقونة الشرارة ✨، واختر "إنشاء صورة".'
    },
    {
      title: 'فيديو كصورة شخصية',
      description: 'يمكنك تعيين فيديو قصير كصورة شخصية بدلاً من الصورة الثابتة.',
      icon: <Video className="text-yellow-500" />,
      howTo: 'من إعدادات الملف الشخصي، اختر "تغيير الصورة الشخصية" ثم اختر فيديو من جهازك.'
    },
    {
      title: 'سمات متقدمة',
      description: 'تخصيص واجهة التطبيق بألوان وسمات حصرية.',
      icon: <Palette className="text-yellow-500" />,
      howTo: 'من إعدادات المظهر، ستجد خيارات جديدة للسمات المميزة.'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl border border-yellow-100 relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 left-6 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
        >
          <Zap size={24} className="text-gray-400 rotate-45" />
        </button>

        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-200">
              <Star className="text-white fill-white" size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-gray-800">المميزات الممتازة</h2>
              <p className="text-yellow-600 font-bold">استمتع بتجربة فريدة مع وطن بوت</p>
            </div>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {features.map((feature, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-5 bg-gray-50 rounded-3xl border border-gray-100 hover:border-yellow-200 transition-all group"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-3 bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="font-black text-gray-800 text-lg">{feature.title}</h3>
                </div>
                <p className="text-gray-600 mb-4 leading-relaxed">{feature.description}</p>
                <div className="bg-yellow-50/50 p-3 rounded-2xl border border-yellow-100/50">
                  <p className="text-xs text-yellow-800 font-bold">
                    💡 {feature.howTo}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full mt-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-yellow-200 hover:scale-[1.02] transition-all active:scale-95"
          >
            فهمت ذلك
          </button>
        </div>
      </motion.div>
    </div>
  );
};
