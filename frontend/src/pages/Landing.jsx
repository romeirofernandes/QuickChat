import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Background from '../components/Background';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <Background />
      
      {/* Header */}
      <header className="w-full px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">⚡</span>
            <span className="font-bricolage text-xl font-bold text-white/90">QuickChat</span>
          </div>
          <button
            onClick={() => navigate('/register')}
            className="px-4 py-2 text-sm text-white/70 hover:text-white/90 transition-colors"
          >
            Create Account
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-6 max-w-2xl"
        >
          <h1 className="font-bricolage text-5xl font-bold text-white/90">
            Quick and Easy Chat Rooms
          </h1>
          <p className="text-lg text-white/70">
            Create or join chat rooms instantly. No email required.
          </p>
          <motion.button
            onClick={() => navigate('/login')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center px-8 py-3 bg-indigo-500/80 text-white rounded-xl hover:bg-indigo-500/90 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-colors font-medium"
          >
            Get Started
          </motion.button>
        </motion.div>
      </main>
    </div>
  );
}
