# 📚 Library Blockchain System

Hệ thống thư viện phi tập trung sử dụng blockchain Ethereum để quản lý việc mượn/trả sách thông qua NFT và smart contracts.

## 🎯 Tổng quan dự án

Library Blockchain System là một ứng dụng phi tập trung (DApp) cho phép:
- **Quản lý sách dưới dạng NFT**: Mỗi cuốn sách là một token ERC721 duy nhất
- **Mượn/trả sách tự động**: Smart contracts xử lý logic mượn trả và tiền cọc
- **Hệ thống phê duyệt**: Admin phê duyệt yêu cầu trả sách với đánh giá tình trạng
- **Quản lý tiền cọc**: EscrowVault tự động xử lý tiền cọc và phạt
- **Hệ thống vai trò**: RoleManager quản lý quyền Admin/User
- **Giỏ hàng**: UserCart cho phép mượn nhiều sách cùng lúc
- **Hồ sơ người dùng**: UserProfileV2 theo dõi lịch sử và uy tín

## 🏗️ Kiến trúc hệ thống

```
📦 Library Blockchain System
├── 🔗 Smart Contracts (Solidity)
│   ├── BookNFT.sol - Quản lý sách dưới dạng NFT
│   ├── LibraryCoreV3.sol - Logic mượn/trả sách (phiên bản mới nhất)
│   ├── EscrowVault.sol - Quản lý tiền cọc và phạt
│   ├── RoleManager.sol - Quản lý vai trò Admin/User
│   ├── UserCart.sol - Giỏ hàng mượn sách
│   └── UserProfileV2.sol - Hồ sơ người dùng
├── 🌐 Flask Frontend (Python/Flask)
│   ├── Giao diện người dùng & Admin
│   ├── Blockchain integration
│   ├── Return approval workflow
│   └── REST API endpoints
├── 🌐 Web Frontend (HTML/JS)
│   ├── Giao diện người dùng
│   └── Tích hợp MetaMask
├── ☕ Java Backend (Spring Boot)
│   ├── REST API
│   └── Web3 integration
├── 📊 Subgraph (The Graph)
│   └── Indexing blockchain data
└── 🐍 Python API Server
    └── FastAPI REST server
```

## 🚀 Cách chạy dự án

### Bước 1: Chuẩn bị môi trường

**Yêu cầu hệ thống:**
- Node.js (v18+) - BẮT BUỘC
- Python 3.8+ - BẮT BUỘC (cho Flask Frontend)
- Java 17+ - Tùy chọn (cho Java backend)
- MetaMask Extension - Khuyến nghị
- Git

**Cài đặt dependencies:**

```bash
# 1. Cài đặt Node.js dependencies (BẮT BUỘC)
npm install

# 2. Cài đặt Flask Frontend dependencies (BẮT BUỘC)
cd FE
pip install -r requirements.txt
cd ..

# 3. Cài đặt Python API dependencies (TÙY CHỌN)
cd python-blockchain-server
pip install -r requirements.txt
cd ..

# 4. Cài đặt Java dependencies (TÙY CHỌN)
cd csattt
mvnw.cmd clean install    # Windows
cd ..
```

### Bước 2: Khởi động Blockchain Local

```bash
# Terminal 1: Khởi động Hardhat node
npx hardhat node
```

Hardhat sẽ tạo một blockchain local với:
- Chain ID: 31337
- RPC URL: http://127.0.0.1:8545
- 20 tài khoản test với 10,000 ETH mỗi tài khoản

**✅ THÀNH CÔNG khi thấy:**
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
```

### Bước 3: Deploy Smart Contracts

```bash
# Terminal 2: Deploy contracts
npx hardhat run scripts/deploy.ts --network localhost
```

**✅ THÀNH CÔNG khi thấy:**
```
🎉 Deployment Complete!
📋 Contract Addresses:
   BookNFT:         0x5FbDB2315678afecb367f032d93F642f64180aa3
   LibraryCoreV3:   0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
   EscrowVault:     0x...
   RoleManager:     0x...
   UserCart:        0x...
   UserProfileV2:   0x...
```

Contract addresses sẽ được lưu vào `FE/static/js/shared/contracts.json`.

### Bước 4: Khởi động Frontend

**Flask Frontend (Khuyến nghị):**
```bash
# Terminal 3: Khởi động Flask Frontend
cd FE
python sach.py

