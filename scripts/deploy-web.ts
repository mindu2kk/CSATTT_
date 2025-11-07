import hre from "hardhat";
import { ethers } from "ethers";
import { writeFileSync } from "fs";

async function main() {
  console.log("🚀 Deploying Library Blockchain System for Web Interface...\n");

  // Create provider and signer manually
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // First Hardhat account
  const signer = new ethers.Wallet(privateKey, provider);

  console.log("👤 Deploying with account:", signer.address);
  console.log("💰 Account balance:", ethers.formatEther(await provider.getBalance(signer.address)), "ETH");
  console.log("");

  // Get contract artifacts
  const BookNFTArtifact = await hre.artifacts.readArtifact("BookNFT");
  const LibraryCoreArtifact = await hre.artifacts.readArtifact("LibraryCore");

  // Deploy BookNFT
  console.log("📦 Deploying BookNFT...");
  const BookNFTFactory = new ethers.ContractFactory(BookNFTArtifact.abi, BookNFTArtifact.bytecode, signer);
  const bookNFT = await BookNFTFactory.deploy();
  await bookNFT.waitForDeployment();
  const bookNFTAddress = await bookNFT.getAddress();
  console.log("✅ BookNFT deployed to:", bookNFTAddress);

  // Deploy LibraryCore
  console.log("📦 Deploying LibraryCore...");
  const LibraryCoreFactory = new ethers.ContractFactory(LibraryCoreArtifact.abi, LibraryCoreArtifact.bytecode, signer);
  const libraryCore = await LibraryCoreFactory.deploy(bookNFTAddress);
  await libraryCore.waitForDeployment();
  const libraryCoreAddress = await libraryCore.getAddress();
  console.log("✅ LibraryCore deployed to:", libraryCoreAddress);
  console.log("");

  // Setup authorization
  console.log("🔐 Setting up authorization...");
  await bookNFT.setAuthorizedUpdater(libraryCoreAddress, true);
  console.log("✅ LibraryCore authorized to update book status");
  console.log("");

  // Mint sample books
  console.log("📚 Minting sample books...");
  await bookNFT.mintBook("Lập Trình Blockchain", "Cẩm nang từ A-Z về smart contract!", 0);
  await bookNFT.mintBook("Mastering Ethereum", "Advanced guide to building smart contracts", 0);
  await bookNFT.mintBook("Solidity Programming", "Learn Solidity from scratch", 0);
  await bookNFT.mintBook("Web3 Development", "Build decentralized applications", 0);
  await bookNFT.mintBook("Smart Contract Security", "Best practices and common pitfalls", 0);
  console.log("✅ Minted 5 sample books");
  console.log("");

  // Save addresses to file for web interface
  const addresses = {
    bookNFT: bookNFTAddress,
    libraryCore: libraryCoreAddress,
    network: "localhost",
    chainId: 31337
  };

  writeFileSync('./web/contracts.json', JSON.stringify(addresses, null, 2));
  console.log("💾 Contract addresses saved to web/contracts.json");
  console.log("");

  console.log("🎉 Deployment completed successfully!");
  console.log("📋 Contract Addresses:");
  console.log("   BookNFT:", bookNFTAddress);
  console.log("   LibraryCore:", libraryCoreAddress);
  console.log("   Network: localhost (http://127.0.0.1:8545)");
  console.log("   Chain ID: 31337");
  console.log("");
  console.log("🌐 You can now open web/index.html to interact with the contracts!");
  console.log("");
  console.log("💡 Next steps:");
  console.log("   1. Make sure MetaMask is connected to localhost:8545");
  console.log("   2. Import the following private key for testing:");
  console.log("      Account 1: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
  console.log("      Account 2: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
  console.log("   3. Open web/index.html in your browser");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
