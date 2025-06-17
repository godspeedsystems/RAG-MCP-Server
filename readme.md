# Godspeed RAG Chatbot

A Retrieval-Augmented Generation (RAG) chatbot built using the [Godspeed Framework](https://github.com/godspeedsystems/gs-documentation), designed to intelligently respond to queries using the latest Godspeed Systems documentation. It leverages embeddings and a local FAISS vector database to deliver fast, relevant, and source-traceable answers.

---

##  Key Features

### 1. **Query Handling via `mcp.handle-query` Tool**
- **Purpose**: Core component responsible for receiving user queries and returning relevant context and sources.
- **How it Works**:
  - Hosted on `stdio` and automatically connected to the **Saarthi** assistant.
  - When the "Godspeed Mode" is activated in Saarthi, user queries are forwarded to this tool.
  - The tool searches the FAISS vector store for relevant content and returns:
    - Extracted context
    - Source document paths

### 2. **GitHub Documentation Ingestion**
- **Source**: [Godspeed Documentation GitHub Repo](https://github.com/godspeedsystems/gs-documentation)
- **How it Works**:
  - Repo URL and branch are configured.
  - The ingestion script checks for diffs via GitHub API and SHA hash comparison to determine modified files.
  - New or modified files are chunked and embedded using a Google Gemini embedding model, then upserted into FAISS.

### 3. **FAISS Vector Store (Local)**
- **Why FAISS**:
  - FAISS is fast and efficient, particularly with local storage.
  - Minimizes latency compared to remote vector databases.
- **Operations**:
  - Upsert, search, delete vectors
  - Stores document path as `doc_id` for efficient tracking of file changes

### 4. **User Query HTTP Endpoint**
- Accepts user queries via HTTP and returns context and results in real-time.
- Useful for testing or integrating the chatbot into frontend applications.

### 5. **Document Upload HTTP Endpoint**
- Accepts raw documentation files for ingestion.
- Uses SHA comparison to avoid redundant vector operations.

### 6. **LLM Configuration HTTP Endpoint**
- Allows dynamic configuration of embedding/LLM keys for better modularity.
- Currently supports **Google Gemini Embeddings**.

### 7. **Cron Job for Repo Sync**
- **Frequency**: Checks every minute.
- **Sync Trigger**: Detects if 24 hours have passed since the last update.
- **Action**: If a day has passed, it re-fetches GitHub data and re-ingests changed files.

### 8. **API Key Management via `mcp.handle-api-key`**
- **Integration**: API key input can be done via **Saarthi** through the MCP layer.
- Ensures secure and flexible key injection for embedding models.

---

## 🧱 Architecture

```text
                          ┌────────────┐
                          │   Saarthi  │
                          └─────┬──────┘
                                │
                                ▼
                      ┌────────────────────┐
                      │ mcp.handle-query   │◄────┐
                      └────────┬───────────┘     │
                               │                 │
          ┌────────────────────▼────────────┐    │
          │  FAISS Vector Store (Local)     │    │
          └─────────────────────────────────┘    │
                               ▲                 │
        ┌──────────────────────┴────────────┐    │
        │ ingest_and_update_docs.ts         │◄───┘
        └────────────────┬──────────────────┘
                         │
       ┌─────────────────▼───────────────────────┐
       │ GitHub Repo: gs-documentation           │
       └─────────────────────────────────────────┘
```
# 🛠 Installation

## Windows

Open **PowerShell as Administrator**, then run:

```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/godspeedsystems/RAG-MCP-Server/main/Installation_scripts/script.ps1" -OutFile "install.ps1"
Start-Process powershell -ArgumentList "-File .\install.ps1" -Verb RunAs
```

## Linux/macOS

```bash
curl -fsSL https://raw.githubusercontent.com/godspeedsystems/RAG-MCP-Server/main/Installation_scripts/script.sh -o GodspeedCLI.sh
chmod +x GodspeedCLI.sh
./GodspeedCLI.sh
```


📌 Once installed and an API key is provided, the project is automatically started by Saarthi by invoking the `start_clean` script.

---

# 🚀 Running the Project

## Clean Start (Windows)

```cmd
start_clean.bat
```

## Clean Start (Linux/macOS)

```bash
./start_clean.sh
```

Both scripts:

- Kill any process on port 10947  
- Run `godspeed serve` to start the backend

---

#  Limitations

## Embedding Model Limitation

- Currently supports only **Google Gemini Embeddings**
- Other models like **OpenAI**, **Cohere**, etc., are not yet integrated

## Local FAISS Index

- **Pros**: Fast and efficient  
- **Cons**: Not scalable for distributed or cloud-native architectures

## Single Documentation Source

- Currently tied to a specific GitHub repo (`gs-documentation`)
- No built-in support for multiple sources or domains

## No GUI/Web Interface

- Operates via CLI, MCP, or HTTP endpoints  
- No default front-end for interacting with the bot

---

# 🧪 Test Scenarios

-  Query handling through Saarthi and `mcp.handle-query`
-  Documentation updates via GitHub sync (cron job)
-  File-level change detection using SHA and GitHub diffs
-  API key configuration using `mcp.handle-api-key`
-  Document ingestion through HTTP endpoint

---

# 🧩 Future Improvements

- 🧠 Embedding model selection and modular configuration  
- 📊 Improve logging and usage analytics  
