import React from 'react';
import { Star, Video, Zap, EyeOff, Palette, Sticker } from 'lucide-react';
import { motion } from 'motion/react';

export const PremiumFeaturesList = () => {
  const features = [
    {
      title: 'فيديو كصورة شخصية',
      description: 'يمكنك تعيين فيديو قصير كصورة شخصية بدلاً من الصورة الثابتة.',
      icon: <Video className="text-yellow-500" />,
      howTo: 'من إعدادات الملف الشخصي، اختر "تغيير الصورة الشخصية" ثم اختر فيديو من جهازك.'
    },
    {
      title: 'ملصقات متحركة حصرية',
      description: 'الوصول إلى مجموعة واسعة من الملصقات المتحركة المميزة.',
      icon: <Sticker className="text-yellow-500" />,
      howTo: 'ستظهر الملصقات تلقائياً في قائمة الملصقات الخاصة بك.'
    },
    {
      title: 'سمات متقدمة',
      description: 'تخصيص واجهة التطبيق بألوان وسمات حصرية.',
      icon: <Palette className="text-yellow-500" />,
      howTo: 'من إعدادات المظهر، ستجد خيارات جديدة للسمات المميزة.'
    },
    {
      title: 'إخفاء حالة الظهور',
      description: 'تصفح التطبيق دون أن يعرف أحد متى كنت متصلاً.',
      icon: <EyeOff className="text-yellow-500" />,
      howTo: 'من إعدادات الخصوصية، قم بتفعيل خيار "إخفاء حالة الظهور".'
    }
  ];

  return (
    <div className="p-6 bg-white rounded-3xl shadow-lg border border-yellow-100">
      <div className="flex items-center gap-3 mb-6">
        <Star className="text-yellow-500 fill-yellow-500" size={32} />
        <h2 className="text-2xl font-black text-gray-800">مميزات الاشتراك المميز</h2>
      </div>
      <div className="space-y-4">
        {features.map((feature, index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 bg-gray-50 rounded-2xl border border-gray-100"
          >
            <div className="flex items-center gap-3 mb-2">
              {feature.icon}
              <h3 className="font-bold text-gray-800">{feature.title}</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">{feature.description}</p>
            <p className="text-xs text-yellow-700 font-bold bg-yellow-50 p-2 rounded-lg">
              طريقة التفعيل: {feature.howTo}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
