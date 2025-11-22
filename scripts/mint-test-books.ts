import hre from "hardhat";
import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Mint test books with VALID status and condition
 * Status: 0 = Available (ONLY valid status for new books)
 * Condition: 0 = New, 1 = Good, 2 = Fair, 3 = Poor
 */
async function main() {
    console.log("\n╔═══════════════════════════════════════════════════════════════════╗");
    console.log("║          📚 MINTING TEST BOOKS WITH VALID DATA 📚              ║");
    console.log("╚═══════════════════════════════════════════════════════════════════╝\n");

    // Load contract addresses
    const contractsPath = path.join(__dirname, "..", "web", "contracts.json");
    if (!fs.existsSync(contractsPath)) {
        throw new Error("contracts.json not found! Deploy contracts first.");
    }

    const contracts = JSON.parse(fs.readFileSync(contractsPath, "utf8"));
    console.log("✅ Loaded contract addresses");
    console.log(`   BookNFT: ${contracts.bookNFT}`);
    console.log(`   LibraryCore: ${contracts.libraryCore}\n`);

    // Get signer (default account)
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Minting with account: ${deployer.address}\n`);

    // Get BookNFT contract
    const BookNFT = await ethers.getContractAt("BookNFT", contracts.bookNFT);

    // Test books with VALID status (0) and condition (0-1)
    const testBooks = [
        {
            name: "Blockchain Programming",
            description: "Learn blockchain development | Author: Andreas M. Antonopoulos",
            status: 0,  // ✅ Available
            condition: 0,  // ✅ New
            priceEth: "0.01"
        },
        {
            name: "Smart Contracts",
            description: "Master Solidity and smart contracts | Author: Vitalik Buterin",
            status: 0,  // ✅ Available
            condition: 1,  // ✅ Good
            priceEth: "0.02"
        },
        {
            name: "DeFi Development",
            description: "Build decentralized finance applications | Author: Satoshi Nakamoto",
            status: 0,  // ✅ Available
            condition: 0,  // ✅ New
            priceEth: "0.03"
        },
        {
            name: "Chí Phèo",
            description: "Truyện ngắn Việt Nam | Author: Nam Cao",
            status: 0,  // ✅ Available
            condition: 1,  // ✅ Good
            priceEth: "0.015"
        }
    ];

    console.log("📋 Minting books...\n");

    for (let i = 0; i < testBooks.length; i++) {
        const book = testBooks[i];
        
        console.log(`📖 Book #${i}:`);
        console.log(`   Name: ${book.name}`);
        console.log(`   Status: ${book.status} (Available) ✅`);
        console.log(`   Condition: ${book.condition} (${book.condition === 0 ? 'New' : 'Good'}) ✅`);
        console.log(`   Price: ${book.priceEth} ETH`);

        try {
            const tx = await BookNFT.mintBookWithCondition(
                book.name,
                book.description,
                book.status,
                book.condition
            );

            console.log(`   Transaction: ${tx.hash}`);
            await tx.wait();
            console.log(`   ✅ Minted successfully!\n`);

        } catch (error: any) {
            console.error(`   ❌ Failed to mint: ${error.message}\n`);
        }
    }

    console.log("╔═══════════════════════════════════════════════════════════════════╗");
    console.log("║                    ✅ ALL BOOKS MINTED! ✅                       ║");
    console.log("╚═══════════════════════════════════════════════════════════════════╝\n");

    // Verify books
    console.log("🔍 Verifying minted books...\n");
    const nextBookId = await BookNFT.nextBookId();
    console.log(`Total books: ${nextBookId.toString()}\n`);

    for (let i = 0; i < nextBookId.toNumber(); i++) {
        const bookInfo = await BookNFT.getBookInfo(i);
        const status = await BookNFT.getBookStatus(i);
        const condition = await BookNFT.getCondition(i);

        console.log(`Book #${i}: ${bookInfo[0]}`);
        console.log(`  Status: ${status} (${status == 0 ? '✅ Available' : status == 1 ? 'Borrowed' : status == 2 ? 'Reserved' : status == 3 ? 'Lost' : '❌ INVALID'})`);
        console.log(`  Condition: ${condition} (${condition == 0 ? '✅ New' : condition == 1 ? '✅ Good' : condition == 2 ? '⚠️ Fair' : condition == 3 ? '⚠️ Poor' : '❌ INVALID'})\n`);
    }

    console.log("═══════════════════════════════════════════════════════════════════\n");
    console.log("🎯 NEXT STEPS:\n");
    console.log("1. Reset MetaMask:");
    console.log("   Settings → Advanced → Reset Account\n");
    console.log("2. Refresh browser (Ctrl+Shift+R)\n");
    console.log("3. Reconnect MetaMask\n");
    console.log("4. Test the website!\n");
    console.log("═══════════════════════════════════════════════════════════════════\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

