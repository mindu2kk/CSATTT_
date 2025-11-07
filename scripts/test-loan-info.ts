import hre from "hardhat";
import { ethers } from "ethers";

async function main() {
  console.log("🧪 Testing LoanInfo Structure...\n");

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const LIBRARY_CORE_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

  const LibraryCoreArtifact = await hre.artifacts.readArtifact("LibraryCore");
  const libraryCore = new ethers.Contract(LIBRARY_CORE_ADDRESS, LibraryCoreArtifact.abi, provider);

  // Test loanInfos for book 0
  try {
    const loanInfo = await libraryCore.loanInfos(0);
    console.log("📋 LoanInfo for Book 0:");
    console.log("   Raw result:", loanInfo);
    console.log("   Type:", typeof loanInfo);
    
    if (Array.isArray(loanInfo)) {
      console.log("   Length:", loanInfo.length);
      loanInfo.forEach((val, idx) => {
        console.log(`   [${idx}]:`, val, `(${typeof val})`);
      });
      
      console.log("\n   Parsed:");
      console.log("   borrower:", loanInfo[0]);
      console.log("   borrowedAt:", loanInfo[1]?.toString());
      console.log("   dueDate:", loanInfo[2]?.toString());
      console.log("   deposit:", loanInfo[3]?.toString());
      console.log("   isReturned:", loanInfo[4]);
    } else {
      console.log("   borrower:", loanInfo.borrower);
      console.log("   borrowedAt:", loanInfo.borrowedAt?.toString());
      console.log("   dueDate:", loanInfo.dueDate?.toString());
      console.log("   deposit:", loanInfo.deposit?.toString());
      console.log("   isReturned:", loanInfo.isReturned);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
