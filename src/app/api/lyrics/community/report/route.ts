import { NextRequest, NextResponse } from 'next/server';
import { reportCommunityLyrics } from '@/lib/lyrics/communityRedis';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { trackId } = body;

    if (!trackId || typeof trackId !== 'string') {
      return NextResponse.json({ error: 'Valid trackId is required' }, { status: 400 });
    }

    const { reportedCount, reverted } = await reportCommunityLyrics(trackId);

    return NextResponse.json({
      success: true,
      trackId,
      reportedCount,
      reverted,
      message: reverted
        ? 'Community lyrics received 3 reports and were reverted.'
        : `Report recorded (${reportedCount}/3 reports needed to revert).`,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to process report' }, { status: 500 });
  }
}
