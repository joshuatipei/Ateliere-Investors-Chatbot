#!/usr/bin/env tsx

import 'dotenv/config';
import { Command } from 'commander';
import { assertIndexerEnv } from '../lib/env';
import { ragTables } from './supabase';
import { chunkText, generateContentHash } from './chunk';
import { fetchTableRows, transformRowToDocument, getTableStats, validateTables } from './tables';
import { embed } from '../lib/openai';

interface IndexingOptions {
  tables: string[];
  limit: number;
  offset: number;
  reembed: 'none' | 'missing' | 'all';
  model: string;
}

interface IndexingStats {
  documentsProcessed: number;
  chunksCreated: number;
  embeddingsWritten: number;
  errors: number;
}

class RAGIndexer {
  private options: IndexingOptions;
  private stats: Map<string, IndexingStats>;

  constructor(options: IndexingOptions) {
    this.options = options;
    this.stats = new Map();
  }

  async run(): Promise<void> {
    console.log('🚀 Starting RAG Indexing Process');
    console.log('=' .repeat(50));
    console.log(`Tables: ${this.options.tables.join(', ')}`);
    console.log(`Batch size: ${this.options.limit}`);
    console.log(`Offset: ${this.options.offset}`);
    console.log(`Re-embedding: ${this.options.reembed}`);
    console.log(`OpenAI model: ${this.options.model}`);
    console.log(`Chunk options: ${JSON.stringify({ targetSize: 1200, overlap: 200, minSize: 800, maxSize: 1500 })}`);
    console.log();

    // Validate tables
    console.log('🔍 Validating tables...');
    const validTables = await validateTables(this.options.tables);
    
    if (validTables.length === 0) {
      console.log('⚠️  No valid tables to process');
      return;
    }

    console.log(`✅ Valid tables: ${validTables.join(', ')}`);
    console.log();

    // Get table statistics
    console.log('📊 Table statistics:');
    const tableStats = await getTableStats();
    for (const [tableName, count] of Object.entries(tableStats)) {
      if (validTables.includes(tableName)) {
        console.log(`   ${tableName}: ${count} rows`);
      }
    }
    console.log();

    // Process each table
    for (const tableName of validTables) {
      await this.processTable(tableName);
    }

    // Print final statistics
    this.printFinalStats();
  }

  private async processTable(tableName: string): Promise<void> {
    console.log(`📋 Processing table: ${tableName}`);
    console.log('─'.repeat(30));

    const tableStats: IndexingStats = {
      documentsProcessed: 0,
      chunksCreated: 0,
      embeddingsWritten: 0,
      errors: 0
    };

    this.stats.set(tableName, tableStats);

    try {
      let offset = this.options.offset;
      let hasMore = true;

      while (hasMore) {
        // Fetch batch of rows
        const rows = await fetchTableRows(tableName, this.options.limit, offset);
        
        if (rows.length === 0) {
          hasMore = false;
          break;
        }

        console.log(`   Processing batch: ${rows.length} rows (offset: ${offset})`);

        // Process each row
        for (const row of rows) {
          try {
            await this.processRow(tableName, row, tableStats);
          } catch (error) {
            console.error(`   ❌ Error processing row:`, error);
            tableStats.errors++;
          }
        }

        offset += rows.length;
        
        // Check if we've processed enough rows
        if (rows.length < this.options.limit) {
          hasMore = false;
        }
      }

      console.log(`   ✅ Completed: ${tableStats.documentsProcessed} documents, ${tableStats.chunksCreated} chunks, ${tableStats.embeddingsWritten} embeddings`);

    } catch (error) {
      console.error(`   💥 Fatal error processing table ${tableName}:`, error);
      tableStats.errors++;
    }

    console.log();
  }

