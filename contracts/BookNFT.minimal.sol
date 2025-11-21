// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * MINIMAL BookNFT - Chỉ giữ features cơ bản nhất
 * Để test và debug dễ dàng
 */
contract BookNFTMinimal {
    uint256 public nextBookId;
    
    enum BookStatus { Available, Borrowed }
    
    struct Book {
        string name;
        string author;
        BookStatus status;
    }
    
    mapping(uint256 => Book) public books;
    address public libraryCore;
    
    event BookAdded(uint256 indexed bookId, string name, string author);
    event BookStatusChanged(uint256 indexed bookId, BookStatus status);
    
    modifier onlyLibraryCore() {
        require(msg.sender == libraryCore, "Only LibraryCore can call");
        _;
    }
    
    function setLibraryCore(address _libraryCore) external {
        require(libraryCore == address(0), "LibraryCore already set");
        libraryCore = _libraryCore;
    }
    
    function addBook(
        string memory name,
        string memory author
    ) external onlyLibraryCore returns (uint256) {
        uint256 bookId = nextBookId++;
        books[bookId] = Book(name, author, BookStatus.Available);
        emit BookAdded(bookId, name, author);
        return bookId;
    }
    
    function getBookStatus(uint256 bookId) external view returns (BookStatus) {
        require(bookId < nextBookId, "Book does not exist");
        return books[bookId].status;
    }
    
    function setBookStatus(uint256 bookId, BookStatus status) external onlyLibraryCore {
        require(bookId < nextBookId, "Book does not exist");
        books[bookId].status = status;
        emit BookStatusChanged(bookId, status);
    }
    
    function getBook(uint256 bookId) external view returns (
        string memory name,
        string memory author,
        BookStatus status
    ) {
        require(bookId < nextBookId, "Book does not exist");
        Book memory book = books[bookId];
        return (book.name, book.author, book.status);
    }
}
