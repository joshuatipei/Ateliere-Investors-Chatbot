import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Web read-only client using ANON key (NOT service role)
// No schema override - RPC calls use fully qualified names
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

// Types for RAG search results
export interface SearchResult {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  title: string | null;
  source_table: string;
  similarity: number;
}

// RAG search function using the RPC with fully qualified name
export async function searchChunks(
  queryEmbedding: number[],
  matchCount: number = 8,
  sourceFilter: string | null = null
): Promise<SearchResult[]> {
  const { data, error } = await supabase.rpc('rag.search_chunks', {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    source_filter: sourceFilter
  });

  if (error) {
    throw new Error(`RAG search failed: ${error.message}`);
  }

  return data || [];
}
