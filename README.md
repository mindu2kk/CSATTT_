# 📚 Library Blockchain Kit

Hệ thống quản lý thư viện trên blockchain với đầy đủ tính năng: mượn/trả sách, quản lý tiền cọc, hệ thống uy tín, và nhiều tính năng nâng cao.

## ✨ Tính Năng

### 🔐 Tính Năng Nâng Cao
- ✅ **ReentrancyGuard**: Bảo vệ khỏi reentrancy attacks
- ✅ **AccessControl**: Quản lý quyền (Admin, Librarian, Pauser)
- ✅ **EscrowVault**: Quản lý tiền cọc an toàn, tách biệt
- ✅ **Condition Enum**: Mô tả tình trạng sách chi tiết (New, Good, Fair, Poor)
- ✅ **Pause/Unpause**: Tạm dừng contract khi cần

### 📖 Chức Năng Chính
- ✅ Mint sách mới (Admin)
- ✅ Mượn sách với tiền cọc
- ✅ Trả sách với tính phạt tự động
- ✅ Hệ thống uy tín (reputation)
- ✅ Quản lý tình trạng sách
- ✅ Web interface đầy đủ

---

## 🚀 Quick Start

### Bước 1: Cài Đặt Dependencies

```bash
npm install
```

### Bước 2: Compile Contracts

```bash
npx hardhat compile
```

### Bước 3: Start Hardhat Node

Mở terminal 1:
```bash
npx hardhat node
```

**Giữ terminal này mở!** Node sẽ chạy liên tục.

### Bước 4: Deploy Contracts

Mở terminal 2 (mới):
```bash
npx hardhat run scripts/quick-deploy.ts --network localhost
```

Script sẽ tự động:
- ✅ Deploy BookNFT, EscrowVault, LibraryCore
- ✅ Setup authorization
- ✅ Mint 3 sách mẫu
- ✅ Update `web/contracts.json`

### Bước 5: Start Web Server

Mở terminal 3 (mới):
```bash
cd web
python start-server.py
```

Hoặc:
```bash
cd web
python -m http.server 8080
```

### Bước 6: Mở Web Interface

1. Mở browser: http://localhost:8080
2. Connect MetaMask
3. Switch sang network **31337** (Hardhat Local)
4. Nếu chưa có network, MetaMask sẽ tự động thêm

### Bước 7: Test Với 2 Accounts

#### Import Accounts Vào MetaMask:

**Account 0 (Admin):**
- Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

