#!/usr/bin/env python3
import http.server
import socketserver
import os
import webbrowser
from pathlib import Path

# Change to web directory
web_dir = Path(__file__).parent
os.chdir(web_dir)

PORT = 8080
Handler = http.server.SimpleHTTPRequestHandler

# Enable CORS
class CORSRequestHandler(Handler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
    print(f"🌐 Starting web server at http://localhost:{PORT}")
    print(f"📂 Serving from: {web_dir}")
    print("\n🚀 Opening browser...")
    print("\n📋 Make sure:")
    print("   1. Hardhat node is running (npx hardhat node)")
    print("   2. MetaMask is connected to localhost:8545")
    print("   3. Import these test accounts in MetaMask:")
    print("      Account 1: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80")
    print("      Account 2: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d")
    print("\n⏹️  Press Ctrl+C to stop the server")
    
    # Open browser
    webbrowser.open(f'http://localhost:{PORT}')
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Server stopped!")
