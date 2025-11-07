import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";

describe("Library System", async function () {
  const { viem } = await network.connect();
  
  const bookNFT = await viem.deployContract("BookNFT");
  const libraryCore = await viem.deployContract("LibraryCore", [bookNFT.address]);
  
  // Get signers
  const accounts = await viem.getWalletClients();
  const owner = accounts[0];
  const borrower = accounts[1];
  
  // Authorize LibraryCore to update book status
  await bookNFT.write.setAuthorizedUpdater([libraryCore.address, true], { account: owner.account });

  describe("BookNFT", function () {
    it("Should mint a new book", async function () {
      await bookNFT.write.mintBook(["Test Book", "This is a test book", 5], { account: owner.account });
      
      // Check book info
      const bookInfo = await bookNFT.read.getBookInfo([0n]);
      assert.equal(bookInfo.name, "Test Book");
      assert.equal(bookInfo.description, "This is a test book");
      assert.equal(Number(bookInfo.status), 5); // New
    });

    it("Should update book status", async function () {
      await bookNFT.write.updateBookStatus([0n, 4], { account: owner.account });
      
      const bookInfo = await bookNFT.read.getBookInfo([0n]);
      assert.equal(Number(bookInfo.status), 4); // Old
    });
  });

  describe("LibraryCore - Borrow & Return", function () {
    it("Should borrow a book successfully", async function () {
      // Set book to Available status
      await bookNFT.write.updateBookStatus([0n, 0], { account: owner.account });
      
      const deposit = BigInt(0.1 * 10**18);
      
      await libraryCore.write.borrowBook([0n], {
        account: borrower.account,
        value: deposit
      });
      
      // Check book status is now Borrowed
      const bookInfo = await bookNFT.read.getBookInfo([0n]);
      assert.equal(Number(bookInfo.status), 1); // Borrowed
      
      // Check loan info
      const loanInfo = await libraryCore.read.loanInfos([0n]);
      assert.equal(loanInfo[0].toLowerCase(), borrower.account.address.toLowerCase());
    });

    it("Should return a book successfully and increase reputation", async function () {
      const bookInfo = await bookNFT.read.getBookInfo([0n]);
      
      // Return in good condition (Available status)
      await libraryCore.write.returnBook([0n, 0], { account: borrower.account });
      
      // Check reputation increased
      const reputation = await libraryCore.read.userReputation([borrower.account.address]);
      assert.equal(Number(reputation), 1);
      
      // Check book status is now Available
      const finalBookInfo = await bookNFT.read.getBookInfo([0n]);
      assert.equal(Number(finalBookInfo.status), 0); // Available
    });

    it("Should apply damage penalty when returning damaged book", async function () {
      // Borrow again
      await bookNFT.write.updateBookStatus([0n, 0], { account: owner.account });
      const deposit = BigInt(0.1 * 10**18);
      await libraryCore.write.borrowBook([0n], {
        account: borrower.account,
        value: deposit
      });
      
      // Return damaged
      await libraryCore.write.returnBook([0n, 2], { account: borrower.account });
      
      // Check reputation decreased
      const reputation = await libraryCore.read.userReputation([borrower.account.address]);
      assert.equal(Number(reputation), -4); // Was 1, now -5
    });
  });
});
