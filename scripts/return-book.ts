// Script to return a book using hardhat artifacts and ethers
import hre from "hardhat";
import { ethers } from "ethers";

/**
 * Script để trả một cuốn sách
 * 
 * Sử dụng: npx hardhat run scripts/return-book.ts --network hardhat
 * 
 * Tham số:
 * - BOOK_ID: ID của cuốn sách (mặc định: 0)
 * - STATUS: Trạng thái sau khi trả (0=Available, 2=Damaged, 3=Lost) (mặc định: 0)
 */

async function main() {
  // Create in-memory provider for testing
  const provider = new ethers.JsonRpcProvider();
  const privateKey = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"; // Account 1
  const borrower = new ethers.Wallet(privateKey, provider);
  
  const BOOK_ID = process.argv[2] && !isNaN(parseInt(process.argv[2])) ? parseInt(process.argv[2]) : 0;
  const RETURN_STATUS = process.argv[3] && !isNaN(parseInt(process.argv[3])) ? parseInt(process.argv[3]) : 0; // 0=Available, 2=Damaged, 3=Lost

  const LIBRARY_CORE_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  // borrower wallet is already defined above
  console.log("👤 Người trả:", borrower.address);
  console.log("📚 Book ID:", BOOK_ID);
  console.log("📊 Trạng thái trả:", RETURN_STATUS, "(0=Available, 2=Damaged, 3=Lost)");
  console.log("");

  // Load contract using artifacts
  const LibraryCoreArtifact = await hre.artifacts.readArtifact("LibraryCore");
  const libraryCore = new ethers.Contract(LIBRARY_CORE_ADDRESS, LibraryCoreArtifact.abi, borrower);

  // Kiểm tra loan info trước khi trả
  const loanInfo = await libraryCore.loanInfos(BOOK_ID);
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  
  if (loanInfo.borrower === zeroAddress || loanInfo.isReturned) {
    console.log("⚠️  Sách chưa được mượn hoặc đã được trả!");
    return;
  }

  if (loanInfo.borrower.toLowerCase() !== borrower.address.toLowerCase()) {
    console.log("⚠️  Bạn không phải người đã mượn sách này!");
    console.log(`   Người mượn: ${loanInfo.borrower}`);
    return;
  }

  console.log("📋 Thông tin loan trước khi trả:");
  console.log(`   Người mượn: ${loanInfo.borrower}`);
  console.log(`   Ngày mượn: ${new Date(Number(loanInfo.borrowedAt) * 1000).toLocaleString()}`);
  console.log(`   Hạn trả: ${new Date(Number(loanInfo.dueDate) * 1000).toLocaleString()}`);
  console.log(`   Tiền cọc: ${ethers.formatEther(loanInfo.deposit)} ETH`);
  
  const now = Math.floor(Date.now() / 1000);
  const isOverdue = now > Number(loanInfo.dueDate);
  if (isOverdue) {
    const daysLate = Math.floor((now - Number(loanInfo.dueDate)) / 86400);
    console.log(`   ⚠️  TRẢ MUỘN: ${daysLate} ngày`);
  } else {
    console.log("   ✅ Trả đúng hạn");
  }
  console.log("");

  // Kiểm tra điểm uy tín trước
  const reputationBefore = await libraryCore.userReputation(borrower.address);
  console.log("⭐ Điểm uy tín trước khi trả:", reputationBefore);
  console.log("");

  // Trả sách
  console.log("📚 Đang trả sách...");
  
  try {
    const tx = await libraryCore.returnBook(BOOK_ID, RETURN_STATUS);
    console.log("   ⏳ Đang chờ transaction...");
    const receipt = await tx.wait();
    console.log("   ✅ Transaction thành công!");
    console.log("   📝 Transaction hash:", tx.hash);
    console.log("");

    // Đọc loan info sau khi trả
    const loanInfoAfter = await libraryCore.loanInfos(BOOK_ID);
    console.log("📋 Thông tin loan sau khi trả:");
    console.log(`   Đã trả: ${loanInfoAfter.isReturned}`);
    if (loanInfoAfter.latePenalty > 0) {
      console.log(`   Phạt trả muộn: ${ethers.formatEther(loanInfoAfter.latePenalty)} ETH`);
    }
    if (loanInfoAfter.damagePenalty > 0) {
      console.log(`   Phạt làm hỏng: ${ethers.formatEther(loanInfoAfter.damagePenalty)} ETH`);
    }
    console.log("");

    // Kiểm tra điểm uy tín sau
    const reputationAfter = await libraryCore.userReputation(borrower.address);
    const reputationChange = Number(reputationAfter) - Number(reputationBefore);
    console.log("⭐ Điểm uy tín sau khi trả:", reputationAfter);
    console.log(`   Thay đổi: ${reputationChange > 0 ? '+' : ''}${reputationChange}`);
    console.log("");

    // Kiểm tra trạng thái sách
    const BookNFTArtifact = await hre.artifacts.readArtifact("BookNFT");
    const BOOK_NFT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const bookNFT = new ethers.Contract(BOOK_NFT_ADDRESS, BookNFTArtifact.abi, borrower);
    const newStatus = await bookNFT.getBookStatus(BOOK_ID);
    console.log("📊 Trạng thái sách sau khi trả:", newStatus);
    console.log("");

    console.log("✅ Trả sách thành công!");
  } catch (error: any) {
    console.error("❌ Lỗi khi trả sách:", error.message);
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

