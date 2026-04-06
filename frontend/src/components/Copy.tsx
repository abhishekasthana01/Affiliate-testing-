import { useState } from 'react';

export function Copy({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {/* noop */}
  };
  return (
    <button onClick={onCopy} className="btn btn-ghost">
      <span style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#334155' }}>{text}</span>
      <span style={{ color: 'var(--beam-600)', fontWeight: 700, marginLeft: 8 }}>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}