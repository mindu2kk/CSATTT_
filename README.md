# 📚 Library Blockchain System

Hệ thống thư viện phi tập trung sử dụng blockchain Ethereum để quản lý việc mượn/trả sách thông qua NFT và smart contracts.

## 🎯 Tổng quan dự án

Library Blockchain System là một ứng dụng phi tập trung (DApp) cho phép:
- **Quản lý sách dưới dạng NFT**: Mỗi cuốn sách là một token ERC721 duy nhất
- **Mượn/trả sách tự động**: Smart contracts xử lý logic mượn trả và tiền cọc
- **Hệ thống uy tín**: Theo dõi lịch sử mượn trả của người dùng
- **Đa nền tảng**: Web interface, Java backend, và subgraph indexing

## 🏗️ Kiến trúc hệ thống

```
📦 Library Blockchain System
├── 🔗 Smart Contracts (Solidity)
│   ├── BookNFT.sol - Quản lý sách dưới dạng NFT
│   └── LibraryCore.sol - Logic mượn/trả sách
├── 🌐 Web Frontend (HTML/JS)
│   ├── Giao diện người dùng
│   └── Tích hợp MetaMask
├── ☕ Java Backend (Spring Boot)
│   ├── REST API
│   └── Web3 integration
├── 📊 Subgraph (The Graph)
│   └── Indexing blockchain data
└── 🐍 Python Server
    └── Simple HTTP server
```

## 🚀 Cách chạy dự án

### Bước 1: Chuẩn bị môi trường

**Yêu cầu hệ thống:**
- Node.js (v18+) - BẮT BUỘC
- Java 17+ - Tùy chọn (cho Java backend)
- Python 3.8+ - Tùy chọn (cho Python API server)
- MetaMask Extension - Khuyến nghị
- Git

**Cài đặt dependencies:**

```bash
# 1. Cài đặt Node.js dependencies (BẮT BUỘC)
npm install

# 2. Cài đặt Python dependencies (TÙY CHỌN - cho Python API)
cd python-blockchain-server
pip install -r requirements.txt
cd ..

# 3. Cài đặt Java dependencies (TÙY CHỌN - cho Java backend)
cd csattt
mvnw.cmd clean install    # Windows
# hoặc ./mvnw clean install  # Linux/Mac
cd ..
```

**Kiểm tra cấu hình:**
```bash
node verify-config.js
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
...
```

### Bước 3: Deploy Smart Contracts

```bash
# Terminal 2: Deploy contracts
npx hardhat run scripts/deploy.ts --network localhost

# Hoặc deploy phiên bản minimal (nhanh hơn)
npx hardhat run scripts/deploy-minimal.ts --network localhost
```

**✅ THÀNH CÔNG khi thấy:**
```
🎉 Deployment Complete!
📋 Contract Addresses:
   BookNFT:      0x5FbDB2315678afecb367f032d93F642f64180aa3
   LibraryCore:  0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

Sau khi deploy thành công, contract addresses sẽ được lưu vào `web/contracts.json`.

### Bước 4: Khởi động các services

**Option A: Web Frontend (Đơn giản nhất) ⭐ Khuyến nghị cho người mới**
```bash
# Terminal 3: Khởi động web server
cd web
python start-server.py
# Hoặc: python -m http.server 8080

# 🌐 Mở browser: http://localhost:8080
```

**Option B: Python API Server (REST API cho blockchain)**
```bash
# Terminal 3: Khởi động Python API
cd python-blockchain-server
python blockchain_server.py
# Hoặc trên Windows: START_SERVER.bat

# 🌐 API: http://localhost:8001
# 📚 API Docs: http://localhost:8001/docs
```

**Option C: Java Backend (Đầy đủ tính năng + Database)**
```bash
# Terminal 3: Khởi động Java Spring Boot backend
cd csattt
mvnw.cmd spring-boot:run    # Windows
# hoặc ./mvnw spring-boot:run  # Linux/Mac

