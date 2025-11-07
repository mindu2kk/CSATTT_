// Simple JavaScript version to avoid TypeScript import issues
const hre = require("hardhat");

async function main() {
  console.log("📚 Library Blockchain System - Deploy & Interact\n");

  // Get signers
  const [owner, borrower] = await hre.ethers.getSigners();
  console.log("👤 Owner:", owner.address);
  console.log("👤 Borrower:", borrower.address);
  console.log("");

  // Deploy BookNFT
  console.log("📦 Deploying BookNFT...");
  const BookNFT = await hre.ethers.getContractFactory("BookNFT");
  const bookNFT = await BookNFT.deploy();
  await bookNFT.waitForDeployment();
  const bookNFTAddress = await bookNFT.getAddress();
  console.log("   ✅ BookNFT deployed to:", bookNFTAddress);

  // Deploy LibraryCore
  console.log("📦 Deploying LibraryCore...");
  const LibraryCore = await hre.ethers.getContractFactory("LibraryCore");
  const libraryCore = await LibraryCore.deploy(bookNFTAddress);
  await libraryCore.waitForDeployment();
  const libraryCoreAddress = await libraryCore.getAddress();
  console.log("   ✅ LibraryCore deployed to:", libraryCoreAddress);
  console.log("");

  // Setup authorization
  console.log("🔐 Setting up authorization...");
  await bookNFT.setAuthorizedUpdater(libraryCoreAddress, true);
  console.log("   ✅ LibraryCore authorized");
  console.log("");

  // Mint sample books
  console.log("📚 Minting sample books...");
  await bookNFT.mintBook("Lập Trình Blockchain", "Cẩm nang từ A-Z về smart contract!", 5);
  await bookNFT.mintBook("Mastering Ethereum", "Advanced guide to building smart contracts", 5);
  await bookNFT.mintBook("Solidity Programming", "Learn Solidity from scratch", 4);
  console.log("   ✅ Minted 3 books");
  console.log("");

  // Read book information
  console.log("📖 Reading book information:");
  for (let i = 0; i < 3; i++) {
    const bookInfo = await bookNFT.getBookInfo(i);
    console.log(`   Book #${i}:`);
    console.log(`     - Tên: ${bookInfo.name}`);
    console.log(`     - Mô tả: ${bookInfo.description}`);
    console.log(`     - Trạng thái: ${bookInfo.status} (0=Available, 1=Borrowed, 2=Damaged, 3=Lost, 4=Old, 5=New)`);
    console.log(`     - Ngày tạo: ${new Date(Number(bookInfo.createdAt) * 1000).toLocaleString()}`);
    console.log("");
  }

  // Check book status
  const status = await bookNFT.getBookStatus(0);
  console.log("📊 Book #0 status:", status.toString());
  
  // Set to Available if needed
  if (Number(status) !== 0) {
    console.log("🔄 Setting Book #0 to Available...");
    await bookNFT.updateBookStatus(0, 0);
    console.log("   ✅ Updated to Available status");
  }
  console.log("");

  // Check loan information
  console.log("📋 Checking loan information:");
  const loanInfo = await libraryCore.loanInfos(0);
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  if (loanInfo.borrower !== zeroAddress) {
    console.log(`   Book #0 borrowed by: ${loanInfo.borrower}`);
    console.log(`   Returned: ${loanInfo.isReturned}`);
  } else {
    console.log("   Book #0 has not been borrowed yet");
  }
  console.log("");

  // Check reputation
  console.log("⭐ Checking reputation:");
  const reputation = await libraryCore.userReputation(borrower.address);
  console.log(`   Borrower reputation: ${reputation.toString()}`);
  console.log("");

  console.log("✅ All interactions completed successfully!");
  console.log("\n💡 Contract addresses for future use:");
  console.log(`   BookNFT: ${bookNFTAddress}`);
  console.log(`   LibraryCore: ${libraryCoreAddress}`);
  
  // Demo borrowing a book
  console.log("\n📚 Demo: Borrowing Book #0...");
  
  // Make sure book is available
  await bookNFT.updateBookStatus(0, 0); // Set to Available
  
  // Borrow with deposit
  const deposit = hre.ethers.parseEther("0.1");
  const borrowTx = await libraryCore.connect(borrower).borrowBook(0, { value: deposit });
  await borrowTx.wait();
  console.log("   ✅ Book borrowed successfully!");
  
  // Check updated status
  const newStatus = await bookNFT.getBookStatus(0);
  console.log(`   📊 Book status after borrowing: ${newStatus} (1=Borrowed)`);
  
  // Check loan info
  const newLoanInfo = await libraryCore.loanInfos(0);
  console.log(`   📋 Borrowed by: ${newLoanInfo.borrower}`);
  console.log(`   💰 Deposit: ${hre.ethers.formatEther(newLoanInfo.deposit)} ETH`);
  console.log("");

  console.log("🎉 Demo completed! Try the other scripts:");
  console.log("   npx hardhat run scripts/return-book.ts --network hardhat");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
