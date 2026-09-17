import UniversalMusicPlayer from '@/components/UniversalMusicPlayer';
import AmbientSoundMixer from '@/components/AmbientSoundMixer';
import { PlaybackProvider } from '@/context/PlaybackContext';

export default function Home() {
  return (
    <PlaybackProvider>
      <main className="min-h-screen bg-[#090c13] text-slate-100 flex flex-col items-center justify-start p-4 sm:p-8 relative overflow-hidden font-sans selection:bg-indigo-500/30">
        {/* Dynamic Atmospheric Background Glows */}
        <div className="fixed -top-40 -left-40 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="fixed top-1/3 -right-40 w-[550px] h-[550px] bg-purple-600/12 rounded-full blur-[160px] pointer-events-none" />
        <div className="fixed -bottom-40 left-1/4 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[150px] pointer-events-none" />

        {/* Main App Container */}
        <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col gap-6 sm:gap-8 my-auto">
          {/* Navigation & Brand Header */}
          <header className="flex items-center justify-between backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] px-6 py-4 rounded-3xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 to-teal-400 p-[1px] flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <div className="w-full h-full bg-[#090c13] rounded-2xl flex items-center justify-center text-base">
                  ✨
                </div>
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-indigo-200 via-sky-100 to-teal-200 bg-clip-text text-transparent">
                  ChillCast
                </h1>
                <p className="text-[11px] text-slate-400 font-medium">Ambient Soundscapes & Music Hub</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <span>Stage 3: PlaybackAdapter Live</span>
              </div>
            </div>
          </header>

          {/* 1. Universal Swappable Music Player */}
          <section aria-label="Universal Music Player">
            <UniversalMusicPlayer />
          </section>

          {/* 2. Web Audio API Ambient Sound Mixer */}
          <section aria-label="Ambient Mixer">
            <AmbientSoundMixer />
          </section>

          {/* Footer / Architecture Roadmap */}
          <footer className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 px-4 py-2 border-t border-white/[0.04] gap-2">
            <span>ChillCast • Stage 3 (Swappable PlaybackAdapter Architecture)</span>
            <span>Next: Stage 4 (YouTubeAdapter IFrame Player API)</span>
          </footer>
        </div>
      </main>
    </PlaybackProvider>
  );
}
