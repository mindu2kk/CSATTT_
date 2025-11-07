import hre from "hardhat";
import { ethers } from "ethers";

/**
 * Script đơn giản để deploy và tương tác với contracts
 * Sử dụng ethers v6 với provider thủ công
 */

async function main() {
  console.log("📚 Library Blockchain System - Simple Interaction\n");

  // Create in-process provider for hardhat network (no external connection needed)
  // When using --network hardhat, this creates an in-memory blockchain
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  
  // Connect to the in-process hardhat network
  // For --network hardhat, we need to create a provider that doesn't need external connection
  let actualProvider: ethers.Provider;
  try {
    // Try to connect to hardhat node if running
    actualProvider = provider;
    await provider.getNetwork();
  } catch (error) {
    // If no external node, we need to use a different approach
    console.log("⚠️  No hardhat node running. Creating mock provider...");
    // For demo purposes, we'll use the default hardhat accounts
    actualProvider = new ethers.JsonRpcProvider();
  }
  
  const privateKeys = [
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", 
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
  ];
  
  const owner = new ethers.Wallet(privateKeys[0], actualProvider);
  const borrower = new ethers.Wallet(privateKeys[1], actualProvider);
  
  console.log("👤 Owner:", owner.address);
  console.log("👤 Borrower:", borrower.address);
  console.log("");

  // Get contract artifacts
  const BookNFTArtifact = await hre.artifacts.readArtifact("BookNFT");
  const LibraryCoreArtifact = await hre.artifacts.readArtifact("LibraryCore");

  console.log("📦 Deploying contracts...");
  
  // Deploy BookNFT
  const BookNFTFactory = new ethers.ContractFactory(BookNFTArtifact.abi, BookNFTArtifact.bytecode, owner);
  const bookNFT = await BookNFTFactory.deploy();
  await bookNFT.waitForDeployment();
  
  console.log("   ✅ BookNFT deployed to:", await bookNFT.getAddress());
  
  // Deploy LibraryCore
  const LibraryCoreFactory = new ethers.ContractFactory(LibraryCoreArtifact.abi, LibraryCoreArtifact.bytecode, owner);
  const libraryCore = await LibraryCoreFactory.deploy(await bookNFT.getAddress());
  await libraryCore.waitForDeployment();
  
  console.log("   ✅ LibraryCore deployed to:", await libraryCore.getAddress());
  console.log("");

  // Setup authorization
  console.log("🔐 Setting up authorization...");
  await bookNFT.setAuthorizedUpdater(await libraryCore.getAddress(), true);
  console.log("   ✅ LibraryCore authorized to update book status");
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
  console.log(`   BookNFT: ${await bookNFT.getAddress()}`);
  console.log(`   LibraryCore: ${await libraryCore.getAddress()}`);
  console.log("\n💡 To borrow a book, run:");
  console.log("   npx hardhat run scripts/borrow-book.ts --network localhost");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