# 🌐 Backend: http://localhost:8081
# 📝 API: http://localhost:8081/api/blockchain/
```

**Option D: Subgraph (Tùy chọn - Cho analytics nâng cao)**
```bash
# Terminal 4: Deploy subgraph (tùy chọn)
cd subgraph
npm install
npm run codegen
npm run build
npm run deploy-local
```

💡 **Gợi ý:** Bạn có thể chạy nhiều services cùng lúc trong các terminal khác nhau để có trải nghiệm đầy đủ nhất!

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

1. **Mở web interface**: http://localhost:8080
2. **Connect MetaMask** 
3. **Borrow sách**: Chọn sách và trả tiền cọc (0.1 ETH)
4. **Return sách**: Trả sách và nhận lại tiền cọc
5. **Xem reputation**: Theo dõi điểm uy tín của bạn

## 🛠️ Scripts hữu ích

### NPM Scripts (package.json)
```bash
# Compile contracts
npm run compile

# Deploy contracts (full version)
npm run deploy

# Deploy minimal version (faster)
npm run deploy-minimal

# Run tests
npm run test

# Start Hardhat node
npm run node

# Interact with contracts
npm run interact

# Verify deployment
npm run verify

# Test system
npm run test-system
```

### Utility Scripts
```bash
# Verify cấu hình toàn bộ dự án
node verify-config.js

# Test specific scripts
npx hardhat run scripts/test-system.ts --network localhost
npx hardhat run scripts/verify-deployment.ts --network localhost
npx hardhat run scripts/interact.ts --network localhost
```

### Backend Scripts
```bash
# Java backend
cd csattt && mvnw.cmd spring-boot:run

# Python API server
cd python-blockchain-server && python blockchain_server.py

