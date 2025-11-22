"""
Blockchain Configuration for Flask Frontend
Loads contract addresses and provides Web3 connection
"""
import json
import os
from pathlib import Path
from web3 import Web3

# Blockchain Configuration
BLOCKCHAIN_RPC_URL = "http://127.0.0.1:8545"
CHAIN_ID = 31337

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(BLOCKCHAIN_RPC_URL))

def load_contracts():
    """Load contract addresses and ABIs from deployment"""
    try:
        # Path to contracts.json from deployment
        contracts_path = Path(__file__).parent.parent / "web" / "contracts.json"
        
        if not contracts_path.exists():
            print("[WARN] Contracts not found. Please deploy first: npm run deploy")
            return None, None, None, None
        
        # Load contract addresses
        with open(contracts_path, 'r') as f:
            contracts_data = json.load(f)
        
        book_nft_address = contracts_data.get('bookNFT')
        library_core_address = contracts_data.get('libraryCore')
        
        # Load ABIs
        artifacts_dir = Path(__file__).parent.parent / "artifacts" / "contracts"
        
        book_nft_abi_path = artifacts_dir / "BookNFT.sol" / "BookNFT.json"
        library_core_abi_path = artifacts_dir / "LibraryCore.sol" / "LibraryCore.json"
        
        with open(book_nft_abi_path, 'r') as f:
            book_nft_abi = json.load(f)['abi']
        
        with open(library_core_abi_path, 'r') as f:
            library_core_abi = json.load(f)['abi']
        
        # Create contract instances
        book_nft_contract = w3.eth.contract(
            address=Web3.to_checksum_address(book_nft_address),
            abi=book_nft_abi
        )
        
        library_core_contract = w3.eth.contract(
            address=Web3.to_checksum_address(library_core_address),
            abi=library_core_abi
        )
        
        print(f"[OK] Blockchain connected: Chain ID {w3.eth.chain_id}")
        print(f"[OK] BookNFT: {book_nft_address}")
        print(f"[OK] LibraryCore: {library_core_address}")
        
        return w3, book_nft_contract, library_core_contract, {
            'bookNFT': book_nft_address,
            'libraryCore': library_core_address
        }
        
    except Exception as e:
        print(f"[ERROR] Error loading contracts: {e}")
        return None, None, None, None

def get_account_balance(address):
    """Get ETH balance of an address"""
    try:
        if not w3.is_connected():
            return None
        balance_wei = w3.eth.get_balance(Web3.to_checksum_address(address))
        balance_eth = w3.from_wei(balance_wei, 'ether')
        return float(balance_eth)
    except Exception as e:
        print(f"Error getting balance: {e}")
        return None

def is_blockchain_connected():
    """Check if connected to blockchain"""
    try:
        return w3.is_connected()
    except:
        return False

# Initialize contracts on import
web3_instance, book_nft_contract, library_core_contract, contract_addresses = load_contracts()

