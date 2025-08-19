import { createHash } from 'crypto';

/**
 * Split text into sentences while preserving sentence boundaries
 */
export function splitIntoSentences(text: string): string[] {
  // Split on sentence endings (., !, ?) followed by whitespace or end of string
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Get overlap text from previous chunk to maintain context
 */
export function getOverlapText(previousChunk: string, overlapSize: number): string {
  if (!previousChunk || overlapSize <= 0) return '';
  
  const words = previousChunk.split(/\s+/);
  if (words.length <= overlapSize) return previousChunk;
  
  return words.slice(-overlapSize).join(' ');
}

/**
 * Merge small chunks to meet minimum size requirements
 */
export function mergeSmallChunks(chunks: string[], minSize: number): string[] {
  if (chunks.length === 0) return chunks;
  
  const merged: string[] = [];
  let currentChunk = chunks[0];
  
  for (let i = 1; i < chunks.length; i++) {
    const nextChunk = chunks[i];
    const combinedLength = currentChunk.length + nextChunk.length;
    
    if (combinedLength < minSize) {
      // Merge chunks with a space separator
      currentChunk = currentChunk + ' ' + nextChunk;
    } else {
      // Current chunk is big enough, save it and start new one
      merged.push(currentChunk);
      currentChunk = nextChunk;
    }
  }
  
  // Don't forget the last chunk
  merged.push(currentChunk);
  
  return merged;
}

/**
 * Split text into chunks with overlap
 */
export function chunkText(
  text: string,
  targetSize: number = 1200,
  overlap: number = 200,
  minSize: number = 800,
  maxSize: number = 1500
): string[] {
  if (text.length <= targetSize) {
    return [text];
  }
  
  // Split into sentences first
  const sentences = splitIntoSentences(text);
  const chunks: string[] = [];
  let currentChunk = '';
  let previousChunk = '';
  
  for (const sentence of sentences) {
    const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
    
    if (potentialChunk.length <= targetSize) {
      currentChunk = potentialChunk;
    } else {
      // Current chunk is full, save it
      if (currentChunk.length >= minSize) {
        chunks.push(currentChunk);
        previousChunk = currentChunk;
        currentChunk = sentence;
      } else {
        // Chunk is too small, try to add more sentences
        currentChunk = potentialChunk;
      }
    }
    
    // Check if we've exceeded max size
    if (currentChunk.length > maxSize) {
      // Force split at sentence boundary
      if (currentChunk.length >= minSize) {
        chunks.push(currentChunk);
        previousChunk = currentChunk;
        currentChunk = sentence;
      } else {
        // Even with one sentence, we're over max size
        // Split the sentence itself (not ideal but necessary)
        const words = currentChunk.split(/\s+/);
        let tempChunk = '';
        
        for (const word of words) {
          if ((tempChunk + ' ' + word).length <= maxSize) {
            tempChunk = (tempChunk ? tempChunk + ' ' : '') + word;
          } else {
            if (tempChunk.length >= minSize) {
              chunks.push(tempChunk);
              previousChunk = tempChunk;
              tempChunk = word;
            } else {
              // Force add this word even if it makes chunk small
              tempChunk = (tempChunk ? tempChunk + ' ' : '') + word;
            }
          }
        }
        currentChunk = tempChunk;
      }
    }
  }
  
  // Add the last chunk if it meets minimum size
  if (currentChunk.length >= minSize) {
    chunks.push(currentChunk);
  } else if (chunks.length > 0) {
    // Merge last small chunk with previous one
    chunks[chunks.length - 1] += ' ' + currentChunk;
  } else {
    // Only one chunk, add it regardless of size
    chunks.push(currentChunk);
  }
  
  // Add overlap text to maintain context between chunks
  const chunksWithOverlap: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    let chunk = chunks[i];
    
    if (i > 0 && overlap > 0) {
      const overlapText = getOverlapText(chunks[i - 1], overlap);
      if (overlapText) {
        chunk = overlapText + ' ' + chunk;
      }
    }
    
    chunksWithOverlap.push(chunk);
  }
  
  // Final merge of small chunks
  return mergeSmallChunks(chunksWithOverlap, minSize);
}

/**
 * Generate SHA-256 hash of text content for change detection
 */
export function generateContentHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}
