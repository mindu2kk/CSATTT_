import hre from "hardhat";

/**
 * Script để mượn một cuốn sách
 * 
 * Sử dụng: npx hardhat run scripts/borrow-book.ts --network hardhat
 */

async function main() {
  const { ethers } = hre;
  
  const BOOK_ID = 0; // ID của cuốn sách muốn mượn
  const DEPOSIT = ethers.parseEther("0.1"); // 0.1 ETH

  const LIBRARY_CORE_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  const [borrower] = await ethers.getSigners();
  console.log("👤 Người mượn:", borrower.address);
  console.log("💰 Số tiền cọc:", ethers.formatEther(DEPOSIT), "ETH");
  console.log("");

  const LibraryCore = await ethers.getContractFactory("LibraryCore");
  const libraryCore = await LibraryCore.attach(LIBRARY_CORE_ADDRESS);

  // Kiểm tra sách có sẵn không
  const BookNFT = await ethers.getContractFactory("BookNFT");
  const BOOK_NFT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const bookNFT = await BookNFT.attach(BOOK_NFT_ADDRESS);
  
  const status = await bookNFT.getBookStatus(BOOK_ID);
  console.log("📖 Trạng thái sách:", status);
  console.log("   (0=Available, 1=Borrowed, 2=Damaged, 3=Lost, 4=Old, 5=New)");
  console.log("");

  if (Number(status) !== 0) {
    console.log("⚠️  Sách không sẵn sàng! Đang set về Available...");
    const [owner] = await ethers.getSigners();
    await bookNFT.updateBookStatus(BOOK_ID, 0);
    console.log("   ✅ Đã set về Available");
    console.log("");
  }

  // Mượn sách
  console.log(`📚 Đang mượn Book #${BOOK_ID}...`);
  
  try {
    const tx = await libraryCore.borrowBook(BOOK_ID, { value: DEPOSIT });
    console.log("   ⏳ Đang chờ transaction...");
    await tx.wait();
    console.log("   ✅ Transaction thành công!");
    console.log("   📝 Transaction hash:", tx.hash);
    console.log("");

    // Đọc thông tin loan
    const loanInfo = await libraryCore.loanInfos(BOOK_ID);
    const dueDate = new Date(Number(loanInfo.dueDate) * 1000);
    console.log("📋 Thông tin loan:");
    console.log(`   Người mượn: ${loanInfo.borrower}`);
    console.log(`   Ngày mượn: ${new Date(Number(loanInfo.borrowedAt) * 1000).toLocaleString()}`);
    console.log(`   Hạn trả: ${dueDate.toLocaleString()}`);
    console.log(`   Tiền cọc: ${ethers.formatEther(loanInfo.deposit)} ETH`);
    console.log("");

    // Kiểm tra trạng thái sách sau khi mượn
    const newStatus = await bookNFT.getBookStatus(BOOK_ID);
    console.log("📊 Trạng thái sách sau khi mượn:", newStatus, "(1=Borrowed)");
    console.log("");

    console.log("✅ Mượn sách thành công!");
  } catch (error: any) {
    console.error("❌ Lỗi khi mượn sách:", error.message);
    if (error.reason) {
      console.error("   Lý do:", error.reason);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Lỗi:", error);
    process.exit(1);
  });

