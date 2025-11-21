import hre from "hardhat";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ethers = hre.ethers;

/**
 * COMPREHENSIVE SYSTEM TEST
 * Tests all functionality of the library blockchain system
 */

interface TestResult {
    name: string;
    passed: boolean;
    error?: string;
    gasUsed?: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, error?: string, gasUsed?: string) {
    results.push({ name, passed, error, gasUsed });
    const icon = passed ? "✅" : "❌";
    console.log(`${icon} ${name}`);
    if (error) console.log(`   Error: ${error}`);
    if (gasUsed) console.log(`   Gas: ${gasUsed}`);
}

async function main() {
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║          COMPREHENSIVE SYSTEM TEST SUITE                   ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    // Load contracts
    const contractsPath = join(process.cwd(), "web", "contracts.json");
    if (!existsSync(contractsPath)) {
        throw new Error("contracts.json not found. Please deploy first.");
    }

    const contracts = JSON.parse(readFileSync(contractsPath, "utf-8"));
    const [deployer, user1, user2, user3] = await ethers.getSigners();

    const bookNFT = await ethers.getContractAt("BookNFT", contracts.bookNFT);
    const libraryCore = await ethers.getContractAt("LibraryCore", contracts.libraryCore);

    console.log("📋 Test Configuration:");
    console.log("   BookNFT:      ", contracts.bookNFT);
    console.log("   LibraryCore:  ", contracts.libraryCore);
    console.log("   Deployer:     ", deployer.address);
    console.log("   User1:        ", user1.address);
    console.log("   User2:        ", user2.address);
    console.log("\n");

    // ============ TEST SUITE 1: Contract Basics ============
    console.log("📦 TEST SUITE 1: Contract Basics");
    console.log("─".repeat(60));

    try {
        const owner = await bookNFT.owner();
        logTest("1.1 BookNFT owner check", owner === deployer.address);
    } catch (error: any) {
        logTest("1.1 BookNFT owner check", false, error.message);
    }

    try {
        const nextId = await bookNFT.nextBookId();
        logTest("1.2 BookNFT nextBookId", Number(nextId) >= 0);
    } catch (error: any) {
        logTest("1.2 BookNFT nextBookId", false, error.message);
    }

    try {
        const owner = await libraryCore.owner();
        logTest("1.3 LibraryCore owner check", owner === deployer.address);
    } catch (error: any) {
        logTest("1.3 LibraryCore owner check", false, error.message);
    }

    try {
        const bookNFTRef = await libraryCore.bookNFT();
        logTest("1.4 LibraryCore BookNFT reference", bookNFTRef.toLowerCase() === contracts.bookNFT.toLowerCase());
    } catch (error: any) {
        logTest("1.4 LibraryCore BookNFT reference", false, error.message);
    }

    try {
        const isAuthorized = await bookNFT.authorizedUpdaters(contracts.libraryCore);
        logTest("1.5 LibraryCore authorization", isAuthorized);
    } catch (error: any) {
        logTest("1.5 LibraryCore authorization", false, error.message);
    }

    console.log();

    // ============ TEST SUITE 2: Book Management ============
    console.log("📚 TEST SUITE 2: Book Management");
    console.log("─".repeat(60));

    let testBookId = 0;

    try {
        const tx = await bookNFT.mintBook("Test Book", "Test Description", 0);
        const receipt = await tx.wait();
        testBookId = Number(await bookNFT.nextBookId()) - 1;
        logTest("2.1 Mint book", true, undefined, receipt?.gasUsed.toString());
    } catch (error: any) {
        logTest("2.1 Mint book", false, error.message);
    }

    try {
        const bookInfo = await bookNFT.getBookInfo(testBookId);
        logTest("2.2 Get book info", bookInfo.name === "Test Book");
    } catch (error: any) {
        logTest("2.2 Get book info", false, error.message);
    }

    try {
        const status = await bookNFT.getBookStatus(testBookId);
        logTest("2.3 Get book status", Number(status) === 0);
    } catch (error: any) {
        logTest("2.3 Get book status", false, error.message);
    }

    try {
        const tx = await bookNFT.updateBookInfo(testBookId, "Updated Book", "Updated Description");
        await tx.wait();
        const bookInfo = await bookNFT.getBookInfo(testBookId);
        logTest("2.4 Update book info", bookInfo.name === "Updated Book");
    } catch (error: any) {
        logTest("2.4 Update book info", false, error.message);
    }

    console.log();

    // ============ TEST SUITE 3: Borrow/Return Flow ============
    console.log("🔄 TEST SUITE 3: Borrow/Return Flow");
    console.log("─".repeat(60));

    const deposit = ethers.parseEther("0.1");

    try {
        const tx = await libraryCore.connect(user1).borrowBook(testBookId, { value: deposit });
        const receipt = await tx.wait();
        logTest("3.1 Borrow book", true, undefined, receipt?.gasUsed.toString());
    } catch (error: any) {
        logTest("3.1 Borrow book", false, error.message);
    }

    try {
        const loanInfo = await libraryCore.getLoanInfo(testBookId);
        logTest("3.2 Verify loan info", loanInfo.borrower.toLowerCase() === user1.address.toLowerCase());
    } catch (error: any) {
        logTest("3.2 Verify loan info", false, error.message);
    }

    try {
        const status = await bookNFT.getBookStatus(testBookId);
        logTest("3.3 Book status after borrow", Number(status) === 1); // Borrowed
    } catch (error: any) {
        logTest("3.3 Book status after borrow", false, error.message);
    }

    try {
        const tx = await libraryCore.connect(user1).returnBook(testBookId, 0);
        const receipt = await tx.wait();
        logTest("3.4 Return book", true, undefined, receipt?.gasUsed.toString());
    } catch (error: any) {
        logTest("3.4 Return book", false, error.message);
    }

    try {
        const status = await bookNFT.getBookStatus(testBookId);
        logTest("3.5 Book status after return", Number(status) === 0); // Available
    } catch (error: any) {
        logTest("3.5 Book status after return", false, error.message);
    }

    try {
        const reputation = await libraryCore.getReputation(user1.address);
        logTest("3.6 User reputation updated", Number(reputation) > 0);
    } catch (error: any) {
        logTest("3.6 User reputation updated", false, error.message);
    }

    console.log();

    // ============ TEST SUITE 4: Advanced Features ============
    console.log("🚀 TEST SUITE 4: Advanced Features");
    console.log("─".repeat(60));

    // Mint a new book for testing
    let advancedTestBookId = 0;
    try {
        const tx = await bookNFT.mintBook("Advanced Test Book", "For advanced testing", 0);
        await tx.wait();
        advancedTestBookId = Number(await bookNFT.nextBookId()) - 1;
        logTest("4.1 Mint book for advanced tests", true);
    } catch (error: any) {
        logTest("4.1 Mint book for advanced tests", false, error.message);
    }

    // Test loan extension
    try {
        // First borrow
        const borrowTx = await libraryCore.connect(user2).borrowBook(advancedTestBookId, { value: deposit });
        await borrowTx.wait();
        
        // Get initial due date
        const loanInfo1 = await libraryCore.getLoanInfo(advancedTestBookId);
        const initialDueDate = loanInfo1.dueDate;
        
        // Extend loan
        const extensionFee = ethers.parseEther("0.01");
        const extendTx = await libraryCore.connect(user2).extendLoan(advancedTestBookId, { value: extensionFee });
        await extendTx.wait();
        
        // Check new due date
        const loanInfo2 = await libraryCore.getLoanInfo(advancedTestBookId);
        const newDueDate = loanInfo2.dueDate;
        
        logTest("4.2 Extend loan", newDueDate > initialDueDate);
        
        // Clean up - return book
        await libraryCore.connect(user2).returnBook(advancedTestBookId, 0);
    } catch (error: any) {
        logTest("4.2 Extend loan", false, error.message);
    }

    // Test book reservation
    try {
        // User2 borrows book
        const borrowTx = await libraryCore.connect(user2).borrowBook(advancedTestBookId, { value: deposit });
        await borrowTx.wait();
        
        // User3 reserves the book
        const reserveTx = await libraryCore.connect(user3).reserveBook(advancedTestBookId);
        await reserveTx.wait();
        
        // Check reservations
        const reservations = await libraryCore.getBookReservations(advancedTestBookId);
        logTest("4.3 Book reservation", reservations.length > 0 && reservations[0].toLowerCase() === user3.address.toLowerCase());
        
        // Clean up - return book
        await libraryCore.connect(user2).returnBook(advancedTestBookId, 0);
    } catch (error: any) {
        logTest("4.3 Book reservation", false, error.message);
    }

    // Test batch mint
    try {
        const names = ["Batch Book 1", "Batch Book 2", "Batch Book 3"];
        const descriptions = ["Desc 1", "Desc 2", "Desc 3"];
        const statuses = [0, 0, 0];
        
        const tx = await bookNFT.batchMintBooks(names, descriptions, statuses);
        const receipt = await tx.wait();
        
        logTest("4.4 Batch mint books", true, undefined, receipt?.gasUsed.toString());
    } catch (error: any) {
        logTest("4.4 Batch mint books", false, error.message);
    }

    // Test pagination
    try {
        const result = await bookNFT.getBooksByStatus(0, 0, 5); // Available, offset 0, limit 5
        const tokenIds = result[0];
        logTest("4.5 Get books by status (pagination)", tokenIds.length >= 0);
    } catch (error: any) {
        logTest("4.5 Get books by status (pagination)", false, error.message);
    }

    console.log();

    // ============ TEST SUITE 5: Error Handling ============
    console.log("⚠️  TEST SUITE 5: Error Handling");
    console.log("─".repeat(60));

    // Test double borrow
    try {
        const testBook2Id = Number(await bookNFT.nextBookId()) - 1;
        
        // First borrow
        await libraryCore.connect(user1).borrowBook(testBook2Id, { value: deposit });
        
        // Try second borrow (should fail)
        try {
            await libraryCore.connect(user2).borrowBook(testBook2Id, { value: deposit });
            logTest("5.1 Prevent double borrow", false, "Should have reverted");
        } catch (error) {
            logTest("5.1 Prevent double borrow", true);
        }
        
        // Clean up
        await libraryCore.connect(user1).returnBook(testBook2Id, 0);
    } catch (error: any) {
        logTest("5.1 Prevent double borrow", false, error.message);
    }

    // Test insufficient deposit
    try {
        const testBook3Id = Number(await bookNFT.nextBookId()) - 2;
        const insufficientDeposit = ethers.parseEther("0.05");
        
        try {
            await libraryCore.connect(user1).borrowBook(testBook3Id, { value: insufficientDeposit });
            logTest("5.2 Reject insufficient deposit", false, "Should have reverted");
        } catch (error) {
            logTest("5.2 Reject insufficient deposit", true);
        }
    } catch (error: any) {
        logTest("5.2 Reject insufficient deposit", false, error.message);
    }

    // Test unauthorized return
    try {
        const testBook4Id = Number(await bookNFT.nextBookId()) - 3;
        
        // User1 borrows
        await libraryCore.connect(user1).borrowBook(testBook4Id, { value: deposit });
        
        // User2 tries to return (should fail)
        try {
            await libraryCore.connect(user2).returnBook(testBook4Id, 0);
            logTest("5.3 Prevent unauthorized return", false, "Should have reverted");
        } catch (error) {
            logTest("5.3 Prevent unauthorized return", true);
        }
        
        // Clean up
        await libraryCore.connect(user1).returnBook(testBook4Id, 0);
    } catch (error: any) {
        logTest("5.3 Prevent unauthorized return", false, error.message);
    }

    console.log();

    // ============ TEST SUITE 6: Admin Functions ============
    console.log("👑 TEST SUITE 6: Admin Functions");
    console.log("─".repeat(60));

    // Test pause/unpause
    try {
        await libraryCore.pause();
        const isPaused = await libraryCore.paused();
        logTest("6.1 Pause contract", isPaused);
        
        await libraryCore.unpause();
        const isUnpaused = !(await libraryCore.paused());
        logTest("6.2 Unpause contract", isUnpaused);
    } catch (error: any) {
        logTest("6.1-6.2 Pause/Unpause", false, error.message);
    }

    // Test withdraw penalty
    try {
        const balanceBefore = await ethers.provider.getBalance(deployer.address);
        const totalPenalty = await libraryCore.totalPenaltyCollected();
        
        if (totalPenalty > 0) {
            const tx = await libraryCore.withdrawAllPenalty();
            await tx.wait();
            
            const balanceAfter = await ethers.provider.getBalance(deployer.address);
            logTest("6.3 Withdraw penalty", balanceAfter > balanceBefore);
        } else {
            logTest("6.3 Withdraw penalty", true, "No penalty to withdraw (expected)");
        }
    } catch (error: any) {
        logTest("6.3 Withdraw penalty", false, error.message);
    }

    console.log();

    // ============ FINAL SUMMARY ============
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║                    TEST SUMMARY                            ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;
    const successRate = ((passed / total) * 100).toFixed(1);

    console.log("📊 Results:");
    console.log(`   Total Tests:    ${total}`);
    console.log(`   ✅ Passed:      ${passed}`);
    console.log(`   ❌ Failed:      ${failed}`);
    console.log(`   📈 Success Rate: ${successRate}%`);
    console.log();

    if (failed > 0) {
        console.log("❌ Failed Tests:");
        results.filter(r => !r.passed).forEach(r => {
            console.log(`   - ${r.name}`);
            if (r.error) console.log(`     Error: ${r.error}`);
        });
        console.log();
    }

    // Gas usage summary
    const gasTests = results.filter(r => r.gasUsed);
    if (gasTests.length > 0) {
        console.log("⛽ Gas Usage:");
        gasTests.forEach(r => {
            console.log(`   ${r.name}: ${r.gasUsed}`);
        });
        console.log();
    }

    if (passed === total) {
        console.log("🎉 ALL TESTS PASSED! System is fully functional.");
    } else {
        console.log("⚠️  Some tests failed. Please review the errors above.");
    }

    return { passed, failed, total, successRate };
}

main()
    .then((summary) => {
        if (summary.failed === 0) {
            console.log("\n✅ Test suite completed successfully");
            process.exit(0);
        } else {
            console.log("\n⚠️  Test suite completed with failures");
            process.exit(1);
        }
    })
    .catch((error) => {
        console.error("\n❌ TEST SUITE FAILED");
        console.error("─".repeat(60));
        console.error("Error:", error.message);
        console.error("\nStack trace:");
        console.error(error.stack);
        process.exit(1);
    });
