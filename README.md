<p align="center">
  <img src="https://aarp.widen.net/content/kaczwy7ezp/web/DigitalVaultNEw.gif?animate=true&u=5jvmea" alt="MemoryVault Project Banner" width="100%"/>
</p>

<h1 align="center">MemoryVault</h1>

<p align="center">
  Architected a privacy-first, full-stack app (Next.js/Node.js) deploying a **RAG pipeline** with **768-dim Gemini embeddings**, **Pinecone** vector search, and **RLS/metadata filtering** to deliver semantic answers with **<2s latency**.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Google%20Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Google Gemini">
  <img src="https://img.shields.io/badge/Pinecone-FFC107?style=for-the-badge&logo=pinecone&logoColor=black" alt="Pinecone">
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
</p>

---

## 🚀 Live Demo

<p align="center">
  <img src="https://github.com/hasnainpatil/MemoryVault/blob/main/frontend/_assets/Animation.gif?raw=true" alt="MemoryVault Demo"/>
</p>

### Key Features
* **Privacy-First Security:** Guarantees zero data cross-contamination using **PostgreSQL RLS** and **Pinecone Metadata Filtering**.
* **AI-Native PDF Ingestion:** Uses a **multimodal Gemini model** to extract text directly from PDFs, bypassing fragile parsing libraries.
* **Semantic RAG Pipeline:** Ingests documents, chunks them with `RecursiveCharacterTextSplitter`, and embeds them using **Google's `text-embedding-004`**.
* **Instant Chat:** Uses **LangChain** to retrieve relevant context and generate deterministic answers with a **Temperature of 0**.
* **Futuristic UI:** Built with **Tailwind CSS** and **Framer Motion** for a fluid, responsive, and high-tech user experience.

---

## 🏛️ System Architecture

This project is a full-stack, decoupled application. The frontend (Next.js) is a static host, while the backend (Node.js) is a stateful API server handling all heavy logic.

```mermaid
graph TD
    A[User on Next.js:3000] --> B{Node.js API:5001};

    subgraph "Auth Workflow"
        B --> C[POST /api/auth/signup];
        C --> D[Supabase Auth];
        D --> E[Create user in auth.users];
        E --> C;
        C --> F[Create row in public.profiles];
        F --> B;
    end

    subgraph "RAG Pipeline (Ingestion)"
        A --> G[POST /api/documents/upload];
        G --> H[Supabase Storage];
        G --> I["Google AI SDK<br/>(AI-Native Text Extraction)"];
        I --> J[Chunk Text];
        J --> K[Google Embedding API];
        K --> L[Pinecone Vector DB];
        L --> G;
        G --> M[Create row in public.documents];
    end

    subgraph "RAG Pipeline (Query)"
        A --> N[POST /api/documents/chat];
        N --> O["Google Embedding API<br/>(Embeds Question)"];
        O --> P["Pinecone Vector DB<br/>(Similarity Search + Metadata Filter)"];
        P --> Q[Get Relevant Chunks];
        Q --> R["Google Chat API<br/>(Injects Chunks + Query)"];
        R --> S[Get Final Answer];
        S --> N;
        N --> A;
    end
