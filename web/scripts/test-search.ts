#!/usr/bin/env tsx

import 'dotenv/config';
import { assertEnv } from '../lib/env';
import { embed } from '../lib/openai';
import { searchChunks } from '../lib/supabaseClient';

// Validate environment
assertEnv();

async function testSearch() {
  try {
    console.log('🧪 Testing RAG Search Functionality');
    console.log('=' .repeat(50));

    // Test 1: Generate embedding
    console.log('\n1️⃣ Testing OpenAI embedding...');
    const testText = 'test';
    const embedding = await embed(testText);
    console.log(`✅ Generated embedding: ${embedding.length} dimensions`);
    console.log(`   First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);

    // Test 2: Search chunks
    console.log('\n2️⃣ Testing Supabase RAG search...');
    const results = await searchChunks(embedding, 3);
    
    if (results.length === 0) {
      console.log('⚠️  No search results found. This might mean:');
      console.log('   - The RAG index is empty (run the indexer first)');
      console.log('   - The rag.search_chunks RPC function doesn\'t exist');
      console.log('   - There are permission issues');
    } else {
      console.log(`✅ Found ${results.length} search results:`);
      results.forEach((result, index) => {
        console.log(`\n   Result ${index + 1}:`);
        console.log(`   - Similarity: ${result.similarity.toFixed(4)}`);
        console.log(`   - Source: ${result.source_table}`);
        console.log(`   - Title: ${result.title || 'No title'}`);
        console.log(`   - Content: ${result.content.substring(0, 100)}...`);
      });
    }

    // Test 3: Test with source filter
    if (results.length > 0) {
      console.log('\n3️⃣ Testing with source filter...');
      const sourceFilter = results[0].source_table;
      const filteredResults = await searchChunks(embedding, 2, sourceFilter);
      console.log(`✅ Source filter "${sourceFilter}": ${filteredResults.length} results`);
    }

    console.log('\n🎯 Test completed successfully!');

  } catch (error) {
    console.error('\n💥 Test failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Missing required environment variables')) {
        console.log('\n🔧 Troubleshooting:');
        console.log('   - Check that .env.local exists and contains:');
        console.log('     SUPABASE_URL=...');
        console.log('     SUPABASE_ANON_KEY=...');
        console.log('     OPENAI_API_KEY=...');
      } else if (error.message.includes('RAG search failed')) {
        console.log('\n🔧 Troubleshooting:');
        console.log('   - Verify the rag.search_chunks RPC function exists in Supabase');
        console.log('   - Check that the ANON key has permission to call RPC functions');
        console.log('   - Ensure the rag schema and tables exist');
      } else if (error.message.includes('Failed to generate embedding')) {
        console.log('\n🔧 Troubleshooting:');
        console.log('   - Verify OPENAI_API_KEY is valid');
        console.log('   - Check OpenAI API quota and billing');
      }
    }
    
    process.exit(1);
  }
}

// Run the test
testSearch();
