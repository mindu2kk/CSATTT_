"""
Blockchain Library Server - Python FastAPI Backend
Provides REST API for blockchain interactions

Features:
- Real-time blockchain data
- Book NFT management
- Library core interactions
- Smart contract integration

Requirements: pip install fastapi uvicorn web3
Run: python blockchain_server.py
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from web3 import Web3
import json
import os
import uvicorn
from pathlib import Path
from contextlib import asynccontextmanager

# Initialize Web3 first (needed for lifespan)
w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))
contracts = {}

def load_contracts():
    """Load contracts from deployment files"""
    try:
        # Find contracts.json file
        contracts_path = Path(__file__).parent.parent / "web" / "contracts.json"
        
        if not contracts_path.exists():
            print(f"⚠️ Contracts file not found at: {contracts_path}")
            print("   Please deploy contracts first: npm run deploy")
            return False
            
        with open(contracts_path, "r") as f:
            data = json.load(f)
            
        library_addr = data["libraryCore"]
        nft_addr = data["bookNFT"]
        
        # Load ABIs from artifacts
        artifacts_dir = Path(__file__).parent.parent / "artifacts" / "contracts"
        
        library_abi_path = artifacts_dir / "LibraryCore.sol" / "LibraryCore.json"
        nft_abi_path = artifacts_dir / "BookNFT.sol" / "BookNFT.json"
        
        if not library_abi_path.exists() or not nft_abi_path.exists():
            print(f"⚠️ Contract ABIs not found. Please compile contracts: npm run compile")
            return False
        
        with open(library_abi_path, "r") as f:
            library_abi = json.load(f)["abi"]
            contracts["library"] = w3.eth.contract(
                address=Web3.to_checksum_address(library_addr), 
                abi=library_abi
            )
        
        with open(nft_abi_path, "r") as f:
            nft_abi = json.load(f)["abi"]
            contracts["nft"] = w3.eth.contract(
                address=Web3.to_checksum_address(nft_addr), 
                abi=nft_abi
            )
        
        print(f"✅ Contracts loaded successfully")
        print(f"   LibraryCore: {library_addr}")
        print(f"   BookNFT: {nft_addr}")
        print(f"   Chain ID: {w3.eth.chain_id}")
        return True
        
    except FileNotFoundError as e:
        print(f"❌ File not found: {e}")
        print("   Make sure contracts are deployed and compiled.")
        return False
    except KeyError as e:
        print(f"❌ Missing key in contracts.json: {e}")
        return False
    except Exception as e:
        print(f"❌ Error loading contracts: {e}")
        import traceback
        traceback.print_exc()
        return False

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    # Startup
    print("\n" + "="*60)
    print("🚀 Starting Blockchain Library Server")
    print("="*60)
    
    # Check blockchain connection
    if w3.is_connected():
        print(f"✅ Connected to blockchain")
        print(f"   Chain ID: {w3.eth.chain_id}")
        print(f"   Latest Block: {w3.eth.block_number}")
    else:
        print("⚠️  Not connected to blockchain")
        print("   Make sure Hardhat node is running: npx hardhat node")
    
    # Load contracts
    print("\n📚 Loading smart contracts...")
    success = load_contracts()
    
    if not success:
        print("\n⚠️  Server started but contracts are not loaded")
        print("   Deploy contracts with: npm run deploy")
    
    print("\n" + "="*60)
    print("✅ Server is ready!")
    print("="*60 + "\n")
    
    yield
    
    # Shutdown
    print("\n👋 Shutting down Blockchain Library Server...")

# Initialize FastAPI app with lifespan
app = FastAPI(
    title="Blockchain Library Server",
    description="REST API for Library Blockchain System",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === API ENDPOINTS ===

@app.get("/")
def health():
    """Health check endpoint"""
    is_connected = w3.is_connected()
    contracts_loaded = len(contracts) > 0
    
    return {
        "status": "running" if is_connected and contracts_loaded else "degraded",
        "blockchain_connected": is_connected,
        "contracts_loaded": contracts_loaded,
        "chain_id": w3.eth.chain_id if is_connected else None,
        "latest_block": w3.eth.block_number if is_connected else None,
        "message": "✅ All systems operational" if (is_connected and contracts_loaded) else "⚠️ Some services unavailable"
    }

@app.get("/books")
def get_books():
    """Get all books from blockchain"""
    try:
        if "nft" not in contracts:
            raise HTTPException(
                status_code=503, 
                detail="Contracts not loaded. Please deploy contracts first."
            )
        
        if not w3.is_connected():
            raise HTTPException(
                status_code=503,
                detail="Blockchain connection unavailable"
            )
            
        nft_contract = contracts["nft"]
        
        # Get contract info
        name = nft_contract.functions.name().call()
        symbol = nft_contract.functions.symbol().call()
        
        # Try to get total supply (if method exists)
        try:
            total_supply = nft_contract.functions.totalSupply().call() if hasattr(nft_contract.functions, 'totalSupply') else 0
        except:
            total_supply = 0
        
        # Return sample data for now (can be extended to fetch real books)
        books = [
            {"id": 0, "title": "Blockchain Programming", "author": "Satoshi", "available": True},
            {"id": 1, "title": "Smart Contracts Guide", "author": "Vitalik", "available": True},
            {"id": 2, "title": "DeFi Development", "author": "Andre", "available": False}
        ]
        
        return {
            "success": True,
            "contract_info": {
                "name": name, 
                "symbol": symbol,
                "address": nft_contract.address
            },
            "books": books,
            "total": len(books),
            "total_supply": total_supply
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching books: {str(e)}")

@app.get("/books/{book_id}")
def get_book(book_id: int):
    """Get specific book by ID"""
    try:
        # Sample book data
        books = {
            0: {"id": 0, "title": "Blockchain Programming", "author": "Satoshi", "available": True},
            1: {"id": 1, "title": "Smart Contracts Guide", "author": "Vitalik", "available": True},
            2: {"id": 2, "title": "DeFi Development", "author": "Andre", "available": False}
        }
        
        if book_id in books:
            return books[book_id]
        else:
            raise HTTPException(status_code=404, detail="Book not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/books/add")
def prepare_add_book(title: str, author: str, owner: str):
    """Prepare transaction to add new book"""
    try:
        if "nft" not in contracts:
            raise HTTPException(
                status_code=503, 
                detail="Contracts not loaded. Please deploy contracts first."
            )
        
        if not w3.is_connected():
            raise HTTPException(status_code=503, detail="Blockchain connection unavailable")
            
        if not title or not author:
            raise HTTPException(status_code=400, detail="Title and author are required")
            
        if not Web3.is_address(owner):
            raise HTTPException(status_code=400, detail="Invalid owner address")
            
        nft_contract = contracts["nft"]
        owner_checksum = Web3.to_checksum_address(owner)
        
        # Prepare mint transaction
        txn = nft_contract.functions.mintBook(title, author).build_transaction({
            'from': owner_checksum,
            'gas': 300000,
            'gasPrice': w3.to_wei('20', 'gwei'),
            'nonce': w3.eth.get_transaction_count(owner_checksum)
        })
        
        return {
            "success": True,
            "transaction": txn,
            "message": "Transaction prepared. Sign with your wallet to add book.",
            "estimated_gas": 300000
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error preparing transaction: {str(e)}")

@app.post("/books/{book_id}/borrow")
def prepare_borrow(book_id: int, borrower: str):
    """Prepare borrow transaction"""
    try:
        if "library" not in contracts:
            raise HTTPException(status_code=503, detail="Contracts not loaded")
        
        if not w3.is_connected():
            raise HTTPException(status_code=503, detail="Blockchain connection unavailable")
            
        if not Web3.is_address(borrower):
            raise HTTPException(status_code=400, detail="Invalid borrower address")
        
        contract = contracts["library"]
        borrower_checksum = Web3.to_checksum_address(borrower)
        
        txn = contract.functions.borrowBook(book_id).build_transaction({
            'from': borrower_checksum,
            'gas': 200000,
            'gasPrice': w3.to_wei('20', 'gwei'),
            'nonce': w3.eth.get_transaction_count(borrower_checksum)
        })
        
        return {
            "success": True,
            "transaction": txn, 
            "book_id": book_id,
            "message": "Borrow transaction prepared. Sign with your wallet."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error preparing borrow: {str(e)}")

@app.post("/books/{book_id}/return")
def prepare_return(book_id: int, borrower: str):
    """Prepare return transaction"""
    try:
        if "library" not in contracts:
            raise HTTPException(status_code=503, detail="Contracts not loaded")
        
        if not w3.is_connected():
            raise HTTPException(status_code=503, detail="Blockchain connection unavailable")
            
        if not Web3.is_address(borrower):
            raise HTTPException(status_code=400, detail="Invalid borrower address")
        
        contract = contracts["library"]
        borrower_checksum = Web3.to_checksum_address(borrower)
        
        txn = contract.functions.returnBook(book_id).build_transaction({
            'from': borrower_checksum,
            'gas': 200000,
            'gasPrice': w3.to_wei('20', 'gwei'),
            'nonce': w3.eth.get_transaction_count(borrower_checksum)
        })
        
        return {
            "success": True,
            "transaction": txn, 
            "book_id": book_id,
            "message": "Return transaction prepared. Sign with your wallet."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error preparing return: {str(e)}")

@app.get("/nft/balance/{address}")
def get_nft_balance(address: str):
    """Get NFT balance for an address"""
    try:
        if "nft" not in contracts:
            raise HTTPException(status_code=503, detail="Contracts not loaded")
        
        if not w3.is_connected():
            raise HTTPException(status_code=503, detail="Blockchain connection unavailable")
            
        if not Web3.is_address(address):
            raise HTTPException(status_code=400, detail="Invalid address")
        
        contract = contracts["nft"]
        address_checksum = Web3.to_checksum_address(address)
        balance = contract.functions.balanceOf(address_checksum).call()
        
        return {
            "success": True,
            "address": address_checksum, 
            "balance": balance
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting balance: {str(e)}")

@app.get("/blockchain/status")
def blockchain_status():
    """Get blockchain connection status and info"""
    try:
        is_connected = w3.is_connected()
        
        status = {
            "connected": is_connected,
            "contracts_loaded": len(contracts) > 0,
            "available_contracts": list(contracts.keys())
        }
        
        if is_connected:
            status.update({
                "chain_id": w3.eth.chain_id,
                "latest_block": w3.eth.block_number,
                "gas_price": w3.eth.gas_price,
                "rpc_url": "http://127.0.0.1:8545"
            })
        else:
            status["error"] = "Not connected to blockchain"
            
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting blockchain status: {str(e)}")

if __name__ == "__main__":
    print("\n🌐 Blockchain Library Server")
    print("📍 Server URL: http://localhost:8001")
    print("📚 API Documentation: http://localhost:8001/docs")
    print("📖 Interactive API: http://localhost:8001/redoc")
    print("\n⏹️  Press Ctrl+C to stop the server\n")
    
    try:
        uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
    except KeyboardInterrupt:
        print("\n\n👋 Server stopped gracefully")
    except Exception as e:
        print(f"\n❌ Server error: {e}")
        import traceback
        traceback.print_exc()