# 🌐 Mở browser:
#    - User Interface: http://localhost:5000/home
#    - Admin Interface: http://localhost:5000/admin
#    - API Status: http://localhost:5000/api/blockchain/status
```

**Web Frontend (HTML/JS):**
```bash
# Terminal 3: Khởi động web server
cd web
python -m http.server 8080

# 🌐 Mở browser: http://localhost:8080
```

### Bước 5: Kết nối MetaMask

1. **Cài đặt MetaMask** extension
2. **Thêm Hardhat Local Network:**
   - Network Name: Hardhat Local
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 31337
   - Currency Symbol: ETH
3. **Import tài khoản test:**
   - Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
   - (Tài khoản đầu tiên từ Hardhat với 10,000 ETH)

### Bước 6: Sử dụng ứng dụng

**User Flow:**
1. Connect MetaMask
2. Chọn sách và thêm vào giỏ hàng
3. Mượn sách (trả tiền cọc 0.01 ETH/sách)
4. Yêu cầu trả sách và chọn tình trạng sách
5. Chờ Admin phê duyệt
6. Nhận lại tiền cọc (hoặc bị phạt nếu sách hư hỏng)

**Admin Flow:**
1. Xem danh sách yêu cầu trả sách
2. Đánh giá tình trạng sách
3. Phê duyệt hoặc từ chối
4. Hệ thống tự động xử lý tiền cọc

## 🛠️ Scripts hữu ích

### NPM Scripts
```bash
# Compile contracts
npm run compile

# Deploy contracts
npm run deploy

# Run Hardhat node
npm run node

# Interact with contracts
npm run interact
```

### Backend Scripts
```bash
# Flask Frontend
cd FE && python sach.py

# Java backend
cd csattt && mvnw.cmd spring-boot:run

# Python API server
cd python-blockchain-server && python blockchain_server.py

