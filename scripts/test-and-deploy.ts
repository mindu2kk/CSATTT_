import hre from "hardhat";
import { ethers } from "ethers";
import { writeFileSync } from "fs";

async function main() {
  console.log("🧪 Testing and Deploying Contracts...\n");

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const deployer = new ethers.Wallet(privateKey, provider);

  console.log("👤 Account:", deployer.address);
  
  // Check if contracts already exist at default addresses
  const defaultBookNFT = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const defaultLibraryCore = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  const BookNFTArtifact = await hre.artifacts.readArtifact("BookNFT");
  const LibraryCoreArtifact = await hre.artifacts.readArtifact("LibraryCore");

  // Test if contracts exist
  const testBookNFT = new ethers.Contract(defaultBookNFT, BookNFTArtifact.abi, provider);
  const testLibraryCore = new ethers.Contract(defaultLibraryCore, LibraryCoreArtifact.abi, provider);

  let bookNFTAddress = defaultBookNFT;
  let libraryCoreAddress = defaultLibraryCore;

  try {
    const nextBookId = await testBookNFT.nextBookId();
    console.log("✅ BookNFT exists at default address - Next Book ID:", nextBookId.toString());
  } catch (error) {
    console.log("⚠️ BookNFT not found at default address, deploying new...");
    
    // Deploy new
    const BookNFTFactory = new ethers.ContractFactory(
      BookNFTArtifact.abi, 
      BookNFTArtifact.bytecode, 
      deployer
    );
    const bookNFT = await BookNFTFactory.deploy();
    await bookNFT.waitForDeployment();
    bookNFTAddress = await bookNFT.getAddress();
    console.log("✅ BookNFT deployed to:", bookNFTAddress);

    // Deploy LibraryCore
    const LibraryCoreFactory = new ethers.ContractFactory(
      LibraryCoreArtifact.abi, 
      LibraryCoreArtifact.bytecode, 
      deployer
    );
    const libraryCore = await LibraryCoreFactory.deploy(bookNFTAddress);
    await libraryCore.waitForDeployment();
    libraryCoreAddress = await libraryCore.getAddress();
    console.log("✅ LibraryCore deployed to:", libraryCoreAddress);

    // Setup authorization
    const authTx = await bookNFT.setAuthorizedUpdater(libraryCoreAddress, true);
    await authTx.wait();
    console.log("✅ Authorization set");
  }

  // Now test with correct addresses
  const bookNFT = new ethers.Contract(bookNFTAddress, BookNFTArtifact.abi, deployer);
  const libraryCore = new ethers.Contract(libraryCoreAddress, LibraryCoreArtifact.abi, deployer);

  console.log("\n🧪 Testing contracts...");
  
  try {
    const nextBookId = await bookNFT.nextBookId();
    console.log("✅ nextBookId() works - Next ID:", nextBookId.toString());
    
    if (nextBookId.toString() === "0") {
      console.log("\n📚 Minting test books...");
      await bookNFT.mintBook("Test Book 1", "First test book", 0);
      await bookNFT.mintBook("Test Book 2", "Second test book", 0);
      await bookNFT.mintBook("Test Book 3", "Third test book", 0);
      console.log("✅ 3 books minted");
      
      const newNextId = await bookNFT.nextBookId();
      console.log("📊 New next book ID:", newNextId.toString());
    } else {
      console.log(`✅ Found ${nextBookId} existing books`);
    }
  } catch (error) {
    console.log("❌ Contract test failed:", error.message);
    throw error;
  }

  // Save addresses
  const addresses = {
    bookNFT: bookNFTAddress,
    libraryCore: libraryCoreAddress,
    network: "localhost",
    chainId: 31337
  };

  writeFileSync('./web/contracts.json', JSON.stringify(addresses, null, 2));
  console.log("\n💾 Updated web/contracts.json");

  console.log("\n🎉 Setup completed!");
  console.log("📋 Final Addresses:");
  console.log(`   BookNFT: ${bookNFTAddress}`);
  console.log(`   LibraryCore: ${libraryCoreAddress}`);
  console.log("\n🌐 Web interface ready! Refresh browser and try again.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  });
