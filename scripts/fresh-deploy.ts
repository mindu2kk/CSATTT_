import hre from "hardhat";
import { ethers } from "ethers";
import { writeFileSync } from "fs";

async function main() {
  console.log("🔥 Fresh Deploy - Starting from scratch...\n");

  // Connect to fresh hardhat node
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const deployer = new ethers.Wallet(privateKey, provider);

  console.log("👤 Deployer:", deployer.address);
  const balance = await provider.getBalance(deployer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "ETH");

  if (parseFloat(ethers.formatEther(balance)) < 9999) {
    throw new Error("Balance too low - hardhat node may not be fresh");
  }

  // Load artifacts
  const BookNFTArtifact = await hre.artifacts.readArtifact("BookNFT");
  const LibraryCoreArtifact = await hre.artifacts.readArtifact("LibraryCore");

  console.log("\n📦 Deploying BookNFT...");
  const BookNFTFactory = new ethers.ContractFactory(
    BookNFTArtifact.abi, 
    BookNFTArtifact.bytecode, 
    deployer
  );
  
  const bookNFT = await BookNFTFactory.deploy();
  await bookNFT.waitForDeployment();
  const bookNFTAddress = await bookNFT.getAddress();
  console.log("✅ BookNFT deployed to:", bookNFTAddress);

  console.log("\n📦 Deploying LibraryCore...");
  const LibraryCoreFactory = new ethers.ContractFactory(
    LibraryCoreArtifact.abi, 
    LibraryCoreArtifact.bytecode, 
    deployer
  );
  
  const libraryCore = await LibraryCoreFactory.deploy(bookNFTAddress);
  await libraryCore.waitForDeployment();
  const libraryCoreAddress = await libraryCore.getAddress();
  console.log("✅ LibraryCore deployed to:", libraryCoreAddress);

  console.log("\n🔐 Setting up authorization...");
  const authTx = await bookNFT.setAuthorizedUpdater(libraryCoreAddress, true);
  await authTx.wait();
  console.log("✅ LibraryCore authorized to update book status");

  console.log("\n📚 Minting test books...");
  
  const mintTx1 = await bookNFT.mintBook("Blockchain Programming", "Complete guide to blockchain development", 0);
  await mintTx1.wait();
  console.log("✅ Book 1: Blockchain Programming");
  
  const mintTx2 = await bookNFT.mintBook("Smart Contracts with Solidity", "Learn to build smart contracts", 0);
  await mintTx2.wait();
  console.log("✅ Book 2: Smart Contracts with Solidity");
  
  const mintTx3 = await bookNFT.mintBook("DeFi Development", "Build decentralized finance apps", 0);
  await mintTx3.wait();
  console.log("✅ Book 3: DeFi Development");

  // Verify deployment
  console.log("\n🧪 Verifying deployment...");
  const totalSupply = await bookNFT.totalSupply();
  console.log("📊 Total books:", totalSupply.toString());
  
  const firstBook = await bookNFT.getBookInfo(0);
  console.log("📖 First book:", firstBook.name);

  // Save addresses for web interface
  const addresses = {
    bookNFT: bookNFTAddress,
    libraryCore: libraryCoreAddress,
    network: "localhost",
    chainId: 31337
  };

  writeFileSync('./web/contracts.json', JSON.stringify(addresses, null, 2));
  console.log("\n💾 Contract addresses saved to web/contracts.json");

  console.log("\n🎉 Fresh deployment completed successfully!");
  console.log("📋 Contract Summary:");
  console.log(`   BookNFT: ${bookNFTAddress}`);
  console.log(`   LibraryCore: ${libraryCoreAddress}`);
  console.log(`   Books Available: ${totalSupply}`);
  console.log("\n🌐 Web interface ready at: http://localhost:8080");
  console.log("🔄 Please refresh the browser and try again!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Fresh deploy failed:", error);
    process.exit(1);
  });
