const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying Library Blockchain System...\n");

  // Get signers
  const [owner] = await hre.ethers.getSigners();
  console.log("👤 Deploying with account:", owner.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(owner.address)), "ETH");
  console.log("");

  // Deploy BookNFT
  console.log("📦 Deploying BookNFT...");
  const BookNFT = await hre.ethers.getContractFactory("BookNFT");
  const bookNFT = await BookNFT.deploy();
  await bookNFT.waitForDeployment();
  const bookNFTAddress = await bookNFT.getAddress();
  console.log("✅ BookNFT deployed to:", bookNFTAddress);

  // Deploy LibraryCore
  console.log("📦 Deploying LibraryCore...");
  const LibraryCore = await hre.ethers.getContractFactory("LibraryCore");
  const libraryCore = await LibraryCore.deploy(bookNFTAddress);
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

  const fs = require('fs');
  fs.writeFileSync('./web/contracts.json', JSON.stringify(addresses, null, 2));
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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
