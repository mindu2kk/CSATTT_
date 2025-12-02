"""
Blockchain Library Server - Python FastAPI Backend
Cung cấp 2 API: Lấy danh sách sách đang mượn và lịch sử trả sách

Requirements: pip install fastapi uvicorn web3
Run: python blockchain_server.py
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from web3 import Web3
import json
import uvicorn
from pathlib import Path
from contextlib import asynccontextmanager

# Initialize Web3
w3 = Web3(Web3.HTTPProvider("http://127.0.0.1:8545"))
library_core_contract = None
book_nft_contract = None

def load_contracts():
    """Load contracts from deployment"""
    global library_core_contract, book_nft_contract
    try:
        contracts_path = Path(__file__).parent.parent / "web" / "contracts.json"
        
        if not contracts_path.exists():
            print(f"⚠️ Contracts not found. Deploy first: npm run deploy")
            return False
            
        with open(contracts_path, "r") as f:
            data = json.load(f)
            
        library_addr = data["libraryCore"]
        nft_addr = data["bookNFT"]
        
        # Load ABIs
        artifacts_dir = Path(__file__).parent.parent / "artifacts" / "contracts"
        
        library_abi_path = artifacts_dir / "LibraryCoreV3.sol" / "LibraryCoreV3.json"
        nft_abi_path = artifacts_dir / "BookNFT.sol" / "BookNFT.json"
        
        if not library_abi_path.exists() or not nft_abi_path.exists():
            print(f"⚠️ ABIs not found. Compile first: npm run compile")
            return False
        
        with open(library_abi_path, "r") as f:
            library_abi = json.load(f)["abi"]
            library_core_contract = w3.eth.contract(
                address=Web3.to_checksum_address(library_addr), 
                abi=library_abi
            )
        
        with open(nft_abi_path, "r") as f:
            nft_abi = json.load(f)["abi"]
            book_nft_contract = w3.eth.contract(
                address=Web3.to_checksum_address(nft_addr), 
                abi=nft_abi
            )
        
        print(f"✅ Contracts loaded")
        print(f"   LibraryCore: {library_addr}")
        print(f"   BookNFT: {nft_addr}")
        return True
        
    except Exception as e:
        print(f"❌ Error loading contracts: {e}")
        return False

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown"""
    print("\n" + "="*60)
    print("🚀 Starting Blockchain Library Server")
    print("="*60)
    
    if w3.is_connected():
        print(f"✅ Connected to blockchain (Chain ID: {w3.eth.chain_id})")
    else:
        print("⚠️ Not connected. Start Hardhat: npx hardhat node")
    
    print("\n📚 Loading contracts...")
    load_contracts()
    
    print("\n" + "="*60)
    print("✅ Server ready!")
    print("="*60 + "\n")
    
    yield
    
    print("\n👋 Shutting down...")

# Initialize FastAPI
app = FastAPI(
    title="Blockchain Library API",
    description="API để lấy dữ liệu mượn/trả sách từ blockchain",
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
    """Health check"""
    is_connected = w3.is_connected()
    contracts_loaded = library_core_contract is not None
    
    return {
        "status": "running" if is_connected and contracts_loaded else "degraded",
        "blockchain_connected": is_connected,
        "contracts_loaded": contracts_loaded,
        "chain_id": w3.eth.chain_id if is_connected else None,
        "message": "Server đang chạy"
    }

@app.get("/borrowed-books/{user_address}")
def get_borrowed_books(user_address: str):
    """
    Lấy danh sách sách đang mượn của user
    
    Args:
        user_address: Địa chỉ ví của user
        
    Returns:
        Danh sách sách đang mượn với thông tin chi tiết
    """
    try:
        if not library_core_contract or not book_nft_contract:
            raise HTTPException(
                status_code=503, 
                detail="Contracts chưa load. Deploy contracts trước."
            )
        
        if not w3.is_connected():
            raise HTTPException(
                status_code=503,
                detail="Không kết nối được blockchain"
            )
            
        if not Web3.is_address(user_address):
            raise HTTPException(
                status_code=400, 
                detail="Địa chỉ ví không hợp lệ"
            )
        
        user_checksum = Web3.to_checksum_address(user_address)
        
        # Lấy danh sách sách đang mượn từ smart contract
        current_loans = library_core_contract.functions.getUserCurrentLoans(user_checksum).call()
        
        borrowed_books = []
        for book_id in current_loans:
            # Lấy thông tin loan
            loan_info = library_core_contract.functions.getLoanInfo(book_id).call()
            
            # Lấy thông tin sách
            book_info = book_nft_contract.functions.getBookInfo(book_id).call()
            
            borrowed_books.append({
                "bookId": book_id,
                "bookName": book_info[0],
                "description": book_info[1],
                "borrowedAt": loan_info[1],
                "dueDate": loan_info[2],
                "deposit": w3.from_wei(loan_info[3], 'ether'),
                "statusAtLoan": loan_info[5]
            })
        
        return {
            "success": True,
            "userAddress": user_checksum,
            "totalBorrowed": len(borrowed_books),
            "books": borrowed_books
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Lỗi khi lấy dữ liệu: {str(e)}"
        )

@app.get("/return-history/{user_address}")
def get_return_history(user_address: str):
    """
    Lấy lịch sử trả sách của user
    
    Args:
        user_address: Địa chỉ ví của user
        
    Returns:
        Lịch sử tất cả sách đã trả
    """
    try:
        if not library_core_contract or not book_nft_contract:
            raise HTTPException(
                status_code=503, 
                detail="Contracts chưa load. Deploy contracts trước."
            )
        
        if not w3.is_connected():
            raise HTTPException(
                status_code=503,
                detail="Không kết nối được blockchain"
            )
            
        if not Web3.is_address(user_address):
            raise HTTPException(
                status_code=400, 
                detail="Địa chỉ ví không hợp lệ"
            )
        
        user_checksum = Web3.to_checksum_address(user_address)
        
        # Lấy lịch sử mượn sách (bao gồm cả đã trả)
        loan_history = library_core_contract.functions.getUserLoanHistory(user_checksum).call()
        
        returned_books = []
        for book_id in loan_history:
            # Lấy thông tin loan
            loan_info = library_core_contract.functions.getLoanInfo(book_id).call()
            
            # Chỉ lấy sách đã trả (isReturned = True)
            if loan_info[4]:  # isReturned
                # Lấy thông tin sách
                book_info = book_nft_contract.functions.getBookInfo(book_id).call()
                
                returned_books.append({
                    "bookId": book_id,
                    "bookName": book_info[0],
                    "description": book_info[1],
                    "borrowedAt": loan_info[1],
                    "returnedAt": loan_info[7],
                    "deposit": w3.from_wei(loan_info[3], 'ether'),
                    "statusAtLoan": loan_info[5],
                    "statusAtReturn": loan_info[6],
                    "latePenalty": w3.from_wei(loan_info[8], 'ether'),
                    "damagePenalty": w3.from_wei(loan_info[9], 'ether')
                })
        
        return {
            "success": True,
            "userAddress": user_checksum,
            "totalReturned": len(returned_books),
            "books": returned_books
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Lỗi khi lấy dữ liệu: {str(e)}"
        )

if __name__ == "__main__":
    print("\n🌐 Blockchain Library Server")
    print("📍 Server: http://localhost:8001")
    print("📚 API Docs: http://localhost:8001/docs")
    print("\n⏹️ Press Ctrl+C to stop\n")
    
    try:
        uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
    except KeyboardInterrupt:
        print("\n\n👋 Server stopped")
