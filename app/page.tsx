import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import ParticleBackground from "@/components/particle-background";
import AnimatedText from "@/components/animated-text";
import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-transparent text-white relative overflow-hidden">
      <div className="z-10 text-center space-y-4">
        <div className="flex items-center justify-center gap-4 mb-2">
          <Image 
            src="/phenom-white-optimized.webp" 
            alt="Phenomitor Logo" 
            width={80} 
            height={80} 
          />
          <h1 className="text-6xl font-bold text-white glow-text">Phenomitor</h1>
        </div>
        <AnimatedText />
        <a
          href="/pages/realtimeStreamPage"
          className="inline-block px-8 py-3 mt-6 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-full text-xl font-semibold transition-all duration-300 ease-in-out hover:from-blue-500 hover:to-green-500 hover:translate-y-[-4px] hover:shadow-lg hover:shadow-green-500/25"
        >
          Get Started
        </a>
      </div>
    </main>
  );
}
