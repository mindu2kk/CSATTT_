import hre from "hardhat";
import { readFileSync } from "fs";

const ethers = hre.ethers;

/**
 * Script tương tác với contracts đã deploy
 * Dùng để test các chức năng mượn/trả sách
 */
async function main() {
  console.log("🔧 Interacting with Library Blockchain System...\n");

  // Load contract addresses
  let addresses;
  try {
    addresses = JSON.parse(readFileSync("./web/contracts.json", "utf-8"));
  } catch (error) {
    console.error("❌ Cannot load contract addresses. Please deploy first.");
    process.exit(1);
  }

  // Get signers
  const [admin, user1, user2] = await ethers.getSigners();
  console.log("👤 Admin:", admin.address);
  console.log("👤 User1:", user1.address);
  console.log("👤 User2:", user2.address);

  // Get contracts
  const bookNFT = await ethers.getContractAt("BookNFT", addresses.bookNFT);
  const libraryCore = await ethers.getContractAt("LibraryCore", addresses.libraryCore);

  // Test 1: View books
  console.log("\n📚 Viewing books...");
  const nextBookId = await bookNFT.nextBookId();
  console.log(`Total books: ${nextBookId}`);

  for (let i = 0; i < Number(nextBookId); i++) {
    const bookInfo = await bookNFT.getBookInfo(i);
    console.log(`\nBook #${i}:`);
    console.log(`  Name: ${bookInfo.name}`);
    console.log(`  Status: ${bookInfo.status}`);
    console.log(`  Condition: ${bookInfo.condition}`);
  }

  // Test 2: Borrow book
  console.log("\n📖 User1 borrowing book #0...");
  const depositAmount = ethers.parseEther("0.1");
  const borrowTx = await libraryCore.connect(user1).borrowBook(0, { value: depositAmount });
  await borrowTx.wait();
  console.log("✅ Book borrowed successfully");

  // Check loan info
  const loanInfo = await libraryCore.loanInfos(0);
  console.log("\n📋 Loan Info:");
  console.log(`  Borrower: ${loanInfo.borrower}`);
  console.log(`  Deposit: ${ethers.formatEther(loanInfo.deposit)} ETH`);
  console.log(`  Due Date: ${new Date(Number(loanInfo.dueDate) * 1000).toLocaleString()}`);

  // Test 3: Return book
  console.log("\n📥 User1 returning book #0...");
  const returnTx = await libraryCore.connect(user1).returnBook(0, 0); // Status 0 = Available
  await returnTx.wait();
  console.log("✅ Book returned successfully");

  // Check reputation
  const reputation = await libraryCore.getReputation(user1.address);
  console.log(`\n⭐ User1 reputation: ${reputation}`);

  // Check book status
  const bookStatus = await bookNFT.getBookStatus(0);
  console.log(`📖 Book #0 status: ${bookStatus}`);

  console.log("\n🎉 Interaction complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Interaction failed:", error);
    process.exit(1);
  });
