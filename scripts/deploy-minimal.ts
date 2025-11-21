import hre from "hardhat";
import { writeFileSync } from "fs";

async function main() {
    console.log("\n" + "=".repeat(60));
    console.log("🚀 MINIMAL DEPLOYMENT - Clean Start");
    console.log("=".repeat(60) + "\n");
    
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Deployer:", deployer.address);
    console.log("💰 Balance:", hre.ethers.formatEther(await deployer.getBalance()), "ETH\n");
    
    // Deploy BookNFT
    console.log("📚 Deploying BookNFTMinimal...");
    const BookNFT = await hre.ethers.getContractFactory("BookNFTMinimal");
    const bookNFT = await BookNFT.deploy();
    await bookNFT.deployed();
    console.log("   ✅ BookNFT:", bookNFT.address);
    
    // Deploy LibraryCore
    console.log("\n📖 Deploying LibraryCoreMinimal...");
    const LibraryCore = await hre.ethers.getContractFactory("LibraryCoreMinimal");
    const libraryCore = await LibraryCore.deploy(bookNFT.address);
    await libraryCore.deployed();
    console.log("   ✅ LibraryCore:", libraryCore.address);
    
    // Authorize
    console.log("\n🔐 Authorizing LibraryCore...");
    const authTx = await bookNFT.setLibraryCore(libraryCore.address);
    await authTx.wait();
    console.log("   ✅ Authorized");
    
    // Add test books
    console.log("\n📚 Adding test books...");
    const books = [
        { name: "The Great Gatsby", author: "F. Scott Fitzgerald" },
        { name: "To Kill a Mockingbird", author: "Harper Lee" },
        { name: "1984", author: "George Orwell" }
    ];
    
    for (let i = 0; i < books.length; i++) {
        const tx = await libraryCore.addBook(books[i].name, books[i].author);
        await tx.wait();
        console.log(`   ✅ Book ${i}: ${books[i].name}`);
    }
    
    // Verify
    console.log("\n🔍 Verifying deployment...");
    const nextBookId = await bookNFT.nextBookId();
    console.log("   📊 Total books:", nextBookId.toString());
    
    const book0 = await bookNFT.getBook(0);
    console.log("   📖 Book 0:", book0[0], "by", book0[1]);
    console.log("   📊 Status:", book0[2] === 0 ? "Available" : "Borrowed");
    
    // Save contracts info
    const contracts = {
        chainId: 31337,
        bookNFT: bookNFT.address,
        libraryCore: libraryCore.address,
        deployedAt: new Date().toISOString(),
        blockNumber: await hre.ethers.provider.getBlockNumber()
    };
    
    writeFileSync("web/contracts.json", JSON.stringify(contracts, null, 2));
    console.log("\n💾 Saved to: web/contracts.json");
    
    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("✅ DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));
    console.log("\n📋 Contract Addresses:");
    console.log("   BookNFT:     ", bookNFT.address);
    console.log("   LibraryCore: ", libraryCore.address);
    console.log("\n📊 Stats:");
    console.log("   Books:       ", nextBookId.toString());
    console.log("   Block:       ", contracts.blockNumber);
    console.log("\n🎯 Next Steps:");
    console.log("   1. Open web/minimal.html in browser");
    console.log("   2. Click 'Check Block' - should show low number");
    console.log("   3. Click 'Connect' to connect MetaMask");
    console.log("   4. Click 'Borrow Book 0' to test");
    console.log("\n💡 If you see 'invalid block tag' error:");
    console.log("   → MetaMask cache issue");
    console.log("   → Remove and re-add Localhost network");
    console.log("   → Or run: NUCLEAR_RESET.bat");
    console.log("\n" + "=".repeat(60) + "\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Deployment failed:", error);
        process.exit(1);
    });
