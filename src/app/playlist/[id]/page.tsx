import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { decodePlaylistShareData } from '@/lib/playlist-share';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ d?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { d } = await searchParams;

  const data = decodePlaylistShareData(d || '');
  const title = data?.title || 'MyuJiku Playlist';
  const coverUrl = data?.coverUrl || 'https://myujiku.vercel.app/favicon.ico';
  const tracks = data?.tracks || [];

  // Generate track list lines for Discord embed description (up to 12 songs)
  const trackLines = tracks.slice(0, 10).map((t, idx) => {
    const artist = t.artist ? ` - ${t.artist}` : '';
    const dur = t.duration ? ` (${t.duration})` : '';
    return `${idx + 1}. ${t.title}${artist}${dur}`;
  });

  if (tracks.length > 10) {
    trackLines.push(`... and ${tracks.length - 10} more tracks`);
  }

  const description = trackLines.length > 0
    ? trackLines.join('\n')
    : `${tracks.length} tracks • Curated with MyuJiku`;

  const canonicalUrl = `https://myujiku.vercel.app/playlist/${encodeURIComponent(id)}${d ? `?d=${d}` : ''}`;
  const oembedUrl = `https://myujiku.vercel.app/api/playlist/oembed?d=${encodeURIComponent(d || '')}&url=${encodeURIComponent(canonicalUrl)}`;

  return {
    title: `${title} • MyuJiku`,
    description,
    openGraph: {
      title: `${title} • MyuJiku`,
      description,
      url: canonicalUrl,
      siteName: 'MyuJiku',
      images: [
        {
          url: coverUrl,
          width: 600,
          height: 600,
          alt: title,
        },
      ],
      type: 'music.playlist',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} • MyuJiku`,
      description,
      images: [coverUrl],
    },
    other: {
      'alternate': oembedUrl,
    },
  };
}

export default async function PlaylistPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { d } = await searchParams;

  const playlist = decodePlaylistShareData(d || '');
  const title = playlist?.title || 'Shared Playlist';
  const coverUrl = playlist?.coverUrl || '';
  const tracks = playlist?.tracks || [];

  return (
    <div className="min-h-screen bg-[#0e0e12] text-white flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-2xl bg-[#16161c] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header: Cover + Info */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden bg-zinc-800 shadow-xl border border-white/10 shrink-0">
            {coverUrl ? (
              <Image
                src={coverUrl}
                alt={title}
                fill
                sizes="(max-width: 640px) 144px, 176px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                <svg className="w-16 h-16 fill-current" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent,#38bdf8)] bg-white/5 px-2.5 py-1 rounded-full border border-white/10 inline-block">
              MyuJiku Playlist
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {title}
            </h1>
            <p className="text-xs text-zinc-400">
              {tracks.length} track{tracks.length === 1 ? '' : 's'} • Curated with MyuJiku
            </p>

            <div className="pt-3 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <Link
                href={`/?import_playlist=${encodeURIComponent(id)}${d ? `&d=${encodeURIComponent(d)}` : ''}`}
                className="px-5 py-2.5 rounded-full bg-white text-black font-bold text-xs hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>Play in MyuJiku</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Tracklist */}
        <div className="border-t border-white/[0.08] pt-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 px-2">
            Tracklist ({tracks.length})
          </h2>

          <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1">
            {tracks.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">No tracks in this playlist yet.</p>
            ) : (
              tracks.map((track, idx) => (
                <div
                  key={track.id || idx}
                  className="flex items-center gap-3.5 p-2.5 rounded-xl hover:bg-white/[0.06] transition-colors group"
                >
                  <span className="w-5 text-center text-xs font-mono text-zinc-500 group-hover:text-zinc-300">
                    {idx + 1}
                  </span>

                  {track.thumbnail && (
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 shrink-0 border border-white/5">
                      <Image
                        src={track.thumbnail}
                        alt={track.title}
                        fill
                        sizes="40px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-white truncate">
                      {track.title}
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {track.artist || 'Unknown Artist'}
                    </p>
                  </div>

                  {track.duration && (
                    <span className="text-xs font-mono text-zinc-500 shrink-0">
                      {track.duration}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.08] pt-3 flex items-center justify-between text-[11px] text-zinc-500">
          <span>MyuJiku Music</span>
          <Link href="/" className="hover:text-white transition-colors">
            Open App
          </Link>
        </div>
      </div>
    </div>
  );
}

