"use client"; // Essential for Framer Motion (animations happen in browser)

import { motion } from "framer-motion";
import { ArrowRight, Lock, Brain, Zap } from "lucide-react";
import Link from "next/link";

export default function Home() {
  // Animation Variants (Instructions for the movement)
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3, // Delay each child by 0.3s
      },
    },
  };

  const itemVariants = {
    hidden: { y: 10, opacity: 0 }, // Reduced movement from 20 to 10
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100, damping: 20 } // Smooth spring physics
    },
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* 1. BACKGROUND GLOW EFFECTS (The "Aurora") */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
      </div>

      {/* 2. MAIN CONTENT CONTAINER */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="z-10 text-center max-w-4xl"
      >
        {/* Badge */}
        <motion.div variants={itemVariants} className="flex justify-center mb-6">
          <span className="px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-sm font-medium tracking-wider">
            AI-POWERED KNOWLEDGE ENGINE
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={itemVariants}
          className="text-6xl md:text-8xl font-bold mb-6 tracking-tight"
        >
          Memory
          {/* CHANGED: Solid Blue color with a strong drop-shadow glow */}
          <span className="text-blue-500 drop-shadow-[0_0_35px_rgba(59,130,246,0.8)] ml-2">
            Vault
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={itemVariants}
          className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed"
        >
          Your second brain, encrypted. Upload documents, ask questions, 
          and retrieve insights instantly using <span className="text-white font-semibold">RAG technology</span>.
        </motion.p>

        {/* Buttons */}
        <motion.div variants={itemVariants} className="flex gap-4 justify-center">
          <Link href="/login">
            <button className="group relative px-8 py-4 bg-blue-600 rounded-xl font-bold text-white overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)]">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative flex items-center gap-2">
                Get Started <ArrowRight className="w-5 h-5" />
              </span>
            </button>
          </Link>
          
          <button className="px-8 py-4 rounded-xl font-bold text-gray-300 border border-white/10 hover:bg-white/5 hover:text-white transition-all">
            Watch Demo
          </button>
        </motion.div>

        {/* Feature Grid (Floating Cards) */}
        <motion.div 
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left"
        >
          <FeatureCard 
            icon={<Lock className="w-6 h-6 text-cyan-400" />}
            title="Privacy First"
            desc="End-to-end encryption with Row Level Security. Your data is yours alone."
          />
          <FeatureCard 
            icon={<Brain className="w-6 h-6 text-purple-400" />}
            title="Neural Search"
            desc="Powered by Google Gemini 2.0. Search by meaning, not just keywords."
          />
          <FeatureCard 
            icon={<Zap className="w-6 h-6 text-yellow-400" />}
            title="Instant RAG"
            desc="Upload PDFs and chat with them in milliseconds using vector indexing."
          />
        </motion.div>

      </motion.div>
    </main>
  );
}

// Helper Component for the Grid
function FeatureCard({ icon, title, desc }: any) {
  return (
    <div className="glass-panel p-6 rounded-2xl hover:border-blue-500/30 transition-colors duration-300">
      <div className="mb-4 p-3 bg-white/5 w-fit rounded-lg">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}