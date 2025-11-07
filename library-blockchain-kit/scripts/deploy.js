const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const BookNFT = await ethers.getContractFactory("BookNFT");
  const book = await BookNFT.deploy("ipfs://BOOK_METADATA_BASE/");
  await book.deployed();

  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  const stable = await ERC20Mock.deploy("MockUSD", "mUSD");
  await stable.deployed();

  const Escrow = await ethers.getContractFactory("EscrowVault");
  const vault = await Escrow.deploy();
  await vault.deployed();

  const LibraryCore = await ethers.getContractFactory("LibraryCore");
  const core = await LibraryCore.deploy(book.address, stable.address, vault.address, deployer.address);
  await core.deployed();

  const SigQR = await ethers.getContractFactory("SigQRVerifier");
  const sig = await SigQR.deploy(deployer.address);
  await sig.deployed();

  // set core in vault
  await (await vault.setCore(core.address)).wait();

  console.log("BookNFT:", book.address);
  console.log("Stable (ERC20Mock):", stable.address);
  console.log("EscrowVault:", vault.address);
  console.log("LibraryCore:", core.address);
  console.log("SigQRVerifier:", sig.address);

  // Mint an example book token to deployer (library custody)
  await (await book.mint(deployer.address, 1, 1)).wait(); // tokenId 1, Condition.GOOD
  console.log("Minted BookNFT #1 to", deployer.address);
}

main().catch((e) => { console.error(e); process.exit(1); });
