import React from 'react';
import { X, Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { motion } from 'motion/react';

interface CallOverlayProps {
  userName: string;
  userPhoto?: string;
  onClose: () => void;
}

export const CallOverlay: React.FC<CallOverlayProps> = ({ userName, userPhoto, onClose }) => {
  const [isMuted, setIsMuted] = React.useState(false);
  const [isVideoOff, setIsVideoOff] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [stream, setStream] = React.useState<MediaStream | null>(null);

  React.useEffect(() => {
    const startVideo = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (err) {
        console.error("Error accessing media devices.", err);
      }
    };

    startVideo();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = isVideoOff;
        setIsVideoOff(!isVideoOff);
      }
    }
  };

  const toggleMute = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-[#1a1a1a] z-[200] flex flex-col items-center justify-between p-12 text-white"
    >
      {/* Local Video Background */}
      <div className="absolute inset-0 overflow-hidden">
        {!isVideoOff && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
      </div>

      <div className="flex flex-col items-center gap-6 mt-20 z-10">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-32 h-32 rounded-full border-4 border-[#24a1de] p-1 bg-gray-800"
        >
          <img
            src={userPhoto || 'https://via.placeholder.com/150'}
            alt={userName}
            className="w-full h-full rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        </motion.div>
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-2">{userName}</h2>
          <p className="text-[#24a1de] animate-pulse">جاري الاتصال بالفيديو...</p>
        </div>
      </div>

      <div className="flex items-center gap-8 mb-20 z-10">
        <button
          onClick={toggleMute}
          className={`p-5 rounded-full transition-all ${isMuted ? 'bg-red-500' : 'bg-white/10 hover:bg-white/20'}`}
        >
          {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
        </button>
        
        <button
          onClick={onClose}
          className="p-6 bg-red-600 rounded-full hover:bg-red-700 transition-all shadow-2xl hover:scale-110"
        >
          <PhoneOff size={32} />
        </button>

        <button
          onClick={toggleVideo}
          className={`p-5 rounded-full transition-all ${isVideoOff ? 'bg-red-500' : 'bg-white/10 hover:bg-white/20'}`}
        >
          {isVideoOff ? <VideoOff size={28} /> : <Video size={28} />}
        </button>
      </div>

      <div className="absolute top-8 right-8 z-10">
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X size={24} />
        </button>
      </div>
    </motion.div>
  );
};
