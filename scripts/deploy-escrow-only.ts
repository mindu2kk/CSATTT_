import hre from "hardhat";
import { readFileSync, writeFileSync } from "fs";

const ethers = hre.ethers;

/**
 * Deploy ONLY EscrowVault and integrate with existing LibraryCore
 * Use this script if BookNFT and LibraryCore are already deployed
 */
async function main() {
  console.log("\n🚀 Deploying EscrowVault...\n");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "ETH\n");

  // Read existing contracts
  let existingContracts: any = {};
  try {
    const contractsData = readFileSync("./web/contracts.json", "utf8");
    existingContracts = JSON.parse(contractsData);
    console.log("📋 Existing contracts loaded:");
    console.log("   BookNFT:      ", existingContracts.bookNFT || "❌ NOT DEPLOYED");
    console.log("   LibraryCore:  ", existingContracts.libraryCore || "❌ NOT DEPLOYED");
    console.log("");
  } catch (e) {
    console.warn("⚠️  No existing contracts.json found. This is OK if first deployment.\n");
  }

  // Deploy EscrowVault
  console.log("📦 Deploying EscrowVault...");
  const EscrowVault = await ethers.getContractFactory("EscrowVault");
  const escrowVault = await EscrowVault.deploy();
  await escrowVault.waitForDeployment();
  const escrowVaultAddress = await escrowVault.getAddress();
  console.log("✅ EscrowVault deployed to:", escrowVaultAddress);

  // Set LibraryCore as the core (if exists)
  if (existingContracts.libraryCore) {
    console.log("\n🔐 Setting LibraryCore as EscrowVault core...");
    try {
      const setCoreTx = await escrowVault.setCore(existingContracts.libraryCore);
      await setCoreTx.wait();
      console.log("✅ EscrowVault core set to:", existingContracts.libraryCore);
    } catch (error) {
      console.warn("⚠️  Failed to set core. You may need to call setCore() manually.");
      console.warn("   Error:", error);
    }
  } else {
    console.log("\n⚠️  LibraryCore not found. Please set core manually later:");
    console.log("   escrowVault.setCore(libraryCoreAddress)");
  }

  // Update contracts.json
  const network = await ethers.provider.getNetwork();
  const updatedContracts = {
    ...existingContracts,
    escrowVault: escrowVaultAddress,
    network: network.name === "unknown" ? "localhost" : network.name,
    chainId: network.chainId.toString()
  };

  writeFileSync("./web/contracts.json", JSON.stringify(updatedContracts, null, 2));
  console.log("\n💾 Updated ./web/contracts.json");

  // Also update FE if exists
  try {
    writeFileSync("./FE/static/js/shared/contracts.json", JSON.stringify(updatedContracts, null, 2));
    console.log("💾 Updated ./FE/static/js/shared/contracts.json");
  } catch (e) {
    // Skip if FE folder doesn't exist
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 EscrowVault Deployment Complete!");
  console.log("=".repeat(60));
  console.log("📋 Contract Addresses:");
  console.log(`   EscrowVault:  ${escrowVaultAddress} ⭐ NEW!`);
  if (existingContracts.libraryCore) {
    console.log(`   LibraryCore:  ${existingContracts.libraryCore}`);
  }
  console.log("=".repeat(60));

  console.log("\n💡 Note:");
  console.log("   ⚠️  Current LibraryCore does NOT use EscrowVault.");
  console.log("   ⚠️  Deposits are managed directly in LibraryCore.");
  console.log("   ✅ EscrowVault is deployed for future use.");
  console.log("\n   To use EscrowVault, you need to:");
  console.log("   1. Modify LibraryCore to integrate EscrowVault");
  console.log("   2. Or use LibraryCoreV3 with EscrowVault support");
  console.log("   3. Redeploy the modified contract");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });



