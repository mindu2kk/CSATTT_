import hre from "hardhat";
import { ethers } from "ethers";
import { writeFileSync } from "fs";

async function main() {
  console.log("🔧 Setting up existing contracts...\n");

  // Use existing deployed addresses
  const BOOK_NFT_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
  const LIBRARY_CORE_ADDRESS = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const deployer = new ethers.Wallet(privateKey, provider);

  console.log("👤 Account:", deployer.address);
  console.log("📋 BookNFT:", BOOK_NFT_ADDRESS);
  console.log("📋 LibraryCore:", LIBRARY_CORE_ADDRESS);

  // Load contract instances
  const BookNFTArtifact = await hre.artifacts.readArtifact("BookNFT");
  const LibraryCoreArtifact = await hre.artifacts.readArtifact("LibraryCore");

  const bookNFT = new ethers.Contract(BOOK_NFT_ADDRESS, BookNFTArtifact.abi, deployer);
  const libraryCore = new ethers.Contract(LIBRARY_CORE_ADDRESS, LibraryCoreArtifact.abi, deployer);

  // Test contracts
  console.log("\n🧪 Testing contracts...");
  
  try {
    const totalSupply = await bookNFT.totalSupply();
    console.log("✅ BookNFT working - Total supply:", totalSupply.toString());
  } catch (error) {
    console.log("❌ BookNFT error:", error.message);
  }

  try {
    const owner = await libraryCore.owner ? await libraryCore.owner() : "N/A";
    console.log("✅ LibraryCore working - Owner:", owner);
  } catch (error) {
    console.log("❌ LibraryCore error:", error.message);
  }

  // Setup authorization if needed
  console.log("\n🔐 Setting up authorization...");
  try {
    await bookNFT.setAuthorizedUpdater(LIBRARY_CORE_ADDRESS, true);
    console.log("✅ Authorization set");
  } catch (error) {
    console.log("⚠️ Authorization may already be set:", error.message);
  }

  // Mint a few test books if none exist
  console.log("\n📚 Adding test books...");
  try {
    const currentSupply = await bookNFT.totalSupply();
    
    if (currentSupply.toString() === "0") {
      console.log("No books found, minting test books...");
      
      await bookNFT.mintBook("Blockchain Basics", "Introduction to blockchain technology", 0);
      console.log("✅ Book 1 minted");
      
      await bookNFT.mintBook("Smart Contracts", "Learn Solidity programming", 0);
      console.log("✅ Book 2 minted");
      
      await bookNFT.mintBook("DeFi Guide", "Decentralized Finance explained", 0);
      console.log("✅ Book 3 minted");
    } else {
      console.log(`✅ Found ${currentSupply} existing books`);
      
      // Show first book info
      const bookInfo = await bookNFT.getBookInfo(0);
      console.log(`   First book: "${bookInfo.name}"`);
    }
  } catch (error) {
    console.log("⚠️ Mint error:", error.message);
  }

  // Update contracts.json
  const addresses = {
    bookNFT: BOOK_NFT_ADDRESS,
    libraryCore: LIBRARY_CORE_ADDRESS,
    network: "localhost",
    chainId: 31337
  };

  writeFileSync('./web/contracts.json', JSON.stringify(addresses, null, 2));
  console.log("\n💾 Updated web/contracts.json");

  console.log("\n🎉 Setup completed!");
  console.log("🌐 You can now use the web interface at http://localhost:8080");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  });