# Web server
cd web && python start-server.py
```

## 📁 Cấu trúc thư mục

```
📦 library-blockchain-kit/
├── 📄 README.md                 # Tài liệu dự án
├── 📄 package.json             # Node.js dependencies & scripts
├── 📄 hardhat.config.ts        # Hardhat configuration
├── 📄 tsconfig.json            # TypeScript configuration
├── 📄 verify-config.js         # Script kiểm tra cấu hình
│
├── 📂 contracts/               # ⭐ Smart Contracts (Solidity)
│   ├── BookNFT.sol            # NFT contract cho sách
│   ├── LibraryCore.sol        # Logic mượn/trả sách chính
│   ├── LibraryCoreV2.sol      # Version 2 với cải tiến
│   ├── EscrowVault.sol        # Quản lý tiền cọc
│   ├── UserProfile.sol        # Hồ sơ người dùng
│   ├── BookNFT.minimal.sol    # Phiên bản minimal để test nhanh
│   └── LibraryCore.minimal.sol
│
├── 📂 scripts/                 # ⚙️ Deployment & Testing Scripts
│   ├── deploy.ts              # Deploy contracts chính
│   ├── deploy-minimal.ts      # Deploy phiên bản minimal
│   ├── interact.ts            # Script tương tác với contracts
│   ├── test-system.ts         # Test toàn bộ hệ thống
│   ├── verify-deployment.ts   # Verify deployment thành công
│   └── README.md              # Tài liệu chi tiết scripts
│
├── 📂 web/                     # 🌐 Web Frontend (HTML/CSS/JS)
│   ├── index.html             # Giao diện chính
│   ├── minimal.html           # Giao diện đơn giản
│   ├── test-profile.html      # Test user profiles
│   ├── app.js                 # JavaScript logic chính
│   ├── auth.js                # Authentication
│   ├── profile.js             # User profile management
│   ├── blockchain-profile.js  # Blockchain profile interactions
│   ├── style.css              # Styling
│   ├── start-server.py        # Python HTTP server cho web
│   └── contracts.json         # Contract addresses (auto-generated)
│
├── 📂 python-blockchain-server/ # 🐍 Python FastAPI Backend
│   ├── blockchain_server.py   # Main API server
│   ├── start_server.py        # Startup script
│   ├── requirements.txt       # Python dependencies
│   └── START_SERVER.bat       # Windows batch file
│
├── 📂 csattt/                  # ☕ Java Spring Boot Backend
│   ├── pom.xml                # Maven dependencies
│   ├── mvnw / mvnw.cmd        # Maven wrapper
│   ├── README.md              # Java backend documentation
│   ├── test-blockchain.bat    # Test script
│   ├── create_database.sql    # Database schema
│   └── src/                   # Java source code
│       ├── main/java/...      # Application code
│       └── main/resources/    # Configuration files
│
├── 📂 ignition/                # 🔥 Hardhat Ignition Modules
│   └── modules/
│       └── Library.ts         # Library deployment module
│
├── 📂 subgraph/                # 📊 The Graph Indexing (Optional)
│   ├── schema.graphql         # GraphQL schema
│   ├── subgraph.yaml          # Subgraph manifest
│   └── src/                   # Mapping functions
│
├── 📂 test/                    # 🧪 Hardhat Tests
│   └── Library.ts             # Test suite cho Library system
│
├── 📂 artifacts/               # 📦 Compiled Contracts (auto-generated)
├── 📂 cache/                   # 💾 Hardhat Cache (auto-generated)
├── 📂 typechain-types/         # 🔧 TypeChain Types (auto-generated)
└── 📂 node_modules/            # 📚 Dependencies (auto-generated)
```

### 🗂️ File quan trọng:
- **Smart Contracts**: `contracts/*.sol` - Logic blockchain chính
- **Deployment**: `scripts/deploy.ts` - Deploy contracts
- **Configuration**: `hardhat.config.ts`, `verify-config.js`
- **Frontend**: `web/index.html`, `web/app.js`
- **Backend**: `csattt/src/` (Java), `python-blockchain-server/` (Python)
- **Contract Info**: `web/contracts.json` (generated after deployment)

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
# Web server: 8080  
# Java backend: 8081
# Đảm bảo các port này không bị chiếm dụng
```

### Verify cấu hình:
```bash
node verify-config.js
```

## 🎮 Demo Flow

1. **Khởi động hệ thống** (5 phút)
2. **Connect MetaMask** (1 phút)
3. **Borrow sách đầu tiên** (2 phút)
4. **Return sách** (1 phút)
5. **Xem reputation tăng** (30 giây)

**Total demo time: ~10 phút**

## 🔐 Security Notes

- ⚠️ **Private keys trong config chỉ dùng cho development**
- ⚠️ **Không commit private keys thật vào Git**
- ⚠️ **Sử dụng environment variables cho production**
- ⚠️ **Hardhat accounts có 10,000 ETH fake - không có giá trị thật**

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push và tạo Pull Request

## 🧹 Dự án đã được tối ưu hóa

Các file/folder đã được loại bỏ để giữ dự án gọn gàng:
- ❌ `admin-dashboard/` - Admin dashboard chưa hoàn thiện
- ❌ `lib/forge-std/` - Forge standard library (dự án dùng Hardhat)
- ❌ `foundry.lock` - Foundry lock file (không cần thiết)
- ❌ `ignition/modules/Counter.ts` - Counter example không dùng
- ❌ `test/Counter.ts` - Test file cho Counter
- ❌ `scripts/deploy-with-profiles.ts` - Script deploy trùng lặp
- ❌ `contracts/*.disabled` - Các contract bị vô hiệu hóa

Các file QUAN TRỌNG được giữ lại:
- ✅ Tất cả smart contracts chính (BookNFT, LibraryCore, EscrowVault, UserProfile)
- ✅ Java backend (csattt/) - Không thay đổi
- ✅ Python blockchain server - Đã cải tiến
- ✅ Web frontend với đầy đủ tính năng
- ✅ Deployment và testing scripts
- ✅ Configuration files

## 📞 Support

Nếu gặp vấn đề:
1. **Kiểm tra cấu hình**: `node verify-config.js`
2. **Đọc [Troubleshooting](#-troubleshooting)**
3. **Xem logs** trong console/terminal
4. **Kiểm tra** Hardhat node đang chạy
5. **Verify** contracts đã deploy chưa
6. Tạo issue trên GitHub nếu vẫn gặp vấn đề

## 📄 License

MIT License - Xem file LICENSE để biết thêm chi tiết.

---

**🎉 Chúc bạn khám phá thành công hệ thống Library Blockchain!**