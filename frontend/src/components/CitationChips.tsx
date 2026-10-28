import type { Citation } from '../types';

interface CitationChipsProps {
  citations: Citation[];
  onOpen: (citation: Citation) => void;
}

export function CitationChips({ citations, onOpen }: CitationChipsProps) {
  if (!citations.length) return null;
  return (
    <div className="citation-row">
      {citations.map((citation) => (
        <button
          key={`${citation.chunk_id}-${citation.index}`}
          type="button"
          className="cite-chip"
          onClick={() => onOpen(citation)}
          title={citation.snippet}
        >
          <b>{citation.index}</b>
          <span>
            {citation.document_name} · 片段 {citation.chunk_index + 1}
          </span>
        </button>
      ))}
    </div>
  );
}
