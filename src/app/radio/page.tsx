import ChillCastApp from '@/components/ChillCastApp';

export const metadata = {
  title: 'Radio — MyuJiku',
  description: 'Interactive 3D FM/AM radio with live virtual stations and radio jockeys.',
};

export default function RadioPage() {
  return <ChillCastApp initialView="radio" />;
}

