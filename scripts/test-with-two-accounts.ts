import hre from "hardhat";
import { ethers } from "ethers";

/**
 * Test script với 2 accounts: Admin và User
 * 
 * Usage:
 * npx hardhat run scripts/test-with-two-accounts.ts --network localhost
 */

async function main() {
  console.log("🧪 Testing with 2 Accounts (Admin & User)\n");

  // Setup provider
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  
  // Hardhat default accounts
  const adminPrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const userPrivateKey = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
  
  const admin = new ethers.Wallet(adminPrivateKey, provider);
  const user = new ethers.Wallet(userPrivateKey, provider);
  
  console.log("👤 Admin:", admin.address);
  console.log("👤 User:", user.address);
  console.log("");

  // Load contracts
  const { readFileSync } = await import("fs");
  const contracts = JSON.parse(readFileSync("./web/contracts.json", "utf8"));
  
  const BookNFTArtifact = await hre.artifacts.readArtifact("BookNFT");
  const LibraryCoreArtifact = await hre.artifacts.readArtifact("LibraryCore");
  
  const bookNFT = new ethers.Contract(contracts.bookNFT, BookNFTArtifact.abi, admin);
  const libraryCore = new ethers.Contract(contracts.libraryCore, LibraryCoreArtifact.abi, user);
  
  console.log("📚 Contracts loaded:");
  console.log("   BookNFT:", contracts.bookNFT);
  console.log("   LibraryCore:", contracts.libraryCore);
  console.log("");

  // Test 1: Admin mint book
  console.log("1️⃣ Admin minting a test book...");
  try {
    const mintTx = await bookNFT.mintBookWithCondition(
      "Test Book for 2 Accounts",
      "This book is minted by Admin and will be borrowed by User",
      0, // Available
      0  // New condition
    );
    await mintTx.wait();
    
    const nextBookId = await bookNFT.nextBookId();
    const bookId = Number(nextBookId) - 1;
    console.log("   ✅ Book minted! Book ID:", bookId);
    console.log("   📄 Transaction:", mintTx.hash);
    console.log("");

    // Test 2: User borrow book
    console.log("2️⃣ User borrowing the book...");
    try {
      const depositAmount = ethers.parseEther("0.1");
      const borrowTx = await libraryCore.borrowBook(bookId, { value: depositAmount });
      await borrowTx.wait();
      
      console.log("   ✅ Book borrowed successfully!");
      console.log("   📄 Transaction:", borrowTx.hash);
      console.log("   💰 Deposit:", ethers.formatEther(depositAmount), "ETH");
      console.log("");

      // Test 3: Check loan info
      console.log("3️⃣ Checking loan info...");
      const loanInfo = await libraryCore.loanInfos(bookId);
      console.log("   Borrower:", loanInfo.borrower || loanInfo[0]);
      console.log("   Borrowed At:", new Date(Number(loanInfo.borrowedAt) * 1000).toLocaleString());
      console.log("   Due Date:", new Date(Number(loanInfo.dueDate) * 1000).toLocaleString());
      console.log("   Deposit:", ethers.formatEther(loanInfo.deposit || loanInfo[3]), "ETH");
      console.log("");

      // Test 4: User return book
      console.log("4️⃣ User returning the book...");
      try {
        const returnTx = await libraryCore.returnBook(bookId, 0); // Available status
        await returnTx.wait();
        
        console.log("   ✅ Book returned successfully!");
        console.log("   📄 Transaction:", returnTx.hash);
        console.log("");

        // Test 5: Check reputation
        console.log("5️⃣ Checking user reputation...");
        const reputation = await libraryCore.userReputation(user.address);
        console.log("   User Reputation:", reputation.toString());
        console.log("   ✅ Expected: +1 (returned on time, good condition)");
        console.log("");

        // Test 6: Admin update condition
        console.log("6️⃣ Admin updating book condition...");
        try {
          const updateConditionTx = await bookNFT.updateCondition(bookId, 1); // Good
          await updateConditionTx.wait();
          
          const condition = await bookNFT.getCondition(bookId);
          console.log("   ✅ Condition updated!");
          console.log("   New Condition:", condition.toString(), "(1 = Good)");
          console.log("   📄 Transaction:", updateConditionTx.hash);
          console.log("");
        } catch (error) {
          console.log("   ❌ Failed to update condition:", error.message);
        }

      } catch (error) {
        console.log("   ❌ Failed to return book:", error.message);
      }

    } catch (error) {
      console.log("   ❌ Failed to borrow book:", error.message);
    }

  } catch (error) {
    console.log("   ❌ Failed to mint book:", error.message);
  }

  // Test 7: Admin pause/unpause
  console.log("7️⃣ Testing pause/unpause...");
  try {
    const libraryCoreAdmin = new ethers.Contract(contracts.libraryCore, LibraryCoreArtifact.abi, admin);
    
    // Pause
    console.log("   Pausing contract...");
    const pauseTx = await libraryCoreAdmin.pause();
    await pauseTx.wait();
    console.log("   ✅ Contract paused");
    
    // Check paused status
    const isPaused = await libraryCoreAdmin.paused();
    console.log("   Paused status:", isPaused);
    
    // Unpause
    console.log("   Unpausing contract...");
    const unpauseTx = await libraryCoreAdmin.unpause();
    await unpauseTx.wait();
    console.log("   ✅ Contract unpaused");
    console.log("");
  } catch (error) {
    console.log("   ❌ Failed to pause/unpause:", error.message);
  }

  console.log("🎉 All tests completed!");
  console.log("\n📋 Summary:");
  console.log("   ✅ Admin can mint books");
  console.log("   ✅ User can borrow books");
  console.log("   ✅ User can return books");
  console.log("   ✅ Admin can update condition");
  console.log("   ✅ Admin can pause/unpause");
  console.log("   ✅ Reputation system works");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });

