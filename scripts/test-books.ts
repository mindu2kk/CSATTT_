import hre from "hardhat";
import { ethers } from "ethers";

async function main() {
  console.log("🧪 Testing Books in Contract...\n");

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const BOOK_NFT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  const BookNFTArtifact = await hre.artifacts.readArtifact("BookNFT");
  const bookNFT = new ethers.Contract(BOOK_NFT_ADDRESS, BookNFTArtifact.abi, provider);

  try {
    const nextBookId = await bookNFT.nextBookId();
    console.log("📚 Next Book ID:", nextBookId.toString());
    console.log("📚 Total books should be:", nextBookId.toString(), "\n");

    const totalBooks = Number(nextBookId);
    for (let i = 0; i < totalBooks; i++) {
      try {
        console.log(`\n📖 Loading Book #${i}...`);
        const bookInfo = await bookNFT.getBookInfo(i);
        const owner = await bookNFT.ownerOf(i);
        const status = await bookNFT.getBookStatus(i);
        
        console.log("✅ Book #" + i + ":");
        console.log("   Name:", bookInfo.name);
        console.log("   Description:", bookInfo.description);
        console.log("   Status:", status.toString(), "(0=Available, 1=Borrowed, 2=Damaged, 3=Lost, 4=Old, 5=New)");
        console.log("   Owner:", owner);
        console.log("   Created:", new Date(bookInfo.createdAt.toNumber() * 1000).toLocaleString());
      } catch (error) {
        console.error(`❌ Failed to load Book #${i}:`, error.message);
      }
    }

    console.log("\n✅ All books tested!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
