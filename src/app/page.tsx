export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* Background Ambient Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Glassmorphic Card */}
      <div className="relative z-10 w-full max-w-xl backdrop-blur-xl bg-white/[0.04] border border-white/[0.1] rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/50 text-center flex flex-col items-center gap-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium tracking-wide uppercase">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Stage 1 Initialized</span>
        </div>

        {/* Brand */}
        <div className="space-y-2">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-200 via-sky-200 to-teal-200 bg-clip-text text-transparent">
            ChillCast
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            Ambient soundscapes, swappable playback adapters & live synced lyrics in a calm, immersive space.
          </p>
        </div>

        {/* Feature Tags */}
        <div className="grid grid-cols-2 gap-2.5 w-full pt-2 text-xs text-slate-300">
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2.5 text-left">
            <span className="text-indigo-400 text-base">🌧️</span>
            <div>
              <div className="font-semibold text-slate-200">Ambient Mixer</div>
              <div className="text-[11px] text-slate-500">Web Audio API layers</div>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2.5 text-left">
            <span className="text-red-400 text-base">▶️</span>
            <div>
              <div className="font-semibold text-slate-200">YouTube Adapter</div>
              <div className="text-[11px] text-slate-500">Zero quota IFrame</div>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2.5 text-left">
            <span className="text-emerald-400 text-base">🎧</span>
            <div>
              <div className="font-semibold text-slate-200">Spotify Dual-Mode</div>
              <div className="text-[11px] text-slate-500">PKCE & metadata cache</div>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2.5 text-left">
            <span className="text-purple-400 text-base">🎙️</span>
            <div>
              <div className="font-semibold text-slate-200">Live Synced Lyrics</div>
              <div className="text-[11px] text-slate-500">LRCLIB integration</div>
            </div>
          </div>
        </div>

        {/* Next Step Footer */}
        <div className="w-full pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
          <span>Environment & Scaffolding: Ready</span>
          <span className="text-indigo-400 font-medium">Stage 2 Next →</span>
        </div>
      </div>
    </main>
  );
}

