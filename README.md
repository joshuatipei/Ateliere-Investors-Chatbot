# Ateliere Investor RAG Chatbot

A sophisticated Retrieval-Augmented Generation (RAG) chatbot for Ateliere Creative Technologies investors, built with Next.js, Supabase, and OpenAI.

## 🏗️ Project Structure

```
ateliere-investors-chatbot/          ← Root repository
├── .git/                           ← Git repository
├── package.json                    ← Root package.json (monorepo config)
├── .env 2.local                    ← Environment variables
└── web/                            ← Next.js RAG application
    ├── lib/                        ← Core libraries
    │   ├── env.ts                  ← Environment validation
    │   ├── openai.ts               ← OpenAI client & embeddings
    │   └── supabaseClient.ts       ← Supabase client for web/API
    ├── app/                        ← Next.js App Router
    │   ├── api/                    ← API routes
    │   │   ├── health/             ← Health check endpoint
    │   │   ├── search/             ← RAG search API
    │   │   └── chat/               ← RAG chat API
    │   ├── page.tsx                ← Main chat interface
    │   └── layout.tsx              ← App layout
    ├── scripts/                    ← RAG indexing & utilities
    │   ├── build-index.ts          ← Main indexing orchestrator
    │   ├── chunk.ts                ← Text chunking utilities
    │   ├── tables.ts               ← Table mapping & transformation
    │   ├── supabase.ts             ← Indexer Supabase client
    │   └── test-search.ts          ← RAG testing script
    ├── package.json                ← Next.js dependencies
    └── tsconfig.json               ← TypeScript configuration
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Set Environment Variables
Copy `.env 2.local` to `web/.env.local`:
```bash
cp ".env 2.local" web/.env.local
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Test RAG Functionality
```bash
npm run test:search
```

## 🔧 Available Scripts

### Root Level (Monorepo)
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run linting
- `npm run test:search` - Test RAG search
- `npm run install:all` - Install all dependencies

### Web Directory
- `cd web && npm run dev` - Start Next.js dev server
- `cd web && npm run build` - Build Next.js app
- `cd web && npm run start` - Start Next.js production server

## 🧠 RAG Features

### Core Capabilities
- **Document Indexing**: Automatically chunks and indexes documents from 9 source tables
- **Vector Search**: Uses OpenAI text-embedding-3-small (1536 dimensions)
- **Context-Aware Chat**: Builds responses using relevant document chunks
- **Citation Tracking**: Provides source attribution for all responses

### Source Tables Supported
1. `internal_data` - Internal company data
2. `press_release` - Press releases and announcements
3. `board_members` - Board member information
4. `partnerships` - Partnership details
5. `financial_reports` - Financial reporting
6. `company_news` - Company news and updates
7. `product_info` - Product information
8. `executive_team` - Executive team details
9. `investor_relations` - Investor relations content

## 🔐 Environment Variables

Required environment variables (set in `web/.env.local`):

```bash
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE=your_supabase_service_role_key
```

## 📊 API Endpoints

### Health Check
- `GET /api/health` - Server health status

### RAG Search
- `POST /api/search` - Search knowledge base
  - Body: `{ "q": "query", "topK": 5, "source": "table_name" }`

### RAG Chat
- `POST /api/chat` - Chat with RAG context
  - Body: `{ "message": "user message", "topK": 5, "source": "table_name" }`

## 🗄️ Database Schema

The RAG system uses two main tables in the `rag` schema:

### `rag.doc_index`
- Stores original documents with content hashing
- Supports idempotent updates

### `rag.chunk_index`
- Stores document chunks with embeddings
- Enables vector similarity search

## 🔄 Indexing Process

### Manual Indexing
```bash
cd web
npx tsx scripts/build-index.ts --tables internal_data,press_release --limit 100
```

### Indexing Options
- `--tables`: Comma-separated list of tables to process
- `--limit`: Rows per batch (default: 100)
- `--offset`: Starting offset (default: 0)
- `--reembed`: Strategy: none, missing, or all (default: none)
- `--model`: OpenAI embedding model (default: text-embedding-3-small)

## 🧪 Testing

### Test RAG Search
```bash
npm run test:search
```

### Test API Endpoints
```bash
# Health check
curl -s http://localhost:3000/api/health

# Search API
curl -s -X POST http://localhost:3000/api/search \
  -H 'Content-Type: application/json' \
  --data '{"q":"What is Ateliere?","topK":5}'

# Chat API
curl -s -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  --data '{"message":"Summarize Ateliere Connect","topK":5}'
```

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms
- **Netlify**: Compatible with Next.js
- **Railway**: Full-stack deployment
- **Self-hosted**: Docker containerization supported

## 🔒 Security

- **ANON Key**: Used for read-only web/API operations
- **SERVICE_ROLE Key**: Used only for indexing operations
- **Environment Variables**: Never committed to Git
- **Content Hashing**: Prevents duplicate processing

## 📈 Performance

- **Chunking**: Optimal 1200-character chunks with 200-character overlap
- **Embedding Model**: text-embedding-3-small (fast, accurate, cost-effective)
- **Batch Processing**: Configurable batch sizes for large datasets
- **Idempotent Updates**: Only processes changed content

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

Private - Ateliere Creative Technologies

---

**Built with ❤️ for Ateliere investors**
