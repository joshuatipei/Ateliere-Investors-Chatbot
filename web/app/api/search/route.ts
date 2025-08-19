import { NextRequest, NextResponse } from 'next/server';
import { embed } from '@/lib/openai';
import { searchChunks } from '@/lib/supabaseClient';

interface SearchRequest {
  q: string;
  topK?: number;
  source?: string;
}

interface SearchResponse {
  results: Array<{
    id: string;
    document_id: string;
    chunk_index: number;
    content: string;
    title: string | null;
    source_table: string;
    similarity: number;
  }>;
  query: string;
  topK: number;
  sourceFilter: string | null;
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body: SearchRequest = await request.json();
    
    if (!body.q || typeof body.q !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid query parameter "q"' },
        { status: 400 }
      );
    }

    const query = body.q.trim();
    const topK = Math.min(Math.max(body.topK || 8, 1), 20); // Clamp between 1-20
    const sourceFilter = body.source || null;

    if (query.length === 0) {
      return NextResponse.json(
        { error: 'Query cannot be empty' },
        { status: 400 }
      );
    }

    // Generate embedding for the query
    const queryEmbedding = await embed(query);

    // Search for relevant chunks
    const results = await searchChunks(queryEmbedding, topK, sourceFilter);

    // Build response
    const response: SearchResponse = {
      results,
      query,
      topK,
      sourceFilter
    };

    return NextResponse.json(response);

  } catch (error) {
    // Log first 2 errors with context
    console.error('Search API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    if (error instanceof Error) {
      if (error.message.includes('embedding')) {
        return NextResponse.json(
          { error: 'Failed to generate query embedding' },
          { status: 500 }
        );
      }
      if (error.message.includes('RAG search')) {
        return NextResponse.json(
          { error: 'Failed to search knowledge base' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
