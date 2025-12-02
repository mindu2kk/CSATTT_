# 🌐 Flask Frontend - Library Blockchain System

Flask Frontend là giao diện web chính của hệ thống Library Blockchain, tích hợp blockchain để quản lý sách và mượn/trả sách.

## 🎯 Tính Năng

- ✅ **Giao diện người dùng** - Xem sách, mượn/trả sách
- ✅ **Giao diện Admin** - Quản lý sách, users, invoices
- ✅ **Blockchain Integration** - Kết nối với smart contracts
- ✅ **REST API** - Cung cấp API endpoints cho frontend
- ✅ **Database** - SQLite database cho user management

## 🚀 Cách Chạy

### Bước 1: Cài đặt Dependencies

```bash
cd FE
pip install -r requirements.txt
```

### Bước 2: Đảm bảo Blockchain đang chạy

```bash
# Terminal 1: Start Hardhat node
npx hardhat node

# Terminal 2: Deploy contracts (nếu chưa deploy)
npm run deploy
```

### Bước 3: Khởi động Flask Server

```bash
# Windows
START_FE.bat

# Hoặc manual
python sach.py
```

### Bước 4: Truy cập

- **User Interface:** http://localhost:5000/home
- **Admin Interface:** http://localhost:5000/admin
- **Sign In:** http://localhost:5000/
- **API Status:** http://localhost:5000/api/blockchain/status

## 📁 Cấu Trúc

```
FE/
├── sach.py                 # Main Flask application
├── blockchain_config.py    # Blockchain configuration & Web3
├── requirements.txt        # Python dependencies
├── START_FE.bat           # Windows startup script
├── templates/              # HTML templates
│   ├── signin.html        # Login page
│   ├── user/              # User interface
│   │   ├── home.html
│   │   ├── book.html
│   │   ├── account.html
│   │   └── cart.html
│   └── admin/             # Admin interface
│       ├── home.html
│       ├── profile.html
│       ├── category.html
│       └── invoice.html
├── static/                # CSS & static files
│   ├── signin.css
│   ├── user/
│   └── admin/
└── model/                 # Images & assets
```

## 🔌 API Endpoints

### Blockchain Status
```
GET /api/blockchain/status
```
Trả về trạng thái kết nối blockchain.

### Get Books
```
GET /api/blockchain/books
```
Lấy danh sách sách từ blockchain.

### Get Book Info
```
GET /api/blockchain/book/<book_id>
```
Lấy thông tin chi tiết một cuốn sách.

### Get Account Info
```
GET /api/blockchain/account/<address>
```
Lấy thông tin tài khoản (balance, etc).

### Get Contract Addresses
```
GET /api/contracts
```
Lấy địa chỉ các smart contracts đã deploy.

## ⚙️ Configuration

### Blockchain Config (`blockchain_config.py`)

- **RPC URL:** `http://127.0.0.1:8545`
- **Chain ID:** `31337` (Hardhat local)
- **Contracts:** Tự động load từ `web/contracts.json`

### Flask Config (`sach.py`)

- **Port:** `5000`
- **Debug Mode:** `True` (development)
- **Database:** SQLite (`instance/user.db`)

## 🔧 Troubleshooting

### Lỗi "Not connected to blockchain"

**Nguyên nhân:** Hardhat node chưa chạy

**Giải pháp:**
```bash
# Start Hardhat node
npx hardhat node
```

### Lỗi "Contracts not loaded"

**Nguyên nhân:** Contracts chưa được deploy

**Giải pháp:**
```bash
# Deploy contracts
npm run deploy
```

### Lỗi Unicode/Encoding

**Nguyên nhân:** Windows console không support emoji

**Giải pháp:** Đã fix - sử dụng `[OK]`, `[WARN]`, `[ERROR]` thay vì emoji

### Port 5000 đã được sử dụng

**Giải pháp:**
```bash
# Tìm process
netstat -ano | findstr :5000

# Kill process
taskkill /PID <PID> /F
```

## 📝 Dependencies

- **Flask** - Web framework
- **Flask-SQLAlchemy** - Database ORM
- **Flask-CORS** - CORS support
- **Web3.py** - Ethereum blockchain interaction
- **python-dotenv** - Environment variables

## 🔗 Integration với Backend

Flask Frontend có thể kết nối với:

1. **Hardhat Node** - Blockchain local
2. **Java Backend** (Port 8081) - REST API
3. **Python API Server** (Port 8001) - FastAPI

## 🎨 Templates

### User Templates
- `home.html` - Trang chủ user
- `book.html` - Danh sách sách
- `account.html` - Tài khoản user
- `cart.html` - Giỏ hàng

### Admin Templates
- `home.html` - Dashboard admin
- `profile.html` - Profile admin
- `category.html` - Quản lý danh mục
- `invoice.html` - Hóa đơn

## 🚀 Production Deployment

Để deploy production:

1. Set `debug=False` trong `sach.py`
2. Sử dụng production WSGI server (Gunicorn, uWSGI)
3. Configure reverse proxy (Nginx)
4. Set environment variables cho blockchain RPC
5. Use production database (PostgreSQL, MySQL)

## 📞 Support

Nếu gặp vấn đề:
1. Check Hardhat node đang chạy
2. Verify contracts đã deploy
3. Check logs trong terminal
4. Test API endpoints: `http://localhost:5000/api/blockchain/status`

