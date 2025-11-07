import hre from "hardhat";
import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

async function main() {
    console.log("🚀 Deploying contracts and updating contracts.json...\n");

    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Account 0
    const signer = new ethers.Wallet(privateKey, provider);

    console.log("👤 Deploying with account:", signer.address);
    console.log("💰 Account balance:", ethers.formatEther(await provider.getBalance(signer.address)), "ETH\n");

    // Get contract artifacts
    const BookNFTArtifact = await hre.artifacts.readArtifact("BookNFT");
    const LibraryCoreArtifact = await hre.artifacts.readArtifact("LibraryCore");

    // Deploy BookNFT
    console.log("📦 Deploying BookNFT...");
    const BookNFTFactory = new ethers.ContractFactory(BookNFTArtifact.abi, BookNFTArtifact.bytecode, signer);
    const bookNFT = await BookNFTFactory.deploy();
    await bookNFT.waitForDeployment();
    const bookNFTAddress = await bookNFT.getAddress();
    console.log("✅ BookNFT deployed to:", bookNFTAddress);

    // Deploy LibraryCore
    console.log("📦 Deploying LibraryCore...");
    const LibraryCoreFactory = new ethers.ContractFactory(LibraryCoreArtifact.abi, LibraryCoreArtifact.bytecode, signer);
    const libraryCore = await LibraryCoreFactory.deploy(bookNFTAddress);
    await libraryCore.waitForDeployment();
    const libraryCoreAddress = await libraryCore.getAddress();
    console.log("✅ LibraryCore deployed to:", libraryCoreAddress);

    // Setup authorization
    console.log("\n🔐 Setting up authorization...");
    const bookNFTConnected = new ethers.Contract(bookNFTAddress, BookNFTArtifact.abi, signer);
    await bookNFTConnected.setAuthorizedUpdater(libraryCoreAddress, true);
    console.log("✅ LibraryCore authorized to update book status");

    // Mint 3 sample books
    console.log("\n📚 Minting sample books...");
    await bookNFTConnected.mintBook("Lập Trình Blockchain", "Cẩm nang từ A-Z về smart contract!", 0);
    await bookNFTConnected.mintBook("Mastering Ethereum", "Advanced guide to building smart contracts", 0);
    await bookNFTConnected.mintBook("Solidity Programming", "Learn Solidity from scratch", 0);
    console.log("✅ Minted 3 books");

    // Update contracts.json
    const contractsJsonPath = path.join(__dirname, "..", "web", "contracts.json");
    const contractsData = {
        bookNFT: bookNFTAddress,
        libraryCore: libraryCoreAddress,
        network: "localhost",
        chainId: 31337
    };

    fs.writeFileSync(contractsJsonPath, JSON.stringify(contractsData, null, 2));
    console.log("\n✅ Updated contracts.json:");
    console.log(JSON.stringify(contractsData, null, 2));

    console.log("\n🎉 Deployment complete!");
    console.log("BookNFT Address:", bookNFTAddress);
    console.log("LibraryCore Address:", libraryCoreAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
