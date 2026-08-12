import Link from 'next/link';
import { AsciiRule } from './components/AsciiRule';

export default function NotFound() {
  return (
    <div className="flex flex-col gap-4 max-w-[70ch]">
      <AsciiRule label="404" />
      <h1 className="text-2xl font-semibold">No such page</h1>
      <p className="text-[var(--muted-foreground)]">
        That slug did not resolve to a record in the DocPage collection.
      </p>
      <Link href="/" className="no-underline text-[var(--accent)]">
        ← back to index
      </Link>
    </div>
  );
}
