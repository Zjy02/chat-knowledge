import { type Components, default as ReactMarkdown } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { visit } from 'unist-util-visit';
import type { Element, Root, Text } from 'hast';
import 'highlight.js/styles/github-dark.css';

interface MarkdownProps {
  content: string;
  onCitationClick?: (index: number) => void;
  className?: string;
}

/**
 * Turn `[1]` text nodes into interactive citation buttons without enabling raw
 * HTML. This keeps Markdown XSS-safe while preserving inline references.
 */
function rehypeCitations() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return;
      if (
        parent.type === 'element' &&
        ['code', 'pre', 'a', 'sup'].includes((parent as Element).tagName)
      ) {
        return;
      }
      const value = node.value;
      const regex = /\[(\d+)\]/g;
      const children: Array<Text | Element> = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(value)) !== null) {
        if (match.index > lastIndex) {
          children.push({ type: 'text', value: value.slice(lastIndex, match.index) });
        }
        children.push({
          type: 'element',
          tagName: 'sup',
          properties: { className: ['cite-ref'], 'data-cite-index': match[1] },
          children: [{ type: 'text', value: `[${match[1]}]` }],
        });
        lastIndex = match.index + match[0].length;
      }
      if (!children.length) return;
      if (lastIndex < value.length) {
        children.push({ type: 'text', value: value.slice(lastIndex) });
      }
      parent.children.splice(index, 1, ...children);
      return index + children.length;
    });
  };
}

export function Markdown({ content, onCitationClick, className = '' }: MarkdownProps) {
  const components: Components = {
    sup: ({ node, children }) => {
      const raw = node?.properties?.['data-cite-index'] ?? node?.properties?.dataCiteIndex;
      if (raw === undefined || raw === null) return <sup>{children}</sup>;
      const index = Number(raw);
      return (
        <button
          type="button"
          className="cite-ref"
          onClick={() => onCitationClick?.(index)}
          aria-label={`查看引用 ${index}`}
        >
          {children}
        </button>
      );
    },
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noreferrer noopener">
        {children}
      </a>
    ),
    table: ({ children }) => (
      <div className="table-wrap">
        <table>{children}</table>
      </div>
    ),
  };

  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeCitations, [rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
