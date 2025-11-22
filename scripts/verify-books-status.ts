import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Verify all books have valid status (0-3)
 */
async function main() {
    console.log("\n╔═══════════════════════════════════════════════════════════════════╗");
    console.log("║           🔍 VERIFYING BOOKS STATUS (0-3 ONLY) 🔍              ║");
    console.log("╚═══════════════════════════════════════════════════════════════════╝\n");

    // Load contract addresses
    const contractsPath = path.join(__dirname, "..", "web", "contracts.json");
    if (!fs.existsSync(contractsPath)) {
        console.error("❌ contracts.json not found! Deploy contracts first.");
        process.exit(1);
    }

    const contracts = JSON.parse(fs.readFileSync(contractsPath, "utf8"));
    console.log("✅ Loaded contract addresses");
    console.log(`   BookNFT: ${contracts.bookNFT}\n`);

    // Get BookNFT contract
    const BookNFT = await ethers.getContractAt("BookNFT", contracts.bookNFT);

    // Get total books
    const nextBookId = await BookNFT.nextBookId();
    const totalBooks = Number(nextBookId);

    console.log(`📚 Total books: ${totalBooks}\n`);

    if (totalBooks === 0) {
        console.log("⚠️  No books found! Mint some books first.\n");
        process.exit(0);
    }

    // Check each book
    let allValid = true;
    
    for (let i = 0; i < totalBooks; i++) {
        const bookInfo = await BookNFT.getBookInfo(i);
        const status = await BookNFT.getBookStatus(i);
        const condition = await BookNFT.getCondition(i);
        
        const statusNum = Number(status);
        const conditionNum = Number(condition);
        
        // Check if valid
        const statusValid = statusNum >= 0 && statusNum <= 3;
        const conditionValid = conditionNum >= 0 && conditionNum <= 3;
        
        // Status names
        const statusNames = ['Available', 'Borrowed', 'Reserved', 'Lost'];
        const conditionNames = ['New', 'Good', 'Fair', 'Poor'];
        
        const statusName = statusValid ? statusNames[statusNum] : `INVALID(${statusNum})`;
        const conditionName = conditionValid ? conditionNames[conditionNum] : `INVALID(${conditionNum})`;
        
        // Display
        const statusIcon = statusValid ? '✅' : '❌';
        const conditionIcon = conditionValid ? '✅' : '❌';
        
        console.log(`Book #${i}: ${bookInfo[0]}`);
        console.log(`  Status: ${statusNum} (${statusName}) ${statusIcon}`);
        console.log(`  Condition: ${conditionNum} (${conditionName}) ${conditionIcon}`);
        
        if (!statusValid || !conditionValid) {
            allValid = false;
            console.log(`  ❌ INVALID DATA! Need to fix!`);
        }
        
        console.log('');
    }

    console.log("═══════════════════════════════════════════════════════════════════\n");

    if (allValid) {
        console.log("✅ ALL BOOKS HAVE VALID STATUS AND CONDITION!\n");
        console.log("🎯 Ready for use!\n");
    } else {
        console.log("❌ SOME BOOKS HAVE INVALID DATA!\n");
        console.log("💡 SOLUTION:");
        console.log("   1. Delete corrupted books (admin function)");
        console.log("   2. OR reset blockchain and remint\n");
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

