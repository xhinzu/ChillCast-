import ChillCastApp from '@/components/ChillCastApp';

export const metadata = {
  title: 'Together — ChillCast',
  description: 'Synchronize music and live lyrics with friends in real-time.',
};

export default function TogetherPage() {
  return <ChillCastApp initialView="together" />;
}

