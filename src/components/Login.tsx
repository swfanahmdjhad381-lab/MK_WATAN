import React from 'react';
import { loginWithGoogle } from '../firebase';
import { LogIn } from 'lucide-react';
import { motion } from 'motion/react';

export const Login: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-[#517da2]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4"
      >
        <div className="w-20 h-20 bg-[#24a1de] rounded-full flex items-center justify-center mb-6 shadow-lg">
          <svg viewBox="0 0 24 24" className="w-12 h-12 text-white fill-current">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.52-1.4.51-.46-.01-1.35-.26-2.01-.48-.81-.27-1.45-.42-1.39-.88.03-.24.36-.48.99-.74 3.88-1.69 6.46-2.8 7.74-3.35 3.69-1.55 4.45-1.82 4.95-1.83.11 0 .35.03.51.16.14.11.18.26.2.37.02.1.03.23.01.34z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">مرحباً بك في تليجرام</h1>
        <p className="text-gray-500 text-center mb-8">سجل دخولك للبدء في المراسلة</p>
        <button
          onClick={loginWithGoogle}
          className="flex items-center gap-3 px-6 py-3 bg-[#24a1de] text-white rounded-xl hover:bg-[#1e88bc] transition-all w-full justify-center font-medium shadow-md"
        >
          <LogIn size={20} />
          تسجيل الدخول عبر جوجل
        </button>
      </motion.div>
    </div>
  );
};
