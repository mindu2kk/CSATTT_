import hre from "hardhat";

async function main() {
  console.log("📚 Library Blockchain System - Deploy Demo\n");

  console.log("🔍 Checking available modules...");
  console.log("hre keys:", Object.keys(hre));
  
  // Try to get ethers from hre
  if ('ethers' in hre) {
    console.log("✅ ethers found in hre");
    const ethers = hre.ethers;
    
    // Get signers
    const [owner, borrower] = await ethers.getSigners();
    console.log("👤 Owner:", owner.address);
    console.log("👤 Borrower:", borrower.address);
    
    // Deploy contracts
    console.log("\n📦 Deploying contracts...");
    const BookNFT = await ethers.getContractFactory("BookNFT");
    const bookNFT = await BookNFT.deploy();
    await bookNFT.waitForDeployment();
    console.log("✅ BookNFT deployed to:", await bookNFT.getAddress());
    
    console.log("🎉 Deploy successful!");
  } else {
    console.log("❌ ethers not found in hre");
    console.log("Available in hre:", Object.keys(hre));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
