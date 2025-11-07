// Deploy script for BookNFT and LibraryCore
const { ethers } = require("hardhat");

async function main() {
  // Deploy BookNFT
  const BookNFT = await ethers.getContractFactory("BookNFT");
  const bookNFT = await BookNFT.deploy();
  await bookNFT.deployed();
  console.log("BookNFT deployed to:", bookNFT.address);

  // Deploy LibraryCore with BookNFT address as constructor param
  const LibraryCore = await ethers.getContractFactory("LibraryCore");
  const libraryCore = await LibraryCore.deploy(bookNFT.address);
  await libraryCore.deployed();
  console.log("LibraryCore deployed to:", libraryCore.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
