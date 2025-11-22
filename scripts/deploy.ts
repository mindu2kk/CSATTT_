import hre from "hardhat";
import { writeFileSync } from "fs";

const ethers = hre.ethers;

/**
 * Script deploy chính cho dự án
 * Deploy BookNFT và LibraryCore lên network
 */
async function main() {
  console.log("🚀 Deploying Library Blockchain System...\n");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy BookNFT
  console.log("📦 Deploying BookNFT...");
  const BookNFT = await ethers.getContractFactory("BookNFT");
  const bookNFT = await BookNFT.deploy();
  await bookNFT.waitForDeployment();
  const bookNFTAddress = await bookNFT.getAddress();
  console.log("✅ BookNFT deployed to:", bookNFTAddress);

  // Deploy LibraryCore
  console.log("\n📦 Deploying LibraryCore...");
  const LibraryCore = await ethers.getContractFactory("LibraryCore");
  const libraryCore = await LibraryCore.deploy(bookNFTAddress);
  await libraryCore.waitForDeployment();
  const libraryCoreAddress = await libraryCore.getAddress();
  console.log("✅ LibraryCore deployed to:", libraryCoreAddress);

  // Setup authorization
  console.log("\n🔐 Setting up authorization...");
  const authTx = await bookNFT.setAuthorizedUpdater(libraryCoreAddress, true);
  await authTx.wait();
  console.log("✅ LibraryCore authorized to update BookNFT");

  // Mint sample books with VALID status (0-3 only!)
  console.log("\n📚 Minting sample books...");
  const books = [
    { name: "Blockchain Programming", desc: "Complete guide to blockchain development", status: 0 },  // ✅ 0 = Available
    { name: "Smart Contracts", desc: "Learn Solidity and smart contract development", status: 0 },  // ✅ 0 = Available
    { name: "DeFi Development", desc: "Build decentralized finance applications", status: 0 }  // ✅ 0 = Available
  ];

  for (let i = 0; i < books.length; i++) {
    const tx = await bookNFT.mintBook(books[i].name, books[i].desc, books[i].status);
    await tx.wait();
    console.log(`✅ Book ${i + 1} minted: ${books[i].name} (Status: ${books[i].status} = Available)`);
  }

  // Save addresses to file
  const network = await ethers.provider.getNetwork();
  const addresses = {
    bookNFT: bookNFTAddress,
    libraryCore: libraryCoreAddress,
    network: "localhost",
    chainId: network.chainId.toString()
  };

  writeFileSync("./web/contracts.json", JSON.stringify(addresses, null, 2));
  console.log("\n💾 Addresses saved to ./web/contracts.json");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 Deployment Complete!");
  console.log("=".repeat(60));
  console.log("📋 Contract Addresses:");
  console.log(`   BookNFT:      ${bookNFTAddress}`);
  console.log(`   LibraryCore:  ${libraryCoreAddress}`);
  console.log(`   Chain ID:     ${addresses.chainId}`);
  console.log("=".repeat(60));
  console.log("\n💡 Next steps:");
  console.log("   1. Start web server: cd web && python start-server.py");
  console.log("   2. Open browser: http://localhost:8080");
  console.log("   3. Connect MetaMask to Hardhat Local (Chain ID: 31337)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