**Account 1 (User):**
- Private Key: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
- Address: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`

**Cách import:**
1. Mở MetaMask
2. Click icon account → "Import account"
3. Paste private key → Đặt tên "Admin" hoặc "User"

#### Test Flow:

1. **Switch sang Account "Admin"** → Test mint, update, pause
2. **Switch sang Account "User"** → Test borrow, return
3. **Admin withdraw penalty** → Vào Admin tab → Click "Withdraw All Penalty"

---

## 📁 Cấu Trúc Dự Án

```
library-blockchain-kit/
├── contracts/
│   ├── BookNFT.sol          # ERC721 NFT cho sách
│   ├── LibraryCore.sol      # Logic mượn/trả sách
│   └── EscrowVault.sol      # Quản lý tiền cọc
├── scripts/
│   ├── quick-deploy.ts      # Deploy lên localhost
│   ├── deploy-sepolia.ts    # Deploy lên Sepolia testnet
│   └── test-with-two-accounts.ts  # Test script
├── web/
│   ├── index.html           # Web interface
│   ├── app.js               # JavaScript logic
│   ├── style.css            # CSS styling
│   ├── contracts.json       # Contract addresses
│   └── start-server.py      # Python web server
├── hardhat.config.ts        # Hardhat configuration
└── package.json             # Dependencies
```

---

## 🔧 Cấu Hình

### Hardhat Network (Localhost)

- **RPC URL:** http://127.0.0.1:8545
- **Chain ID:** 31337
- **Currency:** ETH

### MetaMask Setup

Khi connect lần đầu, MetaMask sẽ tự động thêm network. Hoặc thêm manual:

- **Network Name:** Hardhat Local
- **RPC URL:** http://127.0.0.1:8545
- **Chain ID:** 31337
- **Currency Symbol:** ETH

---

## 💰 Phí & Phạt

- **Cọc mặc định:** 0.1 ETH
- **Phạt trả muộn:** 0.02 ETH
- **Phạt làm hỏng/mất sách:** 0.05 ETH
- **Thời hạn mượn:** 7 ngày
- **Điểm uy tín:** +1 (trả đúng hạn) / -2 (quá hạn) / -5 (hỏng/mất)

---

## 🧪 Test

### Test Script Tự Động

```bash
npx hardhat run scripts/test-with-two-accounts.ts --network localhost
```

### Test Manual

1. **Admin mint book** → Vào Admin tab → Mint
2. **User borrow book** → Vào Borrow tab → Borrow
3. **User return book** → Vào Return tab → Return
4. **Admin withdraw penalty** → Vào Admin tab → Withdraw All Penalty

---

## 🌐 Deploy Lên Production

### Deploy Lên Sepolia Testnet

1. **Tạo file `.env`:**
```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
SEPOLIA_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
```

2. **Deploy contracts:**
```bash
npx hardhat run scripts/deploy-sepolia.ts --network sepolia
```

3. **Deploy web lên Vercel:**
```bash
npm i -g vercel
cd web
vercel --prod
```

**Xem chi tiết:** `DEPLOY_TO_PRODUCTION.md`

---

## 📚 Tài Liệu

- `DEPLOY_TO_PRODUCTION.md` - Hướng dẫn deploy lên production
- `QUICK_DEPLOY.md` - Hướng dẫn deploy nhanh
- `TESTING_GUIDE.md` - Hướng dẫn test với 2 accounts
- `DEPOSIT_FLOW_DIAGRAM.md` - Giải thích flow tiền cọc

---

## 🆘 Troubleshooting

### Lỗi "nonce has already been used"

**Giải pháp:**
1. Kill Hardhat node: `taskkill /F /IM node.exe`
2. Start lại: `npx hardhat node`
3. Đợi 5-10 giây
4. Deploy lại

### Lỗi "Wrong network"

**Giải pháp:**
- MetaMask phải switch sang network 31337 (Hardhat Local)
- Hoặc network 11155111 (Sepolia) nếu deploy testnet

### Lỗi "ethers not defined"

**Giải pháp:**
- Refresh browser (Ctrl + F5)
- Kiểm tra ethers.js CDN trong `index.html`

### Web không load

**Giải pháp:**
- Kiểm tra Hardhat node đang chạy
- Kiểm tra web server đang chạy
- Kiểm tra `web/contracts.json` có đúng addresses

---

## ✅ Checklist Setup

- [ ] `npm install` đã chạy thành công
- [ ] `npx hardhat compile` thành công
- [ ] Hardhat node đang chạy (port 8545)
- [ ] Contracts đã deploy (`web/contracts.json` có addresses)
- [ ] Web server đang chạy (port 8080)
- [ ] MetaMask connected và đúng network
- [ ] Test với 2 accounts (Admin và User)

---

## 🎯 Tính Năng Web Interface

### Books Tab
- ✅ Xem danh sách tất cả sách
- ✅ Xem chi tiết (status, condition, loan info)
- ✅ Quick Borrow/Return buttons

### Borrow Tab
- ✅ Xem thông tin borrower
- ✅ Chọn sách để mượn
- ✅ Xem deposit và summary

### Return Tab
- ✅ Xem thông tin returner
- ✅ Xem sách đã mượn
- ✅ Chọn sách để trả
- ✅ Xem penalty và impact

### Admin Tab
- ✅ Contract status (Pause/Unpause)
- ✅ EscrowVault info (balance, withdraw)
- ✅ Library statistics
- ✅ Active loans management
- ✅ Mint new book (với Condition)
- ✅ Update book status
- ✅ Update book condition

### Profile Tab
- ✅ Reputation score
- ✅ Current loans
- ✅ Loan history

---

## 🔒 Bảo Mật

- ✅ ReentrancyGuard bảo vệ khỏi reentrancy attacks
- ✅ AccessControl quản lý quyền rõ ràng
- ✅ EscrowVault tách biệt logic quản lý tiền
- ✅ Pause/Unpause để tạm dừng khi cần

---

## 📝 License

UNLICENSED

---

## 👥 Contributors

- Initial development
- Advanced features implementation

---

## 🎉 Sẵn Sàng Sử Dụng!

Sau khi setup xong, bạn có thể:
- ✅ Mint sách mới
- ✅ Mượn/trả sách
- ✅ Quản lý tiền cọc
- ✅ Xem thống kê
- ✅ Pause/Unpause contract
- ✅ Withdraw penalty funds

**Chúc bạn sử dụng vui vẻ!** 🚀
