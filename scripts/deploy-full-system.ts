import hre from "hardhat";
import { writeFileSync } from "fs";

const ethers = hre.ethers;

/**
 * FULL SYSTEM DEPLOYMENT
 * Deploy tất cả contracts với role-based access control
 */
async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("🚀 FULL LIBRARY BLOCKCHAIN SYSTEM DEPLOYMENT");
  console.log("   With Role Management + Profile Integration + Cart + Escrow");
  console.log("=".repeat(80) + "\n");

  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "ETH\n");

  // ============================================================
  // STEP 1: Deploy BookNFT
  // ============================================================
  console.log("📦 [1/7] Deploying BookNFT...");
  const BookNFT = await ethers.getContractFactory("BookNFT");
  const bookNFT = await BookNFT.deploy();
  await bookNFT.waitForDeployment();
  const bookNFTAddress = await bookNFT.getAddress();
  console.log("✅ BookNFT:", bookNFTAddress);

  // ============================================================
  // STEP 2: Deploy RoleManager
  // ============================================================
  console.log("\n📦 [2/7] Deploying RoleManager...");
  const RoleManager = await ethers.getContractFactory("RoleManager");
  const roleManager = await RoleManager.deploy();
  await roleManager.waitForDeployment();
  const roleManagerAddress = await roleManager.getAddress();
  console.log("✅ RoleManager:", roleManagerAddress);
  console.log("   → Owner automatically set as Admin");

  // ============================================================
  // STEP 3: Deploy UserProfileV2
  // ============================================================
  console.log("\n📦 [3/7] Deploying UserProfileV2...");
  const UserProfileV2 = await ethers.getContractFactory("UserProfileV2");
  const userProfile = await UserProfileV2.deploy();
  await userProfile.waitForDeployment();
  const userProfileAddress = await userProfile.getAddress();
  console.log("✅ UserProfileV2:", userProfileAddress);

  // ============================================================
  // STEP 4: Deploy UserCart
  // ============================================================
  console.log("\n📦 [4/7] Deploying UserCart...");
  const UserCart = await ethers.getContractFactory("UserCart");
  const userCart = await UserCart.deploy();
  await userCart.waitForDeployment();
  const userCartAddress = await userCart.getAddress();
  console.log("✅ UserCart:", userCartAddress);

  // ============================================================
  // STEP 5: Deploy EscrowVault
  // ============================================================
  console.log("\n📦 [5/7] Deploying EscrowVault...");
  const EscrowVault = await ethers.getContractFactory("EscrowVault");
  const escrowVault = await EscrowVault.deploy();
  await escrowVault.waitForDeployment();
  const escrowVaultAddress = await escrowVault.getAddress();
  console.log("✅ EscrowVault:", escrowVaultAddress);

  // ============================================================
  // STEP 6: Deploy LibraryCoreV3
  // ============================================================
  console.log("\n📦 [6/7] Deploying LibraryCoreV3...");
  const LibraryCoreV3 = await ethers.getContractFactory("LibraryCoreV3");
  const libraryCore = await LibraryCoreV3.deploy(
    bookNFTAddress,
    userProfileAddress,
    roleManagerAddress,
    userCartAddress,
    escrowVaultAddress
  );
  await libraryCore.waitForDeployment();
  const libraryCoreAddress = await libraryCore.getAddress();
  console.log("✅ LibraryCoreV3:", libraryCoreAddress);

  // ============================================================
  // STEP 7: Setup Authorizations
  // ============================================================
  console.log("\n🔐 [7/7] Setting up authorizations...");
  
  // 1. Authorize LibraryCore to update BookNFT
  console.log("   → Authorizing LibraryCore to update BookNFT...");
  const authBookTx = await bookNFT.setAuthorizedUpdater(libraryCoreAddress, true);
  await authBookTx.wait();
  console.log("   ✅ Done");

  // 2. Set LibraryCore as EscrowVault core
  console.log("   → Setting LibraryCore as EscrowVault core...");
  const setCoreTx = await escrowVault.setCore(libraryCoreAddress);
  await setCoreTx.wait();
  console.log("   ✅ Done");

  // 3. Authorize LibraryCore to update UserProfile reputation
  console.log("   → Authorizing LibraryCore to update reputation...");
  const authProfileTx = await userProfile.setAuthorizedUpdater(libraryCoreAddress, true);
  await authProfileTx.wait();
  console.log("   ✅ Done");

  // ============================================================
  // MINT SAMPLE BOOKS
  // ============================================================
  console.log("\n📚 Minting sample books...");
  const books = [
    { name: "Blockchain Programming", desc: "Complete guide to blockchain development | Author: Andreas M. Antonopoulos", status: 0 },
    { name: "Smart Contracts Security", desc: "Best practices for secure smart contracts | Author: ConsenSys", status: 0 },
    { name: "DeFi Development", desc: "Build decentralized finance applications | Author: Vitalik Buterin", status: 0 },
    { name: "Ethereum Yellow Paper", desc: "Technical specification of Ethereum | Author: Dr. Gavin Wood", status: 0 },
    { name: "Web3 Frontend", desc: "Building dApps with React and ethers.js | Author: Nader Dabit", status: 0 }
  ];

  for (let i = 0; i < books.length; i++) {
    const tx = await bookNFT.mintBook(books[i].name, books[i].desc, books[i].status);
    await tx.wait();
    console.log(`   ✅ Book ${i + 1}/${books.length}: "${books[i].name}"`);
  }

  // ============================================================
  // CREATE SAMPLE ACCOUNTS
  // ============================================================
  console.log("\n👥 Setting up sample accounts...");
  
  // Get test accounts from Hardhat
  const accounts = await ethers.getSigners();
  
  // Account #0 is deployer/admin (already admin via RoleManager)
  console.log(`   ✅ Admin: ${accounts[0].address} (Deployer)`);
  
  // Account #1 as Librarian
  if (accounts.length > 1) {
    const librarianTx = await roleManager.grantRole(accounts[1].address, 2); // Role.Librarian
    await librarianTx.wait();
    console.log(`   ✅ Librarian: ${accounts[1].address}`);
  }
  
  // Account #2, #3 as regular Users (will create profiles)
  if (accounts.length > 2) {
    const userTx2 = await roleManager.grantRole(accounts[2].address, 1); // Role.User
    await userTx2.wait();
    console.log(`   ✅ User #1: ${accounts[2].address}`);
  }
  
  if (accounts.length > 3) {
    const userTx3 = await roleManager.grantRole(accounts[3].address, 1); // Role.User
    await userTx3.wait();
    console.log(`   ✅ User #2: ${accounts[3].address}`);
  }

  // ============================================================
  // SAVE ADDRESSES
  // ============================================================
  const network = await ethers.provider.getNetwork();
  const contractAddresses = {
    bookNFT: bookNFTAddress,
    libraryCore: libraryCoreAddress,
    escrowVault: escrowVaultAddress,
    userProfile: userProfileAddress,
    roleManager: roleManagerAddress,
    userCart: userCartAddress,
    network: network.name === "unknown" ? "localhost" : network.name,
    chainId: network.chainId.toString()
  };

  writeFileSync("./web/contracts.json", JSON.stringify(contractAddresses, null, 2));
  console.log("\n💾 Addresses saved to ./web/contracts.json");

  try {
    writeFileSync("./FE/static/js/shared/contracts.json", JSON.stringify(contractAddresses, null, 2));
    console.log("💾 Addresses saved to ./FE/static/js/shared/contracts.json");
  } catch (e) {
    // Skip if FE doesn't exist
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log("\n" + "=".repeat(80));
  console.log("🎉 FULL SYSTEM DEPLOYMENT COMPLETE!");
  console.log("=".repeat(80));
  console.log("\n📋 Contract Addresses:");
  console.log(`   BookNFT:       ${bookNFTAddress}`);
  console.log(`   LibraryCoreV3: ${libraryCoreAddress} ⭐ NEW!`);
  console.log(`   EscrowVault:   ${escrowVaultAddress} ⭐ Integrated!`);
  console.log(`   UserProfileV2: ${userProfileAddress} ⭐ Authorized!`);
  console.log(`   RoleManager:   ${roleManagerAddress} ⭐ NEW!`);
  console.log(`   UserCart:      ${userCartAddress} ⭐ NEW!`);
  
  console.log("\n🌐 Network:");
  console.log(`   Network: ${contractAddresses.network}`);
  console.log(`   Chain ID: ${contractAddresses.chainId}`);
  
  console.log("\n✅ Authorizations:");
  console.log("   ✅ LibraryCore can update BookNFT");
  console.log("   ✅ LibraryCore linked to EscrowVault");
  console.log("   ✅ LibraryCore can update UserProfile reputation");
  
  console.log("\n👥 Roles:");
  console.log(`   ✅ Admin: ${accounts[0].address}`);
  if (accounts.length > 1) console.log(`   ✅ Librarian: ${accounts[1].address}`);
  if (accounts.length > 2) console.log(`   ✅ User #1: ${accounts[2].address}`);
  if (accounts.length > 3) console.log(`   ✅ User #2: ${accounts[3].address}`);
  
  console.log("\n📚 Sample Data:");
  console.log(`   ✅ ${books.length} books minted`);
  
  console.log("\n💡 Architecture:");
  console.log("   🔐 Role-based access control (Admin/Librarian/User)");
  console.log("   👤 Mandatory user profiles on blockchain");
  console.log("   🛒 Cart stored on blockchain (per wallet)");
  console.log("   📚 Borrowed books tracked by wallet");
  console.log("   💰 Deposits managed by EscrowVault");
  console.log("   ⭐ Reputation system integrated");
  
  console.log("\n💡 Next Steps:");
  console.log("   1. Users MUST create profile before borrowing:");
  console.log("      userProfile.createProfile(name, email, studentId)");
  console.log("\n   2. Admin can grant roles:");
  console.log("      roleManager.grantRole(userAddress, Role.User)");
  console.log("\n   3. Cart is blockchain-based:");
  console.log("      userCart.addToCart(bookId)");
  console.log("      userCart.getMyCart()");
  console.log("\n   4. Start web server:");
  console.log("      cd FE && python sach.py");
  
  console.log("\n" + "=".repeat(80) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ DEPLOYMENT FAILED:", error);
    process.exit(1);
  });



