import { motion } from 'framer-motion';

export default function Background() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#030712]">
      {/* Dotted background */}
      <div className="absolute inset-0 bg-dot-pattern" />
      
      {/* Radial gradient overlay */}
      <div className="absolute pointer-events-none inset-0 bg-gradient-to-b from-[#030712] via-transparent to-[#030712] opacity-60" />
      
      {/* Subtle orbs for depth */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.02, 0.03, 0.02]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-1/4 -left-48 w-[40rem] h-[40rem] bg-white/5 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.02, 0.03, 0.02]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
        className="absolute -bottom-24 -right-24 w-[40rem] h-[40rem] bg-white/5 rounded-full blur-3xl"
      />
    </div>
  );
}
