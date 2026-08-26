import { motion } from 'motion/react';
import { Lock } from 'lucide-react';

export function ProcessingView({ isDark, method }: any) {
  const textPrimary = isDark ? '#fff' : '#1a1a1a';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,46,0.55)';

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative w-24 h-24 mb-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border-2"
          style={{
            borderColor: 'rgba(217,255,0,0.15)',
            borderTopColor: '#d6f905',
            borderRightColor: '#d6f905',
          }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-3 rounded-full border-2"
          style={{
            borderColor: 'rgba(236,72,153,0.1)',
            borderBottomColor: '#ec4899',
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Lock className="w-7 h-7" strokeWidth={1.5} style={{ color: isDark ? '#d6f905' : '#0a0a0a' }} />
        </div>
      </div>
      <h3 className="text-[20px] font-light mb-2"
        style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary }}>
        Securing your spot
      </h3>
      <p className="text-[12px] max-w-[260px]"
        style={{ fontFamily: "'Inter', sans-serif", color: textMuted }}>
        Authorizing payment via {method === 'telebirr' ? 'Telebirr' : method === 'cbe' ? 'CBE Birr' : 'your card'}.
        This usually takes a moment.
      </p>
    </div>
  );
}