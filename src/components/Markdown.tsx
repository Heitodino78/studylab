import { Fragment, type ReactNode } from 'react';

// React escapes all text. Raw HTML is never parsed and links allow only HTTP(S).
function inline(text: string): ReactNode[] {
  const pattern = /(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  return text.split(pattern).map((part, index) => {
    const link = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(part);
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1,-1)}</code>;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2,-2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1,-1)}</em>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}
export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (line.startsWith('```')) {
      const start = index++; const code: string[] = [];
      while (index < lines.length && !lines[index].startsWith('```')) code.push(lines[index++]);
      if (index < lines.length) index++;
      blocks.push(<pre key={start}><code>{code.join('\n')}</code></pre>); continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const contents = inline(heading[2]);
      blocks.push(heading[1].length === 1 ? <h2 key={index}>{contents}</h2> : heading[1].length === 2 ? <h3 key={index}>{contents}</h3> : <h4 key={index}>{contents}</h4>);
      index++; continue;
    }
    if (/^\s*[-*] \S/.test(line)) {
      const start = index; const items: ReactNode[] = [];
      while (index < lines.length && /^\s*[-*] \S/.test(lines[index])) { items.push(<li key={index}>{inline(lines[index].replace(/^\s*[-*] /, ''))}</li>); index++; }
      blocks.push(<ul key={start}>{items}</ul>); continue;
    }
    if (/^\s*\d+\. \S/.test(line)) {
      const start = index; const items: ReactNode[] = [];
      while (index < lines.length && /^\s*\d+\. \S/.test(lines[index])) { items.push(<li key={index}>{inline(lines[index].replace(/^\s*\d+\. /, ''))}</li>); index++; }
      blocks.push(<ol key={start}>{items}</ol>); continue;
    }
    if (line.trim()) blocks.push(<p key={index}>{inline(line)}</p>);
    index++;
  }
  return <div className="markdown">{blocks}</div>;
}
