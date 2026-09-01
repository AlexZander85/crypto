// Серверный RAG (§10.3) для тарифа «Макс»: BM25-контур на rag_mentor_engine.js
// (движок v2.2, вендорная копия без правок — аттачится к globalThis) + база
// 302 атомов knowledge_base_psy.json (вендорная копия; источник — rag/ в репо).
// Vectorize (psy-atoms) — опциональный усилитель; BM25-контур самодостаточен.
import kbJson from './vendor/knowledge_base_psy.json';
import './vendor/rag_mentor_engine.js';

let loaded = false;

function engine() {
  const e = globalThis.CryptoMentorRAG;
  if (!e) return null;
  if (!loaded) {
    try { e.load(kbJson.atoms || kbJson); loaded = true; } catch { return null; }
  }
  return e;
}

export const KB_ATOMS = kbJson.atoms?.length || 0;
export const KB_VERSION = kbJson.version || 'unknown';

// Поиск релевантных атомов: {context, sources: [{author, book, topic, quote_note}]}
export function ragSearch(query, lessonId, limit = 3) {
  const e = engine();
  if (!e || !query) return { context: '', sources: [] };
  try {
    const hits = e.search({ query, lessonId, limit }) || [];
    const atoms = (hits.results || hits.atoms || hits || []);
    const sources = [];
    const lines = [];
    for (const h of atoms.slice(0, limit)) {
      const a = h.atom || h;
      if (!a || !a.core_idea) continue;
      lines.push(`— [${a.author_ru || a.author}${a.book ? ' · «' + a.book + '»' : ''}] ${a.core_idea}`);
      sources.push({
        author: a.author_ru || a.author || '',
        book: a.book || '',
        topic: a.topic || '',
        provenance: a.provenance || null
      });
    }
    return { context: lines.join('\n'), sources };
  } catch { return { context: '', sources: [] }; }
}
