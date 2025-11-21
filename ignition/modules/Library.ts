import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LibraryModule = buildModule("LibraryModule", (m) => {
  // Deploy BookNFT
  const bookNFT = m.contract("BookNFT");
  
  // Deploy LibraryCore (chỉ cần BookNFT address)
  const libraryCore = m.contract("LibraryCore", [bookNFT]);
  
  // Authorize LibraryCore to update book status
  m.call(bookNFT, "setAuthorizedUpdater", [libraryCore, true], { id: "authorizeLibraryCore" });
  
  // Mint 3 sách mẫu để demo
  // Status: 0=Available, 1=Borrowed, 2=Damaged, 3=Lost, 4=Old, 5=New
  m.call(bookNFT, "mintBook", ["Blockchain Programming", "Complete guide to blockchain development", 5], { id: "mintBook1" });
  m.call(bookNFT, "mintBook", ["Smart Contracts", "Learn Solidity and smart contract development", 5], { id: "mintBook2" });
  m.call(bookNFT, "mintBook", ["DeFi Development", "Build decentralized finance applications", 5], { id: "mintBook3" });
  
  return { bookNFT, libraryCore };
});

export default LibraryModule;
