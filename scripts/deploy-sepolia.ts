import hre from "hardhat";
import { ethers } from "ethers";
import { writeFileSync } from "fs";

async function main() {
  console.log("🚀 Deploying to Sepolia Testnet...\n");

  // Get deployer from config
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const privateKey = process.env.SEPOLIA_PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error("SEPOLIA_PRIVATE_KEY not found in .env file");
  }
  
  const deployer = new ethers.Wallet(privateKey, provider);

  console.log("👤 Deployer:", deployer.address);
  const balance = await provider.getBalance(deployer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    throw new Error("Insufficient Sepolia ETH. Please get some from https://sepoliafaucet.com/");
  }

  // Get artifacts
  const BookNFTArtifact = await hre.artifacts.readArtifact("BookNFT");
  const LibraryCoreArtifact = await hre.artifacts.readArtifact("LibraryCore");
  const EscrowVaultArtifact = await hre.artifacts.readArtifact("EscrowVault");

  // Deploy contracts
  console.log("\n📦 Deploying contracts...\n");
  
  // Deploy BookNFT
  console.log("1️⃣ Deploying BookNFT...");
  const BookNFTFactory = new ethers.ContractFactory(BookNFTArtifact.abi, BookNFTArtifact.bytecode, deployer);
  const bookNFT = await BookNFTFactory.deploy();
  const bookNFTTx = await bookNFT.waitForDeployment();
  const bookNFTAddress = await bookNFT.getAddress();
  console.log("   ✅ BookNFT:", bookNFTAddress);
  console.log("   📄 Transaction:", bookNFTTx.hash);
  
  // Wait for transaction to be mined
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Deploy EscrowVault
  console.log("2️⃣ Deploying EscrowVault...");
  const EscrowVaultFactory = new ethers.ContractFactory(EscrowVaultArtifact.abi, EscrowVaultArtifact.bytecode, deployer);
  const escrowVault = await EscrowVaultFactory.deploy();
  const escrowVaultTx = await escrowVault.waitForDeployment();
  const escrowVaultAddress = await escrowVault.getAddress();
  console.log("   ✅ EscrowVault:", escrowVaultAddress);
  console.log("   📄 Transaction:", escrowVaultTx.hash);
  
  // Wait for transaction to be mined
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Deploy LibraryCore
  console.log("3️⃣ Deploying LibraryCore...");
  const LibraryCoreFactory = new ethers.ContractFactory(LibraryCoreArtifact.abi, LibraryCoreArtifact.bytecode, deployer);
  const libraryCore = await LibraryCoreFactory.deploy(bookNFTAddress, escrowVaultAddress);
  const libraryCoreTx = await libraryCore.waitForDeployment();
  const libraryCoreAddress = await libraryCore.getAddress();
  console.log("   ✅ LibraryCore:", libraryCoreAddress);
  console.log("   📄 Transaction:", libraryCoreTx.hash);

  // Wait for transaction to be mined
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Setup EscrowVault: set LibraryCore as the only authorized caller
  console.log("\n🔐 Setting up EscrowVault...");
  const setCoreTx = await escrowVault.setCore(libraryCoreAddress);
  await setCoreTx.wait();
  console.log("   ✅ EscrowVault core set");
  console.log("   📄 Transaction:", setCoreTx.hash);
  
  // Wait for transaction to be mined
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Setup authorization
  console.log("\n🔐 Setting up authorization...");
  const authTx = await bookNFT.setAuthorizedUpdater(libraryCoreAddress, true);
  await authTx.wait();
  console.log("   ✅ Authorization set");
  console.log("   📄 Transaction:", authTx.hash);
  
  // Wait for transaction to be mined
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Mint books with proper nonce handling
  console.log("\n📚 Minting books...");
  try {
    const mint1Tx = await bookNFT.mintBookWithCondition("Blockchain Programming", "Complete guide to blockchain development", 0, 0);
    await mint1Tx.wait();
    console.log("   ✅ Book 1 minted");
    console.log("   📄 Transaction:", mint1Tx.hash);
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const mint2Tx = await bookNFT.mintBookWithCondition("Smart Contracts", "Learn Solidity and smart contract development", 0, 0);
    await mint2Tx.wait();
    console.log("   ✅ Book 2 minted");
    console.log("   📄 Transaction:", mint2Tx.hash);
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const mint3Tx = await bookNFT.mintBookWithCondition("DeFi Development", "Build decentralized finance applications", 0, 0);
    await mint3Tx.wait();
    console.log("   ✅ Book 3 minted");
    console.log("   📄 Transaction:", mint3Tx.hash);
  } catch (error) {
    console.log("⚠️ Mint error (but contracts are deployed):", error.message);
  }

  // Save addresses
  const addresses = {
    bookNFT: bookNFTAddress,
    libraryCore: libraryCoreAddress,
    escrowVault: escrowVaultAddress,
    network: "sepolia",
    chainId: 11155111
  };

  writeFileSync('./web/contracts.json', JSON.stringify(addresses, null, 2));
  console.log("\n💾 Addresses saved to web/contracts.json");

  console.log("\n🎉 Deploy completed!");
  console.log("📋 Contract Info:");
  console.log(`   BookNFT: ${bookNFTAddress}`);
  console.log(`   EscrowVault: ${escrowVaultAddress}`);
  console.log(`   LibraryCore: ${libraryCoreAddress}`);
  console.log("\n🌐 View on Etherscan:");
  console.log(`   BookNFT: https://sepolia.etherscan.io/address/${bookNFTAddress}`);
  console.log(`   EscrowVault: https://sepolia.etherscan.io/address/${escrowVaultAddress}`);
  console.log(`   LibraryCore: https://sepolia.etherscan.io/address/${libraryCoreAddress}`);

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

