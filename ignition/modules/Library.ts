import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LibraryModule = buildModule("LibraryModule", (m) => {
  const bookNFT = m.contract("BookNFT");
  const escrowVault = m.contract("EscrowVault");
  const libraryCore = m.contract("LibraryCore", [bookNFT, escrowVault]);
  
  // Setup EscrowVault: set LibraryCore as the only authorized caller
  m.call(escrowVault, "setCore", [libraryCore], { id: "setEscrowCore" });
  
  // Authorize LibraryCore to update book status
  m.call(bookNFT, "setAuthorizedUpdater", [libraryCore, true], { id: "authorizeLibraryCore" });
  
  // Mint 3 sách mẫu để demo
  // Status: 0=Available, 1=Borrowed, 2=Damaged, 3=Lost, 4=Old, 5=New
  // Condition: 0=New, 1=Good, 2=Fair, 3=Poor (default to New)
  m.call(bookNFT, "mintBook", ["Lập Trình Blockchain", "Cẩm nang từ A-Z về smart contract!", 0], { id: "mintBook1" });
  m.call(bookNFT, "mintBook", ["Mastering Ethereum", "Advanced guide to building smart contracts", 0], { id: "mintBook2" });
  m.call(bookNFT, "mintBook", ["Solidity Programming", "Learn Solidity from scratch", 0], { id: "mintBook3" });
  
  return { bookNFT, libraryCore, escrowVault };
});

export default LibraryModule;
