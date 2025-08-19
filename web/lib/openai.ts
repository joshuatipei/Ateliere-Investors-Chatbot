import OpenAI from 'openai';
import { env } from './env';

// Singleton OpenAI client
export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

/**
 * Generate embedding for text using OpenAI text-embedding-3-small
 * Returns 1536-dimensional vector
 */
export async function embed(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate chat completion using OpenAI
 */
export async function chatCompletion(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  model: string = 'gpt-4o-mini',
  temperature: number = 0.2
): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: 1000,
    });

    return completion.choices[0]?.message?.content || 'No response generated';
  } catch (error) {
    throw new Error(`Chat completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
