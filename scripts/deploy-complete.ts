import hre from "hardhat";
import { writeFileSync } from "fs";

const ethers = hre.ethers;

/**
 * COMPLETE DEPLOYMENT SCRIPT
 * Deploy ALL contracts: BookNFT, LibraryCore, EscrowVault, UserProfile
 */
async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("🚀 COMPLETE LIBRARY BLOCKCHAIN SYSTEM DEPLOYMENT");
  console.log("=".repeat(70) + "\n");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer Address:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer Balance:", ethers.formatEther(balance), "ETH\n");

  // ============================================================
  // STEP 1: Deploy BookNFT
  // ============================================================
  console.log("📦 [1/4] Deploying BookNFT...");
  const BookNFT = await ethers.getContractFactory("BookNFT");
  const bookNFT = await BookNFT.deploy();
  await bookNFT.waitForDeployment();
  const bookNFTAddress = await bookNFT.getAddress();
  console.log("✅ BookNFT deployed to:", bookNFTAddress);

  // ============================================================
  // STEP 2: Deploy LibraryCore
  // ============================================================
  console.log("\n📦 [2/4] Deploying LibraryCore...");
  const LibraryCore = await ethers.getContractFactory("LibraryCore");
  const libraryCore = await LibraryCore.deploy(bookNFTAddress);
  await libraryCore.waitForDeployment();
  const libraryCoreAddress = await libraryCore.getAddress();
  console.log("✅ LibraryCore deployed to:", libraryCoreAddress);

  // ============================================================
  // STEP 3: Deploy EscrowVault
  // ============================================================
  console.log("\n📦 [3/4] Deploying EscrowVault...");
  const EscrowVault = await ethers.getContractFactory("EscrowVault");
  const escrowVault = await EscrowVault.deploy();
  await escrowVault.waitForDeployment();
  const escrowVaultAddress = await escrowVault.getAddress();
  console.log("✅ EscrowVault deployed to:", escrowVaultAddress);

  // ============================================================
  // STEP 4: Deploy UserProfile
  // ============================================================
  console.log("\n📦 [4/4] Deploying UserProfile...");
  const UserProfile = await ethers.getContractFactory("UserProfile");
  const userProfile = await UserProfile.deploy();
  await userProfile.waitForDeployment();
  const userProfileAddress = await userProfile.getAddress();
  console.log("✅ UserProfile deployed to:", userProfileAddress);

  // ============================================================
  // SETUP & AUTHORIZATION
  // ============================================================
  console.log("\n🔐 Setting up contract authorizations...");
  
  // Authorize LibraryCore to update BookNFT
  console.log("   → Authorizing LibraryCore to update BookNFT...");
  const authTx = await bookNFT.setAuthorizedUpdater(libraryCoreAddress, true);
  await authTx.wait();
  console.log("   ✅ LibraryCore authorized");

  // Set LibraryCore as the core for EscrowVault
  console.log("   → Setting LibraryCore as EscrowVault core...");
  const setCoreTx = await escrowVault.setCore(libraryCoreAddress);
  await setCoreTx.wait();
  console.log("   ✅ EscrowVault core set");

  // ============================================================
  // MINT SAMPLE BOOKS
  // ============================================================
  console.log("\n📚 Minting sample books for testing...");
  const sampleBooks = [
    { 
      name: "Blockchain Programming", 
      desc: "Complete guide to blockchain development with Solidity | Author: Andreas M. Antonopoulos",
      status: 0  // Available
    },
    { 
      name: "Smart Contracts Security", 
      desc: "Best practices for secure smart contract development | Author: ConsenSys Diligence",
      status: 0  // Available
    },
    { 
      name: "DeFi Development", 
      desc: "Build decentralized finance applications from scratch | Author: Vitalik Buterin",
      status: 0  // Available
    },
    { 
      name: "Ethereum Yellow Paper", 
      desc: "Technical specification of the Ethereum protocol | Author: Dr. Gavin Wood",
      status: 0  // Available
    },
    { 
      name: "Web3 Frontend Development", 
      desc: "Building decentralized applications with React and ethers.js | Author: Nader Dabit",
      status: 0  // Available
    }
  ];

  for (let i = 0; i < sampleBooks.length; i++) {
    const book = sampleBooks[i];
    const tx = await bookNFT.mintBook(book.name, book.desc, book.status);
    await tx.wait();
    console.log(`   ✅ Book ${i + 1}/${sampleBooks.length} minted: "${book.name}"`);
  }

  // ============================================================
  // SAVE CONTRACT ADDRESSES
  // ============================================================
  const network = await ethers.provider.getNetwork();
  const contractAddresses = {
    bookNFT: bookNFTAddress,
    libraryCore: libraryCoreAddress,
    escrowVault: escrowVaultAddress,
    userProfile: userProfileAddress,
    network: network.name === "unknown" ? "localhost" : network.name,
    chainId: network.chainId.toString()
  };

  // Save to web/contracts.json
  writeFileSync("./web/contracts.json", JSON.stringify(contractAddresses, null, 2));
  console.log("\n💾 Contract addresses saved to ./web/contracts.json");

  // Save to FE/static/js/shared/contracts.json (if FE folder exists)
  try {
    writeFileSync("./FE/static/js/shared/contracts.json", JSON.stringify(contractAddresses, null, 2));
    console.log("💾 Contract addresses saved to ./FE/static/js/shared/contracts.json");
  } catch (e) {
    // FE folder might not exist, skip
  }

  // ============================================================
  // DEPLOYMENT SUMMARY
  // ============================================================
  console.log("\n" + "=".repeat(70));
  console.log("🎉 DEPLOYMENT COMPLETE - ALL CONTRACTS DEPLOYED!");
  console.log("=".repeat(70));
  console.log("\n📋 Contract Addresses:");
  console.log("   BookNFT:       ", bookNFTAddress);
  console.log("   LibraryCore:   ", libraryCoreAddress);
  console.log("   EscrowVault:   ", escrowVaultAddress, "⭐ NEW!");
  console.log("   UserProfile:   ", userProfileAddress, "⭐ NEW!");
  console.log("\n🌐 Network Info:");
  console.log("   Network:       ", contractAddresses.network);
  console.log("   Chain ID:      ", contractAddresses.chainId);
  console.log("   Deployer:      ", deployer.address);
  console.log("=".repeat(70));

  console.log("\n✅ Authorization Status:");
  console.log("   ✅ LibraryCore can update BookNFT status");
  console.log("   ✅ EscrowVault linked to LibraryCore");

  console.log("\n📚 Sample Books:");
  console.log(`   ✅ ${sampleBooks.length} books minted for testing`);

  console.log("\n💡 Next Steps:");
  console.log("   1. Start Hardhat node (if not running):");
  console.log("      npx hardhat node");
  console.log("\n   2. Deploy contracts:");
  console.log("      npx hardhat run scripts/deploy-complete.ts --network localhost");
  console.log("\n   3. Start web server:");
  console.log("      cd web && python start-server.py");
  console.log("\n   4. Or start Flask server:");
  console.log("      cd FE && python app.py");
  console.log("\n   5. Connect MetaMask:");
  console.log("      - Network: Localhost 8545");
  console.log("      - Chain ID: 31337");
  console.log("      - RPC URL: http://127.0.0.1:8545");
  console.log("\n" + "=".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ DEPLOYMENT FAILED:");
    console.error(error);
    process.exit(1);
  });



