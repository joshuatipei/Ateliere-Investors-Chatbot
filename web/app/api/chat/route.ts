// web/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { embed, chatCompletion } from '@/lib/openai';
import { searchChunks, SearchResult } from '@/lib/supabaseClient';

interface ChatRequest {
  message: string;
  topK?: number;
  source?: string;
}

interface ChatResponse {
  answer: string;
  citations: Array<{
    source_table: string;
    title: string | null;
  }>;
  contextUsed: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body: ChatRequest = await request.json();
    
    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid message parameter' },
        { status: 400 }
      );
    }

    const message = body.message.trim();
    const topK = Math.min(Math.max(body.topK || 8, 1), 20);
    const sourceFilter = body.source || null;

    if (message.length === 0) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    // Generate embedding for the message
    const queryEmbedding = await embed(message);

    // Search for relevant chunks
    const results = await searchChunks(queryEmbedding, topK, sourceFilter);

    let answer: string;
    let contextUsed = false;

    if (results.length === 0) {
      // No relevant context found
      answer = "I couldn't find anything relevant in the knowledge base to answer your question. Please try rephrasing or ask about something else.";
    } else {
      // Build context string from results
      const contextParts = results.map((result: SearchResult) => 
        `- [${result.similarity.toFixed(3)}] ${result.title || 'No title'} (${result.source_table}): ${result.content}`
      );
      
      let contextString = contextParts.join('\n\n');
      
      // Truncate context to ~6-8k characters to avoid token blowups
      const maxContextLength = 7000;
      if (contextString.length > maxContextLength) {
        contextString = contextString.substring(0, maxContextLength) + '\n\n[Context truncated for length]';
      }

      // Generate response with context
      const systemPrompt = `Use the provided context to answer the user's question. If the context is insufficient to fully answer the question, say so clearly. Always cite the source_table in your answer when referencing information from the context. Keep your response concise and helpful.`;

      const userPrompt = `Context:\n${contextString}\n\nQuestion: ${message}`;

      answer = await chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      contextUsed = true;
    }

    // Build citations from results
    const citations = results.map((result: SearchResult) => ({
      source_table: result.source_table,
      title: result.title
    }));

    const response: ChatResponse = {
      answer,
      citations,
      contextUsed
    };

    return NextResponse.json(response);

  } catch (error) {
    // Log errors with context
    console.error('Chat API error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    if (error instanceof Error) {
      if (error.message.includes('embedding')) {
        return NextResponse.json(
          { error: 'Failed to generate message embedding' },
          { status: 500 }
        );
      }
      if (error.message.includes('RAG search')) {
        return NextResponse.json(
          { error: 'Failed to search knowledge base' },
          { status: 500 }
        );
      }
      if (error.message.includes('Chat completion')) {
        return NextResponse.json(
          { error: 'Failed to generate response' },
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
