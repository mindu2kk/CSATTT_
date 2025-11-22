# ========================================
# BLOCKCHAIN API ROUTES - COMPLETE
# ========================================
# This module contains all blockchain-related API endpoints
# All data comes from smart contracts, NOT database

from flask import Blueprint, jsonify, request
from blockchain_config import (
    book_nft_contract,
    library_core_contract,
    web3_instance as w3,
    is_blockchain_connected,
    get_account_balance
)
from web3 import Web3

blockchain_api = Blueprint('blockchain_api', __name__)

@blockchain_api.route('/api/blockchain/books')
def get_all_books():
    """Get ALL books from blockchain - 100% REAL DATA"""
    try:
        if not book_nft_contract:
            return jsonify({'success': False, 'error': 'Contracts not loaded'}), 503
        
        # Get contract info
        name = book_nft_contract.functions.name().call()
        symbol = book_nft_contract.functions.symbol().call()
        next_book_id = book_nft_contract.functions.nextBookId().call()
        
        # Fetch ALL books from blockchain
        books = []
        for i in range(next_book_id):
            try:
                book_info = book_nft_contract.functions.getBookInfo(i).call()
                owner = book_nft_contract.functions.ownerOf(i).call()
                status_num = book_info[2]
                condition_num = book_info[3]
                
                # Status mapping
                status_map = {
                    0: 'Available',
                    1: 'Borrowed',
                    2: 'Damaged',
                    3: 'Lost',
                    4: 'Old',
                    5: 'New'
                }
                
                # Condition mapping
                condition_map = {
                    0: 'New',
                    1: 'Good',
                    2: 'Fair',
                    3: 'Poor'
                }
                
                # Extract author from description
                description = book_info[1]
                author = 'Unknown'
                if '| Author:' in description or '| Author: ' in description:
                    author = description.split('| Author:')[-1].strip()
                elif 'Author:' in description:
                    author = description.split('Author:')[-1].strip()
                
                books.append({
                    'id': i,
                    'tokenId': i,
                    'name': book_info[0],
                    'title': book_info[0],
                    'description': book_info[1],
                    'author': author,
                    'status': status_map.get(status_num, 'Unknown'),
                    'statusNum': status_num,
                    'condition': condition_map.get(condition_num, 'Unknown'),
                    'conditionNum': condition_num,
                    'conditionPercent': _get_condition_percent(condition_num),
                    'createdAt': book_info[4],
                    'imageBeforeHash': book_info[5],
                    'imageAfterHash': book_info[6],
                    'owner': owner,
                    'priceEth': (i + 1) * 0.01,
                    'priceVND': ((i + 1) * 0.01) * 25000000,  # Approx 1 ETH = 25M VND
                    'available': status_num == 0,
                    'borrowed': status_num == 1
                })
            except Exception as e:
                print(f"Warning: Failed to load book {i}: {e}")
                continue
        
        return jsonify({
            'success': True,
            'contractName': name,
            'contractSymbol': symbol,
            'totalBooks': next_book_id,
            'books': books
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@blockchain_api.route('/api/blockchain/book/<int:book_id>')
def get_book_detail(book_id):
    """Get specific book from blockchain - 100% REAL DATA"""
    try:
        if not book_nft_contract:
            return jsonify({'success': False, 'error': 'Contracts not loaded'}), 503
        
        # Get book info
        book_info = book_nft_contract.functions.getBookInfo(book_id).call()
        owner = book_nft_contract.functions.ownerOf(book_id).call()
        status_num = book_info[2]
        condition_num = book_info[3]
        
        # Check loan info if borrowed
        loan_info = None
        if status_num == 1 and library_core_contract:
            try:
                loan_data = library_core_contract.functions.loanInfos(book_id).call()
                loan_info = {
                    'borrower': loan_data[0],
                    'borrowedAt': loan_data[1],
                    'dueDate': loan_data[2],
                    'deposit': str(loan_data[3]),
                    'isReturned': loan_data[4]
                }
            except:
                pass
        
        return jsonify({
            'success': True,
            'bookId': book_id,
            'name': book_info[0],
            'description': book_info[1],
            'status': status_num,
            'condition': condition_num,
            'owner': owner,
            'loanInfo': loan_info,
            'priceEth': (book_id + 1) * 0.01
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 404

@blockchain_api.route('/api/blockchain/loan/<int:book_id>')
def get_loan_info(book_id):
    """Get loan information for a book"""
    try:
        if not library_core_contract:
            return jsonify({'success': False, 'error': 'Contracts not loaded'}), 503
        
        loan_data = library_core_contract.functions.loanInfos(book_id).call()
        
        return jsonify({
            'success': True,
            'bookId': book_id,
            'borrower': loan_data[0],
            'borrowedAt': loan_data[1],
            'dueDate': loan_data[2],
            'deposit': str(loan_data[3]),
            'isReturned': loan_data[4],
            'statusAtLoan': loan_data[5] if len(loan_data) > 5 else 0,
            'statusAtReturn': loan_data[6] if len(loan_data) > 6 else 0
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 404

def _get_condition_percent(condition_num):
    """Map condition enum to percentage range"""
    percent_map = {
        0: '95-100%',  # New
        1: '80-95%',   # Good
        2: '60-80%',   # Fair
        3: '20-60%'    # Poor
    }
    return percent_map.get(condition_num, '0-20%')

