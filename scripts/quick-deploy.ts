import hre from "hardhat";
import { ethers } from "ethers";
import { writeFileSync } from "fs";

async function main() {
  console.log("🚀 Quick Deploy for Web Interface...\n");

  // Create provider directly to hardhat network
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  
  // Wait for node to be ready
  console.log("⏳ Waiting for Hardhat node to be ready...");
  let retries = 10;
  while (retries > 0) {
    try {
      await provider.getBlockNumber();
      console.log("✅ Node is ready!\n");
      break;
    } catch (error) {
      retries--;
      if (retries === 0) {
        throw new Error("Hardhat node is not ready. Please start it with: npx hardhat node");
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Use first hardhat account
  const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const deployer = new ethers.Wallet(privateKey, provider);
  
  // Get current nonce to ensure we're using the right one
  const currentNonce = await provider.getTransactionCount(deployer.address);
  console.log(`📊 Current nonce for ${deployer.address}: ${currentNonce}\n`);

  console.log("👤 Deployer:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await provider.getBalance(deployer.address)), "ETH");
  
  // Get artifacts
  const BookNFTArtifact = await hre.artifacts.readArtifact("BookNFT");
  const LibraryCoreArtifact = await hre.artifacts.readArtifact("LibraryCore");
  const EscrowVaultArtifact = await hre.artifacts.readArtifact("EscrowVault");

  // Deploy contracts
  console.log("📦 Deploying contracts...\n");
  
  // Deploy BookNFT
  console.log("1️⃣ Deploying BookNFT...");
  const BookNFTFactory = new ethers.ContractFactory(BookNFTArtifact.abi, BookNFTArtifact.bytecode, deployer);
  const bookNFT = await BookNFTFactory.deploy();
  const bookNFTTx = await bookNFT.waitForDeployment();
  const bookNFTAddress = await bookNFT.getAddress();
  console.log("   ✅ BookNFT:", bookNFTAddress);
  
  // Wait for transaction to be mined and nonce to update
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Deploy EscrowVault
  console.log("2️⃣ Deploying EscrowVault...");
  const EscrowVaultFactory = new ethers.ContractFactory(EscrowVaultArtifact.abi, EscrowVaultArtifact.bytecode, deployer);
  const escrowVault = await EscrowVaultFactory.deploy();
  const escrowVaultTx = await escrowVault.waitForDeployment();
  const escrowVaultAddress = await escrowVault.getAddress();
  console.log("   ✅ EscrowVault:", escrowVaultAddress);
  
  // Wait for transaction to be mined and nonce to update
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Deploy LibraryCore
  console.log("3️⃣ Deploying LibraryCore...");
  const LibraryCoreFactory = new ethers.ContractFactory(LibraryCoreArtifact.abi, LibraryCoreArtifact.bytecode, deployer);
  const libraryCore = await LibraryCoreFactory.deploy(bookNFTAddress, escrowVaultAddress);
  const libraryCoreTx = await libraryCore.waitForDeployment();
  const libraryCoreAddress = await libraryCore.getAddress();
  console.log("   ✅ LibraryCore:", libraryCoreAddress);

  console.log("✅ BookNFT:", bookNFTAddress);
  console.log("✅ EscrowVault:", escrowVaultAddress);
  console.log("✅ LibraryCore:", libraryCoreAddress);

  // Wait for transaction to be mined and nonce to update
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Setup EscrowVault: set LibraryCore as the only authorized caller
  console.log("\n🔐 Setting up EscrowVault...");
  const setCoreTx = await escrowVault.setCore(libraryCoreAddress);
  await setCoreTx.wait();
  console.log("✅ EscrowVault core set");
  
  // Wait for transaction to be mined and nonce to update
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Setup authorization
  console.log("\n🔐 Setting up authorization...");
  const authTx = await bookNFT.setAuthorizedUpdater(libraryCoreAddress, true);
  await authTx.wait();
  console.log("✅ Authorization set");
  
  // Wait for transaction to be mined and nonce to update
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mint books with proper nonce handling
  console.log("\n📚 Minting books...");
  try {
    const mint1Tx = await bookNFT.mintBook("Blockchain Programming", "Complete guide to blockchain development", 0);
    await mint1Tx.wait();
    console.log("✅ Book 1 minted");
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mint2Tx = await bookNFT.mintBook("Smart Contracts", "Learn Solidity and smart contract development", 0);
    await mint2Tx.wait();
    console.log("✅ Book 2 minted");
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mint3Tx = await bookNFT.mintBook("DeFi Development", "Build decentralized finance applications", 0);
    await mint3Tx.wait();
    console.log("✅ Book 3 minted");
  } catch (error) {
    console.log("⚠️ Mint error (but contracts are deployed):", error.message);
  }

  // Save addresses
  const addresses = {
    bookNFT: bookNFTAddress,
    libraryCore: libraryCoreAddress,
    escrowVault: escrowVaultAddress,
    network: "localhost",
    chainId: 31337
  };

  writeFileSync('./web/contracts.json', JSON.stringify(addresses, null, 2));
  console.log("\n💾 Addresses saved to web/contracts.json");
  
  console.log("\n🎉 Deploy completed!");
  console.log("📋 Contract Info:");
  console.log(`   BookNFT: ${bookNFTAddress}`);
  console.log(`   EscrowVault: ${escrowVaultAddress}`);
  console.log(`   LibraryCore: ${libraryCoreAddress}`);
  
  // Test contract calls
  console.log("\n🧪 Testing contracts...");
  try {
    const nextBookId = await bookNFT.nextBookId();
    console.log("✅ Next Book ID:", nextBookId.toString());
    
    if (nextBookId > 0) {
      const bookInfo = await bookNFT.getBookInfo(0);
      console.log("✅ First book:", bookInfo.name);
      console.log("✅ Condition:", bookInfo.condition);
    }
    
    console.log("✅ Contracts working perfectly!");
  } catch (error) {
    console.log("❌ Contract test failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deploy failed:", error);
    process.exit(1);
  });
