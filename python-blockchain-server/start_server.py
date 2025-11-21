#!/usr/bin/env python3
"""
Simple startup script for blockchain server
"""
import subprocess
import sys
import os

def main():
    print("🚀 Starting Blockchain Library Server...")
    print("=" * 50)
    
    # Check if contracts exist
    if not os.path.exists("../web/contracts.json"):
        print("⚠️ Contracts not found. Please deploy first:")
        print("   cd .. && npm run deploy")
        return
    
    print("✅ Contracts found")
    print("🌐 Server will start at: http://localhost:8001")
    print("📚 API Documentation: http://localhost:8001/docs")
    print("=" * 50)
    
    # Start the server
    try:
        subprocess.run([sys.executable, "blockchain_server.py"], check=True)
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()