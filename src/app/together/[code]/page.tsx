import ChillCastApp from '@/components/ChillCastApp';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return {
    title: `Room ${code.toUpperCase()} — Listen Together | ChillCast`,
    description: `Join room ${code.toUpperCase()} to listen together in real-time on ChillCast.`,
  };
}

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <ChillCastApp initialView="together" initialRoomCode={code.toUpperCase()} />;
}

