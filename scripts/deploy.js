import { ethers } from "hardhat";

async function main() {
  const BookNFT = await ethers.getContractFactory("BookNFT");
  const bookNFT = await BookNFT.deploy();
  await bookNFT.deployed();
  console.log("BookNFT deployed to:", bookNFT.address);

  const LibraryCore = await ethers.getContractFactory("LibraryCore");
  const libraryCore = await LibraryCore.deploy(bookNFT.address);
  await libraryCore.deployed();
  console.log("LibraryCore deployed to:", libraryCore.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});