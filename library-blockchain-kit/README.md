# Library Blockchain Kit (Polygon-ready)

Quản lý thư viện áp dụng blockchain: mượn/trả, tiền đặt cọc (escrow), phạt trả muộn/hư hại, điểm uy tín giảm tiền cọc, và QR có chữ ký số chống giả mạo.

## Hợp đồng thông minh (Solidity 0.8.24)
- `BookNFT.sol` — ERC721 đại diện từng bản sách vật lý, có `Condition` (NEW/GOOD/FAIR/POOR).
- `LibraryCore.sol` — Điều phối mượn/trả, tính phí trễ/hư hại, giữ **điểm uy tín** 0..100 và chiết khấu cọc theo tier.
- `EscrowVault.sol` — Khoá/hoàn **tiền đặt cọc** bằng ERC20 (USDC/BKC). Core gọi vào vault.
- `ERC20Mock.sol` — Token giả lập cho local dev.
- `SigQRVerifier.sol` — (tuỳ chọn) Xác minh chữ ký ECDSA cho QR + lưu `nonce` on-chain để chống replay.

> Lưu ý: Để rẻ gas, bạn nên verify chữ ký + TTL/nonce ở **server**, chỉ ghi sự kiện lên chain.

## Chức năng mapping
- Mượn: `borrow(bookId, days)` → khoá cọc vào `EscrowVault`, phát `Borrowed`.
- Trả: `returnBook(bookId, damaged, damagePercent, notesHash)` → tính phí trễ + hư hại, burn LoanPass (nếu dùng), hoàn cọc, cập nhật `reputation` (+/-).
- Uy tín: `reputation[user]` 0..100 → **giảm tiền cọc** 0/10/20/30% theo tier.
- Phạt: `dailyLateFee`, `damagePercent` trên chính khoản cọc.
- Sự kiện: `Borrowed`, `Returned`, `ReputationChanged` — app off-chain lắng nghe để đồng bộ DB.

## Cài đặt & chạy nhanh
```bash
npm i
cp .env.example .env   # điền PRIVATE_KEY, AMOY_URL nếu muốn testnet Polygon Amoy
npx hardhat node       # (tab 1) local chain
npx hardhat run scripts/deploy.js --network localhost  # (tab 2)
```

Kết quả hiển thị địa chỉ các contract và Mint sẵn BookNFT #1.

## Dòng tiền đặt cọc
1. User `approve` ERC20 cho Core (hoặc trực tiếp cho Vault nếu dùng Permit sau này).
2. Gọi `borrow(bookId, days)` → Vault `lock()` số tiền cọc.
3. Khi trả: `returnBook` tính `fee` = `lateFee + damageFee`, Vault `release()` phần hoàn lại.

## QR có chữ ký số (chống giả mạo)
- Tạo QR: `npm run sign:qr` → file `qr.png` chứa base64 JSON `{bookId, uid, ts, nonce, sig}`.
- App quét → gửi payload lên server để:
  - kiểm `ts` trong TTL (vd 5 phút),
  - verify chữ ký ECDSA với **public address** của thư viện,
  - kiểm tra `nonce` chưa dùng (DB) → mark used,
  - nếu hợp lệ gọi `borrow/return` và lưu log (ảnh/biên bản → IPFS, hash -> `notesHash`).

> Nếu muốn verify on-chain: dùng `SigQRVerifier.verifyAndConsume(payloadHash, nonce, sig)` (tốn gas vì lưu nonce).

## Tích hợp NFC bảo mật (không bắt buộc)
- Dán NFC (NTAG 424 DNA) ẩn trong gáy. Khi quét, server verify MAC động từ chip → `nfcUidHash` phải khớp với `bookId` (binding on-chain/off-chain).

## Thiết kế dữ liệu off-chain (gợi ý)
- Bảng `books` (id, tokenId, title, author, condition, nfc_uid_hash, qr_id).
- Bảng `loans` (id, user_addr, book_id, borrow_at, due_at, return_at, fees, deposit, status, notes_ipfs).
- Bảng `reputation` (user_addr, score, updated_at).
- Bảng `qr_nonces` (nonce, used_at).

## Checklist bảo mật
- Quyền hạn `DEFAULT_ADMIN_ROLE`, `LIBRARIAN`, `PAUSER` trong `LibraryCore`.
- Dùng KMS/HSM cho private key ký QR.
- Giới hạn `dailyLateFee`, `damagePercent` trong biên hợp lý (tránh overflow – ở đây dùng `uint256`, safe math 0.8+).
- Fuzz test `borrow/return` với biên thời gian, ngày trễ, phần trăm hư hại.

## Script minh hoạ
- `scripts/deploy.js` — deploy hợp đồng + mint 1 NFT mẫu.
- `scripts/sign_qr.js` — ký payload QR và xuất `qr.png`.
```

