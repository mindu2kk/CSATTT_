import hre from "hardhat";
import { readFileSync } from "fs";

const ethers = hre.ethers;

/**
 * Verification script to check if all contracts are deployed correctly
 */
async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("🔍 VERIFYING COMPLETE DEPLOYMENT");
  console.log("=".repeat(70) + "\n");

  // Read contracts.json
  let contracts: any;
  try {
    const contractsData = readFileSync("./web/contracts.json", "utf8");
    contracts = JSON.parse(contractsData);
  } catch (e) {
    console.error("❌ Cannot read web/contracts.json");
    console.error("   Please deploy contracts first using:");
    console.error("   npx hardhat run scripts/deploy-complete.ts --network localhost\n");
    process.exit(1);
  }

  console.log("📋 Checking deployed contracts...\n");

  const results: any = {
    bookNFT: false,
    libraryCore: false,
    escrowVault: false,
    userProfile: false
  };

  // Check BookNFT
  if (contracts.bookNFT) {
    try {
      const BookNFT = await ethers.getContractFactory("BookNFT");
      const bookNFT = BookNFT.attach(contracts.bookNFT);
      const owner = await bookNFT.owner();
      const nextId = await bookNFT.nextBookId();
      console.log("✅ BookNFT:", contracts.bookNFT);
      console.log("   Owner:", owner);
      console.log("   Next Book ID:", nextId.toString());
      console.log("   Total Books:", Number(nextId) > 0 ? Number(nextId) : 0);
      results.bookNFT = true;
    } catch (e) {
      console.log("❌ BookNFT:", contracts.bookNFT, "- NOT FOUND");
    }
  } else {
    console.log("❌ BookNFT: Not in contracts.json");
  }

  console.log("");

  // Check LibraryCore
  if (contracts.libraryCore) {
    try {
      const LibraryCore = await ethers.getContractFactory("LibraryCore");
      const libraryCore = LibraryCore.attach(contracts.libraryCore);
      const bookNFTAddr = await libraryCore.bookNFT();
      const owner = await libraryCore.owner();
      console.log("✅ LibraryCore:", contracts.libraryCore);
      console.log("   Owner:", owner);
      console.log("   BookNFT Reference:", bookNFTAddr);
      console.log("   Match:", bookNFTAddr.toLowerCase() === contracts.bookNFT.toLowerCase() ? "✅ YES" : "❌ NO");
      results.libraryCore = true;
    } catch (e) {
      console.log("❌ LibraryCore:", contracts.libraryCore, "- NOT FOUND");
    }
  } else {
    console.log("❌ LibraryCore: Not in contracts.json");
  }

  console.log("");

  // Check EscrowVault
  if (contracts.escrowVault) {
    try {
      const EscrowVault = await ethers.getContractFactory("EscrowVault");
      const escrowVault = EscrowVault.attach(contracts.escrowVault);
      const owner = await escrowVault.owner();
      const core = await escrowVault.libraryCore();
      const balance = await ethers.provider.getBalance(contracts.escrowVault);
      console.log("✅ EscrowVault:", contracts.escrowVault, "⭐ DEPLOYED!");
      console.log("   Owner:", owner);
      console.log("   Library Core:", core);
      console.log("   Balance:", ethers.formatEther(balance), "ETH");
      if (core === ethers.ZeroAddress) {
        console.log("   ⚠️  Core not set yet");
      } else if (core.toLowerCase() === contracts.libraryCore?.toLowerCase()) {
        console.log("   ✅ Core correctly set to LibraryCore");
      } else {
        console.log("   ⚠️  Core set to different address:", core);
      }
      results.escrowVault = true;
    } catch (e) {
      console.log("❌ EscrowVault:", contracts.escrowVault, "- NOT FOUND");
    }
  } else {
    console.log("❌ EscrowVault: Not deployed ⚠️");
    console.log("   Run: npx hardhat run scripts/deploy-complete.ts --network localhost");
  }

  console.log("");

  // Check UserProfile
  if (contracts.userProfile) {
    try {
      const UserProfile = await ethers.getContractFactory("UserProfile");
      const userProfile = UserProfile.attach(contracts.userProfile);
      const owner = await userProfile.owner();
      const totalUsers = await userProfile.totalUsers();
      console.log("✅ UserProfile:", contracts.userProfile, "⭐ DEPLOYED!");
      console.log("   Owner:", owner);
      console.log("   Total Users:", totalUsers.toString());
      results.userProfile = true;
    } catch (e) {
      console.log("❌ UserProfile:", contracts.userProfile, "- NOT FOUND");
    }
  } else {
    console.log("❌ UserProfile: Not deployed ⚠️");
    console.log("   Run: npx hardhat run scripts/deploy-complete.ts --network localhost");
  }

  // Check authorizations
  console.log("\n🔐 Checking authorizations...\n");
  
  if (results.bookNFT && results.libraryCore) {
    try {
      const BookNFT = await ethers.getContractFactory("BookNFT");
      const bookNFT = BookNFT.attach(contracts.bookNFT);
      const isAuthorized = await bookNFT.authorizedUpdaters(contracts.libraryCore);
      if (isAuthorized) {
        console.log("✅ LibraryCore is authorized to update BookNFT");
      } else {
        console.log("❌ LibraryCore is NOT authorized to update BookNFT");
        console.log("   Run: bookNFT.setAuthorizedUpdater(libraryCoreAddress, true)");
      }
    } catch (e) {
      console.log("⚠️  Could not check authorization");
    }
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("📊 VERIFICATION SUMMARY");
  console.log("=".repeat(70));
  
  const total = Object.keys(results).length;
  const deployed = Object.values(results).filter(v => v).length;
  
  console.log(`\n📈 Deployment Progress: ${deployed}/${total} contracts deployed`);
  console.log("");
  console.log(`   ${results.bookNFT ? '✅' : '❌'} BookNFT`);
  console.log(`   ${results.libraryCore ? '✅' : '❌'} LibraryCore`);
  console.log(`   ${results.escrowVault ? '✅' : '❌'} EscrowVault      ${results.escrowVault ? '⭐ NEW!' : '⚠️  MISSING'}`);
  console.log(`   ${results.userProfile ? '✅' : '❌'} UserProfile      ${results.userProfile ? '⭐ NEW!' : '⚠️  MISSING'}`);
  
  if (deployed === total) {
    console.log("\n🎉 ALL CONTRACTS DEPLOYED SUCCESSFULLY!");
    console.log("\n💡 Next steps:");
    console.log("   1. Start web server: cd web && python start-server.py");
    console.log("   2. Or start Flask: cd FE && python app.py");
    console.log("   3. Connect MetaMask to Localhost 8545 (Chain ID: 31337)");
  } else {
    console.log(`\n⚠️  INCOMPLETE DEPLOYMENT: ${total - deployed} contract(s) missing`);
    console.log("\n💡 To deploy all contracts:");
    console.log("   npx hardhat run scripts/deploy-complete.ts --network localhost");
  }
  
  console.log("=".repeat(70) + "\n");

  // Network info
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network Info:");
  console.log("   Network:", contracts.network || "unknown");
  console.log("   Chain ID:", network.chainId.toString());
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Verification failed:", error);
    process.exit(1);
  });



