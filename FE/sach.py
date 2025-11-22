from flask import Flask, render_template, request, redirect, url_for, session, flash, send_from_directory, jsonify, send_file
from flask_cors import CORS
from datetime import timedelta
from flask_sqlalchemy import SQLAlchemy
from os import path
from pathlib import Path
from blockchain_config import (
    web3_instance as w3, 
    book_nft_contract, 
    library_core_contract, 
    contract_addresses,
    is_blockchain_connected,
    get_account_balance
)
from web3 import Web3

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
app.config['SECRET_KEY'] = 'banana' 
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///user.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
MODEL_FOLDER = 'model'

@app.route('/')
def signin():
    return render_template('signin.html')

@app.route('/home')
def home():
    return render_template('user/home.html')

@app.route('/book')
def book():
    """Book detail page - handle query params for book ID"""
    # Get book ID from query params
    book_id = request.args.get('id', type=int, default=0)
    return render_template('user/book.html', book_id=book_id)

@app.route('/account')
@app.route('/account/<active_tab>')
def account(active_tab='profile'):
    print(f"🔍 Account route called with active_tab='{active_tab}'")  # Debug log
    # Handle both /account/profile and /account?active_tab=profile
    if active_tab not in ['profile', 'order']:
        # Check query params
        active_tab = request.args.get('active_tab', 'profile')
        if active_tab not in ['profile', 'order']:
            active_tab = 'profile'
    print(f"✅ Rendering account.html with active_tab='{active_tab}'")  # Debug log
    return render_template('user/account.html', active_tab=active_tab)

@app.route('/cart')
def cart():
    return render_template('user/cart.html')

@app.route('/admin')
def admin_root():
    """Redirect legacy /admin route to dashboard"""
    return redirect(url_for('admin_dashboard'))

@app.route('/admin/dashboard')
def admin_dashboard():
    return render_template('admin/dashboard.html', active_page='dashboard')

@app.route('/admin/category')
def admin_category():
    return render_template('admin/category.html', active_page='category')

@app.route('/admin/invoice')
def admin_invoice():
    return render_template('admin/invoice.html', active_page='invoice')

@app.route('/admin/manage')
def admin_manage():
    return render_template('admin/manage.html', active_page='manage')

@app.route('/admin/staff')
def admin_staff():
    return render_template('admin/adminnstaff.html', active_page='staff')

# Backwards compatibility routes
@app.route('/category')
def legacy_category():
    return redirect(url_for('admin_category'))

@app.route('/invoice')
def legacy_invoice():
    return redirect(url_for('admin_invoice'))

@app.route('/admin_staff')
def legacy_admin_staff():
    return redirect(url_for('admin_staff'))

@app.route('/model_images/<filename>')
def get_model_image(filename):
    return send_from_directory(MODEL_FOLDER, filename)

# ========== BLOCKCHAIN UI ROUTES ==========

@app.route('/blockchain')
def blockchain_ui():
    """Blockchain UI - Client-side blockchain interaction with MetaMask"""
    return render_template('blockchain.html')

@app.route('/contracts.json')
def get_contracts_json():
    """Serve contract addresses for client-side blockchain interaction"""
    try:
        contracts_path = Path(__file__).parent.parent / "web" / "contracts.json"
        if contracts_path.exists():
            return send_file(contracts_path, mimetype='application/json')
        else:
            return jsonify({
                'error': 'Contracts not deployed',
                'message': 'Please deploy contracts first: npm run deploy'
            }), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== BLOCKCHAIN API ENDPOINTS ==========

@app.route('/api/blockchain/status')
def blockchain_status():
    """Get blockchain connection status"""
    try:
        if not is_blockchain_connected():
            return jsonify({
                'success': False,
                'connected': False,
                'error': 'Not connected to blockchain'
            }), 503
        
        return jsonify({
            'success': True,
            'connected': True,
            'chainId': w3.eth.chain_id,
            'blockNumber': w3.eth.block_number,
            'contracts': contract_addresses
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/blockchain/books')
def get_blockchain_books():
    """Get all books from blockchain - REAL DATA"""
    try:
        if not book_nft_contract:
            return jsonify({'success': False, 'error': 'Contracts not loaded'}), 503
        
        # Get contract info
        name = book_nft_contract.functions.name().call()
        symbol = book_nft_contract.functions.symbol().call()
        next_book_id = book_nft_contract.functions.nextBookId().call()
        
        # Fetch REAL books from blockchain
        books = []
        for i in range(next_book_id):
            try:
                book_info = book_nft_contract.functions.getBookInfo(i).call()
                status_num = book_info[2]  # BookStatus enum
                condition_num = book_info[3]  # Condition enum
                
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
                
                books.append({
                    'id': i,
                    'name': book_info[0],  # name
                    'title': book_info[0],
                    'description': book_info[1],
                    'author': author,
                    'status': status_map.get(status_num, 'Unknown'),
                    'statusNum': status_num,
                    'condition': condition_map.get(condition_num, 'Unknown'),
                    'conditionNum': condition_num,
                    'createdAt': book_info[4],
                    'imageBeforeHash': book_info[5],
                    'imageAfterHash': book_info[6],
                    'priceEth': (i + 1) * 0.01,  # Example pricing
                    'image': '/model_images/muado.jpg'  # Default image
                })
            except Exception as e:
                # Skip books that don't exist or error
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

@app.route('/api/blockchain/book/<int:book_id>')
def get_book_info(book_id):
    """Get specific book information from blockchain - REAL DATA"""
    try:
        if not book_nft_contract:
            return jsonify({'success': False, 'error': 'Contracts not loaded'}), 503
        
        # Get REAL book details from blockchain
        book_info = book_nft_contract.functions.getBookInfo(book_id).call()
        owner = book_nft_contract.functions.ownerOf(book_id).call()
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
        
        # Check if borrowed
        is_borrowed = status_num == 1
        
        return jsonify({
            'success': True,
            'bookId': book_id,
            'name': book_info[0],
            'title': book_info[0],
            'description': book_info[1],
            'author': author,
            'status': status_map.get(status_num, 'Unknown'),
            'statusNum': status_num,
            'condition': condition_map.get(condition_num, 'Unknown'),
            'conditionNum': condition_num,
            'createdAt': book_info[4],
            'imageBeforeHash': book_info[5],
            'imageAfterHash': book_info[6],
            'owner': owner,
            'available': status_num == 0,
            'borrowed': is_borrowed,
            'priceEth': (book_id + 1) * 0.01
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Book not found or error: {str(e)}',
            'bookId': book_id
        }), 404

@app.route('/api/blockchain/account/<address>')
def get_account_info(address):
    """Get account balance and info"""
    try:
        if not w3 or not is_blockchain_connected():
            return jsonify({'success': False, 'error': 'Blockchain not connected'}), 503
        
        balance = get_account_balance(address)
        
        return jsonify({
            'success': True,
            'address': address,
            'balance': balance,
            'balanceWei': w3.eth.get_balance(Web3.to_checksum_address(address))
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/contracts')
def get_contract_addresses():
    """Get deployed contract addresses"""
    if not contract_addresses:
        return jsonify({'success': False, 'error': 'Contracts not loaded'}), 503
    
    return jsonify({
        'success': True,
        'contracts': contract_addresses,
        'chainId': 31337,
        'network': 'localhost'
    })
    
if __name__ == "__main__":
    # Create database if not exists
    with app.app_context():
        db_path = path.join('instance', 'user.db')
        if not path.exists(db_path):
            db.create_all()
            print("[OK] Database created")
    
    # Check blockchain connection
    if is_blockchain_connected():
        print("[OK] Blockchain connected successfully")
        print(f"   Chain ID: {w3.eth.chain_id}")
        print(f"   Block: {w3.eth.block_number}")
    else:
        print("[WARN] Blockchain not connected - Some features may not work")
        print("   Make sure Hardhat node is running: npx hardhat node")
    
    # Start Flask app
    port = 5000
    print(f"\n[START] Flask Frontend Server")
    print(f"Server URL: http://localhost:{port}")
    print(f"User Interface: http://localhost:{port}/home")
    print(f"Admin Interface: http://localhost:{port}/admin")
    print(f"\nPress Ctrl+C to stop\n")
    
    app.run(
        host='0.0.0.0', 
        port=port,
        debug=True
    )

