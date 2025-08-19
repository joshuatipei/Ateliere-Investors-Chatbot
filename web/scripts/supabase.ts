import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { assertIndexerEnv } from '../lib/env';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE } = assertIndexerEnv();

// Server-side client with service role for admin operations
// IMPORTANT: Include schema configuration for rag tables
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  db: {
    schema: 'rag'
  }
});

// Types for RAG schema
export interface Document {
  id: string;
  source_table: string;
  source_id: string;
  title: string | null;
  content: string;
  content_hash: string;
  created_at: string;
  updated_at: string;
}

export interface Chunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
}

// RAG table operations - using correct table names (no schema prefix needed)
export const ragTables = {
  // Upsert document by (source_table, source_id)
  async upsertDocument(doc: Omit<Document, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const { data, error } = await supabase
      .from('doc_index')
      .upsert({
        source_table: doc.source_table,
        source_id: doc.source_id,
        title: doc.title,
        content: doc.content,
        content_hash: doc.content_hash
      }, {
        onConflict: 'source_table,source_id'
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to upsert document: ${error.message}`);
    }

    return data.id;
  },

  // Upsert chunk by (document_id, chunk_index)
  async upsertChunk(chunk: Omit<Chunk, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const { data, error } = await supabase
      .from('chunk_index')
      .upsert({
        document_id: chunk.document_id,
        chunk_index: chunk.chunk_index,
        content: chunk.content,
        embedding: chunk.embedding
      }, {
        onConflict: 'document_id,chunk_index'
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to upsert chunk: ${error.message}`);
    }

    return data.id;
  },

  // Get existing document hash for comparison
  async getDocumentHash(sourceTable: string, sourceId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('doc_index')
      .select('content_hash')
      .eq('source_table', sourceTable)
      .eq('source_id', sourceId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to get document hash: ${error.message}`);
    }

    return data?.content_hash || null;
  },

  // Get existing chunk for comparison
  async getChunk(documentId: string, chunkIndex: number): Promise<Chunk | null> {
    const { data, error } = await supabase
      .from('chunk_index')
      .select('*')
      .eq('document_id', documentId)
      .eq('chunk_index', chunkIndex)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get chunk: ${error.message}`);
    }

    return data;
  },

  // Get embedding count for a document
  async getChunkEmbeddingCount(documentId: string): Promise<{ total: number; withEmbeddings: number }> {
    const { count: total, error: totalError } = await supabase
      .from('chunk_index')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', documentId);

    if (totalError) {
      throw new Error(`Failed to get chunk count: ${totalError.message}`);
    }

    const { count: withEmbeddings, error: embedError } = await supabase
      .from('chunk_index')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', documentId)
      .not('embedding', 'is', null);

    if (embedError) {
      throw new Error(`Failed to get embedding count: ${embedError.message}`);
    }

    return {
      total: total || 0,
      withEmbeddings: withEmbeddings || 0
    };
  }
};