  private async processRow(tableName: string, row: any, tableStats: IndexingStats): Promise<void> {
    // Transform row to source document
    const sourceDoc = transformRowToDocument(tableName, row);
    
    // Skip if no content
    if (!sourceDoc.content || sourceDoc.content.trim().length === 0) {
      return;
    }

    // Generate content hash for change detection
    const contentHash = generateContentHash(sourceDoc.content);

    // Check if document already exists and has same content
    const existingHash = await ragTables.getDocumentHash(sourceDoc.source_table, sourceDoc.source_id);
    
    if (existingHash === contentHash && this.options.reembed === 'none') {
      // Document unchanged, skip processing
      return;
    }

    // Upsert document
    const documentId = await ragTables.upsertDocument({
      ...sourceDoc,
      content_hash: contentHash
    });

    tableStats.documentsProcessed++;

    // Generate chunks
    const chunks = chunkText(sourceDoc.content, 1200, 200, 800, 1500);
    
    // Process chunks
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunkContent = chunks[chunkIndex];
      
      // Check if chunk already exists
      const existingChunk = await ragTables.getChunk(documentId, chunkIndex);
      
      let embedding: number[] | null = null;
      
      // Determine if we need to generate/regenerate embedding
      if (this.options.reembed === 'all' || 
          this.options.reembed === 'missing' || 
          !existingChunk?.embedding) {
        
        try {
          embedding = await embed(chunkContent);
          tableStats.embeddingsWritten++;
        } catch (error) {
          console.error(`   ⚠️  Failed to generate embedding for chunk ${chunkIndex}:`, error);
          // Continue without embedding
        }
      } else if (existingChunk?.embedding) {
        // Use existing embedding
        embedding = existingChunk.embedding;
      }

      // Upsert chunk
      await ragTables.upsertChunk({
        document_id: documentId,
        chunk_index: chunkIndex,
        content: chunkContent,
        embedding
      });

      tableStats.chunksCreated++;
    }
  }

  private printFinalStats(): void {
    console.log('📈 Final Statistics');
    console.log('=' .repeat(50));
    
    let totalDocs = 0;
    let totalChunks = 0;
    let totalEmbeddings = 0;
    let totalErrors = 0;

    for (const [tableName, stats] of this.stats) {
      console.log(`${tableName}:`);
      console.log(`   Documents: ${stats.documentsProcessed}`);
      console.log(`   Chunks: ${stats.chunksCreated}`);
      console.log(`   Embeddings: ${stats.embeddingsWritten}`);
      if (stats.errors > 0) {
        console.log(`   Errors: ${stats.errors}`);
      }
      console.log();

      totalDocs += stats.documentsProcessed;
      totalChunks += stats.chunksCreated;
      totalEmbeddings += stats.embeddingsWritten;
      totalErrors += stats.errors;
    }

    console.log('TOTALS:');
    console.log(`   Documents: ${totalDocs}`);
    console.log(`   Chunks: ${totalChunks}`);
    console.log(`   Embeddings: ${totalEmbeddings}`);
    if (totalErrors > 0) {
      console.log(`   Errors: ${totalErrors}`);
    }
  }
}

// CLI setup
const program = new Command();

program
  .name('rag-indexer')
  .description('Build RAG index from source tables')
  .version('1.0.0');

program
  .option('-t, --tables <tables>', 'Comma-separated list of tables to process', 'internal_data,press_release,board_members,partnerships,financial_reports,company_news,product_info,executive_team,investor_relations')
  .option('-l, --limit <number>', 'Number of rows to process per batch', '100')
  .option('-o, --offset <number>', 'Starting offset for processing', '0')
  .option('-r, --reembed <strategy>', 'Re-embedding strategy: none, missing, or all', 'none')
  .option('-m, --model <model>', 'OpenAI embedding model to use', 'text-embedding-3-small');

program.parse(process.argv);

const options = program.opts();

// Validate re-embedding strategy
if (!['none', 'missing', 'all'].includes(options.reembed)) {
  console.error('❌ Invalid re-embedding strategy. Must be: none, missing, or all');
  process.exit(1);
}

// Parse tables
const tables = options.tables.split(',').map((t: string) => t.trim());

// Parse numeric options
const limit = parseInt(options.limit, 10);
const offset = parseInt(options.offset, 10);

if (isNaN(limit) || limit <= 0) {
  console.error('❌ Invalid limit. Must be a positive number.');
  process.exit(1);
}

if (isNaN(offset) || offset < 0) {
  console.error('❌ Invalid offset. Must be a non-negative number.');
  process.exit(1);
}

// Check for required environment variables
try {
  assertIndexerEnv();
} catch (error) {
  console.error('❌ Environment setup failed:', error instanceof Error ? error.message : 'Unknown error');
  console.error('Please ensure SUPABASE_URL, SUPABASE_SERVICE_ROLE, and OPENAI_API_KEY are set.');
  process.exit(1);
}

// Initialize OpenAI client
try {
  // Test OpenAI connection
  await embed('test');
  console.log(`✅ OpenAI client initialized for embeddings (model: ${options.model})`);
} catch (error) {
  console.error('❌ Failed to initialize OpenAI client:', error instanceof Error ? error.message : 'Unknown error');
  console.error('Please check your OPENAI_API_KEY and OpenAI API access.');
  process.exit(1);
}

// Run the indexer
const indexer = new RAGIndexer({
  tables,
  limit,
  offset,
  reembed: options.reembed,
  model: options.model
});

indexer.run()
  .then(() => {
    console.log('\n✅ Indexing completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Indexing failed:', error);
    process.exit(1);
  });
