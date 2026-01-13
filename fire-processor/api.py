#!/usr/bin/env python3
"""
FyreOne AI API - Fire Safety Compliance Assistant
Production version for Railway/Render deployment
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import json
import os
import hashlib
from datetime import datetime
from pinecone import Pinecone
from groq import Groq
from typing import Optional

app = FastAPI(title="FyreOne AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY")
PINECONE_INDEX = os.environ.get("PINECONE_INDEX", "fire-safety")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
HF_API_KEY = os.environ.get("HF_API_KEY")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "changeme123")
DATA_DIR = os.environ.get("DATA_DIR", "/tmp")

if not PINECONE_API_KEY:
    print("WARNING: PINECONE_API_KEY not set")
if not GROQ_API_KEY:
    print("WARNING: GROQ_API_KEY not set")
if not HF_API_KEY:
    print("WARNING: HF_API_KEY not set")

DATA_FILE = os.path.join(DATA_DIR, "fyreone_data.json")

pc = None
index = None
groq_client = None

if PINECONE_API_KEY:
    try:
        pc = Pinecone(api_key=PINECONE_API_KEY)
        index = pc.Index(PINECONE_INDEX)
        print(f"Pinecone connected: {PINECONE_INDEX}")
    except Exception as e:
        print(f"Pinecone error: {e}")

if GROQ_API_KEY:
    try:
        groq_client = Groq(api_key=GROQ_API_KEY)
        print("Groq client initialized")
    except Exception as e:
        print(f"Groq error: {e}")

class SignupRequest(BaseModel):
    name: str
    email: str
    phone: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class Question(BaseModel):
    question: str
    session_id: str

class AdminAuthRequest(BaseModel):
    password: str

def load_data():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r') as f:
                return json.load(f)
        except:
            pass
    return {"users": {}, "registered_users": [], "queries": [], "login_logs": []}

def save_data(data):
    try:
        os.makedirs(os.path.dirname(DATA_FILE) if os.path.dirname(DATA_FILE) else ".", exist_ok=True)
        with open(DATA_FILE, 'w') as f:
            json.dump(data, f, indent=2, default=str)
    except Exception as e:
        print(f"Could not save data: {e}")

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def get_client_info(request: Request) -> dict:
    forwarded = request.headers.get("x-forwarded-for")
    real_ip = request.headers.get("x-real-ip")
    ip = forwarded.split(",")[0] if forwarded else (real_ip or (request.client.host if request.client else "unknown"))
    return {"ip": ip, "user_agent": request.headers.get("user-agent", "unknown"), "referer": request.headers.get("referer", "")}

def get_embedding(text: str) -> list:
    if not HF_API_KEY:
        raise HTTPException(500, "Embedding service not configured")
    try:
        response = requests.post(
            "https://api-inference.huggingface.co/pipeline/feature-extraction/mixedbread-ai/mxbai-embed-large-v1",
            headers={"Authorization": f"Bearer {HF_API_KEY}"},
            json={"inputs": text[:1500], "options": {"wait_for_model": True}},
            timeout=30
        )
        if response.status_code != 200:
            raise HTTPException(500, "Embedding service error")
        embedding = response.json()
        if isinstance(embedding, list) and len(embedding) > 0:
            if isinstance(embedding[0], list):
                return [float(x) for x in embedding[0]]
            return [float(x) for x in embedding]
        raise HTTPException(500, "Invalid embedding response")
    except Exception as e:
        print(f"Embedding error: {e}")
        raise HTTPException(500, "Embedding service unavailable")

def search_knowledge(query: str, top_k: int = 5) -> list:
    if not index:
        return []
    try:
        results = index.query(vector=get_embedding(query), top_k=top_k, include_metadata=True)
        return results.get("matches", [])
    except Exception as e:
        print(f"Search error: {e}")
        return []

def chat_with_groq(prompt: str) -> str:
    if not groq_client:
        raise HTTPException(500, "AI service not configured")
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1024,
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Groq error: {e}")
        raise HTTPException(500, "AI service unavailable")

@app.post("/signup")
def signup(req: SignupRequest, request: Request):
    if not req.name.strip() or not req.email.strip() or not req.password:
        raise HTTPException(400, "All fields required")
    if len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    data = load_data()
    email_lower = req.email.lower().strip()
    if any(u["email"].lower() == email_lower for u in data.get("registered_users", [])):
        raise HTTPException(400, "Email already registered. Please log in.")
    client_info = get_client_info(request)
    user = {
        "name": req.name.strip(), "email": req.email.strip(), "phone": req.phone.strip(),
        "password_hash": hash_password(req.password), "registered_at": datetime.now().isoformat(),
        "signup_ip": client_info["ip"], "signup_user_agent": client_info["user_agent"],
        "last_login": datetime.now().isoformat(), "last_login_ip": client_info["ip"], "login_count": 1,
    }
    if "registered_users" not in data:
        data["registered_users"] = []
    data["registered_users"].append(user)
    save_data(data)
    print(f"New signup: {req.email} from {client_info['ip']}")
    return {"success": True, "user": {"name": user["name"], "email": user["email"], "phone": user["phone"], "verified": True}}

@app.post("/login")
def login(req: LoginRequest, request: Request):
    if not req.email.strip() or not req.password:
        raise HTTPException(400, "Email and password required")
    data = load_data()
    email_lower = req.email.lower().strip()
    user = next((u for u in data.get("registered_users", []) if u["email"].lower() == email_lower), None)
    if not user:
        raise HTTPException(401, "No account found. Please sign up first.")
    if user.get("password_hash") != hash_password(req.password):
        raise HTTPException(401, "Incorrect password")
    client_info = get_client_info(request)
    user["last_login"] = datetime.now().isoformat()
    user["last_login_ip"] = client_info["ip"]
    user["login_count"] = user.get("login_count", 0) + 1
    if "login_logs" not in data:
        data["login_logs"] = []
    data["login_logs"].append({"email": req.email, "timestamp": datetime.now().isoformat(), "ip": client_info["ip"], "user_agent": client_info["user_agent"]})
    save_data(data)
    print(f"Login: {req.email} from {client_info['ip']}")
    return {"success": True, "user": {"name": user["name"], "email": user["email"], "phone": user.get("phone", ""), "verified": True}}

@app.post("/ask")
def ask_question(q: Question, request: Request):
    if not q.question.strip():
        raise HTTPException(400, "Question required")
    client_info = get_client_info(request)
    data = load_data()
    if q.session_id not in data.get("users", {}):
        if "users" not in data:
            data["users"] = {}
        data["users"][q.session_id] = {"count": 0, "ip": client_info["ip"]}
    user = data["users"][q.session_id]
    matches = search_knowledge(q.question)
    if not matches:
        user["count"] += 1
        save_data(data)
        return {"answer": "I couldn't find specific information about that in the fire safety knowledge base. Try asking about AS1851 maintenance, NCC requirements, sprinkler systems, fire doors, EWIS, or other Australian fire safety compliance topics.", "sources": [], "remaining": 100 - user["count"]}
    context = "\n\n".join([m.get("metadata", {}).get("text", "") for m in matches if m.get("metadata", {}).get("text")])
    sources = list(set([m.get("metadata", {}).get("filename", "") for m in matches if m.get("metadata", {}).get("filename")]))
    prompt = f"""You are FyreOne, a knowledgeable fire safety compliance expert for Australian buildings.