# Web server
cd web && python -m http.server 8080
```

## 📁 Cấu trúc thư mục

```
📦 library-blockchain-kit/
├── 📄 README.md                 # Tài liệu dự án
├── 📄 package.json             # Node.js dependencies & scripts
├── 📄 hardhat.config.ts        # Hardhat configuration
├── 📄 .gitignore               # Git ignore rules
│
├── 📂 contracts/               # ⭐ Smart Contracts (Solidity)
│   ├── BookNFT.sol            # NFT contract cho sách
│   ├── LibraryCoreV3.sol      # Logic mượn/trả sách (v3)
│   ├── EscrowVault.sol        # Quản lý tiền cọc
│   ├── RoleManager.sol        # Quản lý vai trò
│   ├── UserCart.sol           # Giỏ hàng
│   └── UserProfileV2.sol      # Hồ sơ người dùng (v2)
│
├── 📂 scripts/                 # ⚙️ Deployment & Testing Scripts
│   ├── deploy.ts              # Deploy contracts chính
│   ├── deploy-minimal.ts      # Deploy phiên bản minimal
│   ├── interact.ts            # Script tương tác
│   ├── test-system.ts         # Test hệ thống
│   └── verify-deployment.ts   # Verify deployment
│
├── 📂 FE/                      # 🌐 Flask Frontend (Python)
│   ├── sach.py                # Main Flask application
│   ├── requirements.txt       # Python dependencies
│   ├── templates/             # HTML templates
│   │   ├── user/             # User pages
│   │   └── admin/            # Admin pages
│   └── static/               # Static assets
│       ├── js/               # JavaScript files
│       │   ├── shared/       # Shared utilities
│       │   │   ├── blockchain-constants.js
│       │   │   └── contracts.json
│       │   ├── admin/        # Admin scripts
│       │   │   ├── return-approval.js
│       │   │   └── invoice-blockchain.js
│       │   ├── cart-blockchain-v3.js
│       │   ├── account-blockchain.js
│       │   ├── blockchain-books.js
│       │   └── return-notification.js
│       ├── css/              # Stylesheets
│       └── user/             # User-specific assets
│
├── 📂 web/                     # 🌐 Web Frontend (HTML/JS)
│   ├── index.html             # Giao diện chính
│   ├── app.js                 # JavaScript logic
│   ├── auth.js                # Authentication
│   ├── profile.js             # User profile
│   ├── blockchain-profile.js  # Blockchain interactions
│   ├── style.css              # Styling
│   └── contracts.json         # Contract addresses
│
├── � vpython-blockchain-server/ # 🐍 Python FastAPI Backend
│   ├── blockchain_server.py   # Main API server
│   ├── start_server.py        # Startup script
│   └── requirements.txt       # Python dependencies
│
├── 📂 csattt/                  # ☕ Java Spring Boot Backend
│   ├── pom.xml                # Maven dependencies
│   ├── mvnw / mvnw.cmd        # Maven wrapper
│   └── src/                   # Java source code
│       ├── main/java/...      # Application code
│       └── main/resources/    # Configuration files
│
├── 📂 ignition/                # 🔥 Hardhat Ignition Modules
│   └── modules/
│       └── Library.ts         # Library deployment module
│
├── 📂 subgraph/                # 📊 The Graph Indexing
│   ├── schema.graphql         # GraphQL schema
│   ├── subgraph.yaml          # Subgraph manifest
│   └── src/                   # Mapping functions
│
├── 📂 artifacts/               # 📦 Compiled Contracts (auto-generated)
├── 📂 cache/                   # 💾 Hardhat Cache (auto-generated)
└── 📂 typechain-types/         # 🔧 TypeChain Types (auto-generated)
```

## ✨ Tính năng chính

### Smart Contracts V3
- ✅ **LibraryCoreV3**: Logic mượn/trả sách với return approval workflow
- ✅ **EscrowVault**: Quản lý tiền cọc tự động, xử lý phạt theo tình trạng sách
- ✅ **RoleManager**: Phân quyền Admin/User
- ✅ **UserCart**: Mượn nhiều sách cùng lúc
- ✅ **UserProfileV2**: Theo dõi lịch sử và reputation

### Frontend Features
- ✅ **User Interface**: Duyệt sách, giỏ hàng, mượn/trả sách
- ✅ **Admin Dashboard**: Phê duyệt yêu cầu trả sách, quản lý hệ thống
- ✅ **Return Workflow**: Người dùng đánh giá tình trạng → Admin phê duyệt
- ✅ **Deposit Management**: Hiển thị tiền cọc 0.01 ETH chuẩn hóa
- ✅ **Status Tracking**: Theo dõi trạng thái sách real-time

### Book Conditions
- **NEW (5)**: Như mới - Hoàn tiền 100%
- **GOOD (0)**: Tốt - Hoàn tiền 100%
- **FAIR (2)**: Khá - Phạt 20%
- **POOR (3)**: Kém - Phạt 50%
- **DAMAGED (4)**: Hư hỏng - Phạt 80%

## 🔧 Troubleshooting

### Lỗi thường gặp:

**1. "Invalid block tag" error:**
```bash
# Xóa cache MetaMask và thêm lại network
# Hoặc restart Hardhat node
```

**2. "Nonce too high" error:**
```bash
# Reset MetaMask account:
# Settings > Advanced > Reset Account
```

**3. Contract not deployed:**
```bash
# Kiểm tra Hardhat node đang chạy
# Deploy lại contracts
npx hardhat run scripts/deploy.ts --network localhost
```

**4. Port conflicts:**
```bash
# Hardhat: 8545
# Flask: 5000
# Web server: 8080  
# Java backend: 8081
# Đảm bảo các port này không bị chiếm dụng
```

## 🔐 Security Notes

- ⚠️ **Private keys trong config chỉ dùng cho development**
- ⚠️ **Không commit private keys thật vào Git**
- ⚠️ **Sử dụng environment variables cho production**
- ⚠️ **Hardhat accounts có 10,000 ETH fake - không có giá trị thật**

## 🎮 Demo Flow

1. **Khởi động hệ thống** (5 phút)
   - Start Hardhat node
   - Deploy contracts
   - Start Flask frontend

2. **Connect MetaMask** (1 phút)
   - Add Hardhat network
   - Import test account

3. **User: Mượn sách** (2 phút)
   - Browse books
   - Add to cart
   - Borrow with deposit

4. **User: Yêu cầu trả sách** (1 phút)
   - Request return
   - Select book condition

5. **Admin: Phê duyệt** (1 phút)
   - Review request
   - Approve/Reject
   - System processes deposit

**Total demo time: ~10 phút**

## 📞 Support

Nếu gặp vấn đề:
1. **Kiểm tra** Hardhat node đang chạy
2. **Verify** contracts đã deploy chưa
3. **Xem logs** trong console/terminal
4. **Đọc** [Troubleshooting](#-troubleshooting)
5. Tạo issue trên GitHub

## 📄 License

MIT License

---

**🎉 Chúc bạn khám phá thành công hệ thống Library Blockchain!**
