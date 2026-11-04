// Just enough markdown for chat replies: paragraphs, lists, bold, rules, headings, tables and ```chart blocks.
import { Fragment } from 'react';
import MiniChart, { parseChart } from './MiniChart';

function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : <Fragment key={i}>{part}</Fragment>,
  );
}

const cells = (row: string) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
const isRule = (row: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(row);

export default function MiniMarkdown({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) blocks.push(<ul key={`l${blocks.length}`}>{list.map((li, i) => <li key={i}>{inline(li)}</li>)}</ul>);
    list = [];
  };
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();

    // ```chart … ``` (any other fenced block is shown as plain text)
    const fence = line.match(/^```\s*(\w*)\s*$/);
    if (fence) {
      flush();
      const body: string[] = [];
      while (++i < lines.length && !/^```\s*$/.test(lines[i].trim())) body.push(lines[i]);
      const chart = fence[1] === 'chart' ? parseChart(body.join('\n')) : null;
      blocks.push(chart ? <MiniChart key={`c${blocks.length}`} chart={chart} /> : <pre key={`f${blocks.length}`}>{body.join('\n')}</pre>);
      continue;
    }

    // | a | b | tables
    if (line.trim().startsWith('|') && i + 1 < lines.length && isRule(lines[i + 1])) {
      flush();
      const head = cells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(cells(lines[i++]));
      i--;
      blocks.push(
        <div className="md-table" key={`t${blocks.length}`}>
          <table>
            <thead><tr>{head.map((h, k) => <th key={k}>{inline(h)}</th>)}</tr></thead>
            <tbody>{rows.map((r, k) => <tr key={k}>{r.map((c, n) => <td key={n}>{inline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }

    const bullet = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
    if (bullet) { list.push(bullet[1]); continue; }
    flush();
    if (!line.trim()) continue;
    if (/^-{3,}$/.test(line.trim())) { blocks.push(<hr key={`h${blocks.length}`} />); continue; }
    const head = line.match(/^#{1,4}\s+(.*)$/);
    blocks.push(head ? <p key={`p${blocks.length}`}><b>{inline(head[1])}</b></p> : <p key={`p${blocks.length}`}>{inline(line)}</p>);
  }
  flush();
  return <>{blocks}</>;
}
