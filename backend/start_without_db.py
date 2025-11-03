#!/usr/bin/env python3
"""
Start the Smart Health backend without requiring MongoDB
Useful for development when database is not available
"""

import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Set environment variable to skip database connection
os.environ["SKIP_DATABASE"] = "true"

def check_dependencies():
    """Check if required dependencies are available"""
    missing_deps = []
    
    try:
        import fastapi
    except ImportError:
        missing_deps.append("fastapi")
    
    try:
        import uvicorn
    except ImportError:
        missing_deps.append("uvicorn")
    
    if missing_deps:
        print(f"❌ Missing dependencies: {', '.join(missing_deps)}")
        print("📦 Install with: pip install fastapi uvicorn")
        return False
    
    return True

if __name__ == "__main__":
    if not check_dependencies():
        sys.exit(1)
    
    try:
        import uvicorn
        
        print("🚀 Starting Smart Health Backend (No Database Mode)")
        print("📝 Database features will be disabled")
        print("🤖 AI features (Gemini) will still work")
        print("🌐 Server will run on http://localhost:8000")
        print("⚠️  Press Ctrl+C to stop the server")
        print()
        
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        print("💡 Try running: python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000")
        sys.exit(1)