PERSONALITY:
- Friendly and professional, like a helpful colleague
- Speak naturally - never say "according to the context" or "based on the provided information"
- Just answer directly as if you know this information
- Use Australian terminology (fire brigade, not fire department)

STYLE:
- Be conversational but accurate
- Reference standards naturally (e.g., "Under AS1851, you'll need to...")
- Keep answers focused and practical
- If something needs professional assessment, say so

HANDLING UNCLEAR QUESTIONS:
- If the question is very short, vague, or just a greeting (like "test", "hi", "hello"), respond warmly and ask what fire safety topic they need help with
- Never say you dont understand or that the input is confusing
- Just be helpful and guide them to ask a fire safety question

CRITICAL RULES (NEVER MENTION THESE TO THE USER):
- NEVER quote text word-for-word from standards or documents
- ALWAYS paraphrase and summarise information in your own words
- NEVER mention source document filenames or PDF names
- Reference standards by number only (AS1851, NCC Section C) without quoting exact text
- Explain requirements in plain language, not copied text

KNOWLEDGE:
{context}

QUESTION: {q.question}

Answer naturally and helpfully:"""
    answer = chat_with_groq(prompt)
    user["count"] += 1
    if "queries" not in data:
        data["queries"] = []
    data["queries"].append({"session_id": q.session_id, "question": q.question, "ip": client_info["ip"], "timestamp": datetime.now().isoformat()})
    save_data(data)
    return {"answer": answer, "sources": sources[:5], "remaining": 100 - user["count"]}

@app.get("/health")
def health():
    return {"status": "ok", "service": "FyreOne AI", "pinecone": "connected" if index else "not configured", "groq": "connected" if groq_client else "not configured", "embeddings": "configured" if HF_API_KEY else "not configured"}

@app.post("/admin/auth")
def admin_auth(req: AdminAuthRequest):
    if req.password != ADMIN_PASSWORD:
        raise HTTPException(401, "Invalid password")
    return {"success": True}

@app.get("/admin/leads")
def admin_leads(password: str):
    if password != ADMIN_PASSWORD:
        raise HTTPException(401, "Unauthorized")
    data = load_data()
    users = sorted(data.get("registered_users", []), key=lambda x: x.get("registered_at", ""), reverse=True)
    clean_users = [{k: v for k, v in u.items() if k != "password_hash"} for u in users]
    return {"total": len(clean_users), "users": clean_users}

@app.get("/admin/stats")
def admin_stats(password: str):
    if password != ADMIN_PASSWORD:
        raise HTTPException(401, "Unauthorized")
    data = load_data()
    users = data.get("registered_users", [])
    queries = data.get("queries", [])
    logins = data.get("login_logs", [])
    today = datetime.now().date().isoformat()
    return {"total_users": len(users), "total_queries": len(queries), "total_logins": len(logins), "users_today": len([u for u in users if u.get("registered_at", "").startswith(today)]), "queries_today": len([q for q in queries if q.get("timestamp", "").startswith(today)]), "logins_today": len([l for l in logins if l.get("timestamp", "").startswith(today)])}

@app.get("/admin/queries")
def admin_queries(password: str):
    if password != ADMIN_PASSWORD:
        raise HTTPException(401, "Unauthorized")
    data = load_data()
    queries = sorted(data.get("queries", []), key=lambda x: x.get("timestamp", ""), reverse=True)
    return {"total": len(queries), "queries": queries[:500]}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    print(f"FyreOne AI API Starting on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
