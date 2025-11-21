// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BookNFT.minimal.sol";

/**
 * MINIMAL LibraryCore - Chỉ borrow và return
 * Không có reputation, escrow, hay features phức tạp
 */
contract LibraryCoreMinimal {
    BookNFTMinimal public bookNFT;
    uint256 public constant DEPOSIT_AMOUNT = 0.01 ether;
    
    struct LoanInfo {
        address borrower;
        uint256 borrowTime;
        uint256 deposit;
    }
    
    mapping(uint256 => LoanInfo) public loanInfos;
    
    event BookBorrowed(uint256 indexed bookId, address indexed borrower, uint256 deposit);
    event BookReturned(uint256 indexed bookId, address indexed borrower);
    
    constructor(address _bookNFT) {
        bookNFT = BookNFTMinimal(_bookNFT);
    }
    
    function addBook(
        string memory name,
        string memory author
    ) external returns (uint256) {
        return bookNFT.addBook(name, author);
    }
    
    function borrowBook(uint256 bookId) external payable {
        require(bookId < bookNFT.nextBookId(), "Book does not exist");
        require(msg.value >= DEPOSIT_AMOUNT, "Insufficient deposit");
        require(
            bookNFT.getBookStatus(bookId) == BookNFTMinimal.BookStatus.Available,
            "Book not available"
        );
        
        // Update status
        bookNFT.setBookStatus(bookId, BookNFTMinimal.BookStatus.Borrowed);
        
        // Record loan
        loanInfos[bookId] = LoanInfo({
            borrower: msg.sender,
            borrowTime: block.timestamp,
            deposit: msg.value
        });
        
        emit BookBorrowed(bookId, msg.sender, msg.value);
    }
    
    function returnBook(uint256 bookId) external {
        LoanInfo memory loan = loanInfos[bookId];
        require(loan.borrower == msg.sender, "Not the borrower");
        
        // Update status
        bookNFT.setBookStatus(bookId, BookNFTMinimal.BookStatus.Available);
        
        // Return deposit
        uint256 depositToReturn = loan.deposit;
        delete loanInfos[bookId];
        
        payable(msg.sender).transfer(depositToReturn);
        
        emit BookReturned(bookId, msg.sender);
    }
    
    function getLoanInfo(uint256 bookId) external view returns (
        address borrower,
        uint256 borrowTime,
        uint256 deposit
    ) {
        LoanInfo memory loan = loanInfos[bookId];
        return (loan.borrower, loan.borrowTime, loan.deposit);
    }
}
