import { BoltIcon } from '@heroicons/react/24/solid';

export default function Logo() {
  return (
    <div className="flex items-center gap-2">
      <BoltIcon className="h-8 w-8 text-blue-600" />
      <span className="font-bricolage text-2xl font-bold">QuickChat</span>
    </div>
  );
}
