import { network } from "hardhat";

/**
 * Script để tương tác với contracts đã deploy
 * 
 * Địa chỉ contracts từ deployment:
 * - BookNFT: 0x5FbDB2315678afecb367f032d93F642f64180aa3
 * - LibraryCore: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
 */

async function main() {
  console.log("📚 Tương tác với Library Blockchain System\n");

  // Sử dụng viem từ network như trong test files
  const { viem } = await network.connect();
  
  console.log("📦 Deploying contracts...");
  const bookNFT = await viem.deployContract("BookNFT");
  const libraryCore = await viem.deployContract("LibraryCore", [bookNFT.address]);

  console.log("✅ Contracts deployed:");
  console.log("   BookNFT:", bookNFT.address);
  console.log("   LibraryCore:", libraryCore.address);
  console.log("");

  // Authorize LibraryCore to update book status
  console.log("🔐 Setting up authorization...");
  await bookNFT.write.setAuthorizedUpdater([libraryCore.address, true]);
  console.log("   ✅ LibraryCore authorized");
  console.log("");

  // Mint 3 sách mẫu để demo
  console.log("📚 Minting sample books...");
  await bookNFT.write.mintBook(["Lập Trình Blockchain", "Cẩm nang từ A-Z về smart contract!", 5]);
  await bookNFT.write.mintBook(["Mastering Ethereum", "Advanced guide to building smart contracts", 5]);
  await bookNFT.write.mintBook(["Solidity Programming", "Learn Solidity from scratch", 4]);
  console.log("   ✅ Minted 3 books");
  console.log("");

  // 1. Đọc thông tin sách
  console.log("📖 Đọc thông tin sách đã mint:");
  for (let i = 0; i < 3; i++) {
    const bookInfo = await bookNFT.read.getBookInfo([i]);
    console.log(`   Book #${i}:`);
    console.log(`     - Tên: ${bookInfo[0]}`);
    console.log(`     - Mô tả: ${bookInfo[1]}`);
    console.log(`     - Trạng thái: ${bookInfo[2]}`);
    console.log(`     - Ngày tạo: ${new Date(Number(bookInfo[3]) * 1000).toLocaleString()}`);
    console.log("");
  }

  // 2. Kiểm tra trạng thái sách
  console.log("📊 Kiểm tra trạng thái sách:");
  const status = await bookNFT.read.getBookStatus([0]);
  console.log(`   Trạng thái Book #0: ${status}`);
  console.log("   (0=Available, 1=Borrowed, 2=Damaged, 3=Lost, 4=Old, 5=New)");
  console.log("");

  // 3. Nếu sách chưa Available, set về Available để mượn được
  const currentStatus = await bookNFT.read.getBookStatus([0]);
  if (Number(currentStatus) !== 0) {
    console.log("🔄 Đang set Book #0 về trạng thái Available...");
    await bookNFT.write.updateBookStatus([0, 0]);
    console.log("   ✅ Đã set về Available");
    console.log("");
  }

  // 4. Kiểm tra thông tin loan (nếu có)
  console.log("📋 Kiểm tra thông tin loan:");
  const loanInfo = await libraryCore.read.loanInfos([0]);
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  if (loanInfo[0] !== zeroAddress) {
    console.log(`   Book #0 đã được mượn bởi: ${loanInfo[0]}`);
    console.log(`   Đã trả: ${loanInfo[3]}`);
  } else {
    console.log("   Book #0 chưa được mượn");
  }
  console.log("");

  // 5. Kiểm tra địa chỉ accounts
  const [account1, account2] = await viem.getWalletClients();
  console.log("👤 Account 1:", account1.account.address);
  console.log("👤 Account 2:", account2.account.address);
  
  console.log("⭐ Kiểm tra điểm uy tín:");
  const reputation = await libraryCore.read.userReputation([account2.account.address]);
  console.log(`   Điểm uy tín của ${account2.account.address}: ${reputation}`);
  console.log("");

  console.log("✅ Hoàn tất!");
  console.log("\n💡 Để mượn sách, bạn có thể:");
  console.log("   1. Mở Hardhat Console: npx hardhat console --network hardhat");
  console.log("   2. Hoặc chạy script: npx hardhat run scripts/borrow-book.ts --network hardhat");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Lỗi:", error);
    process.exit(1);
  });

