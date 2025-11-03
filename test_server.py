"""
Minimal test server to verify CORS and basic functionality
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="Test Server")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Test server is working"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/api/v1/auth/register")
async def test_register():
    return {"message": "Register endpoint is working"}

@app.options("/api/v1/auth/register")
async def options_register():
    return {"message": "OPTIONS working"}

if __name__ == "__main__":
    uvicorn.run("test_server:app", host="0.0.0.0", port=8001, reload=True)
