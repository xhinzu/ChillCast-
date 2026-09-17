import { NextResponse } from 'next/server';
import { youtubeSearchCache } from '@/lib/server/cache';

export async function GET() {
  const stats = youtubeSearchCache.getStats();
  return NextResponse.json(stats);
}
