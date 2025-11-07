// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BookNFT is ERC721, Ownable {
    enum BookStatus { Available, Borrowed, Damaged, Lost, Old, New }
    enum Condition { New, Good, Fair, Poor }

    struct BookInfo {
        string name;
        string description;
        BookStatus status;
        Condition condition;
        uint256 createdAt;
    }

    uint256 public nextBookId;
    mapping(uint256 => BookInfo) public bookInfos;
    mapping(address => bool) public authorizedUpdaters;

    event BookMinted(uint256 indexed tokenId, string name, BookStatus status, Condition condition);
    event BookStatusUpdated(uint256 indexed tokenId, BookStatus oldStatus, BookStatus newStatus);
    event ConditionUpdated(uint256 indexed tokenId, Condition oldCondition, Condition newCondition);

    constructor() ERC721("BookNFT", "BOOK") Ownable(msg.sender) {}

    modifier onlyAuthorized() {
        require(msg.sender == owner() || authorizedUpdaters[msg.sender], "Not authorized");
        _;
    }

    function setAuthorizedUpdater(address updater, bool authorized) public onlyOwner {
        authorizedUpdaters[updater] = authorized;
    }

    function mintBook(string memory name, string memory description, BookStatus status) public onlyOwner returns (uint256) {
        return mintBookWithCondition(name, description, status, Condition.New);
    }

    function mintBookWithCondition(string memory name, string memory description, BookStatus status, Condition condition) public onlyOwner returns (uint256) {
        uint256 tokenId = nextBookId++;
        _mint(msg.sender, tokenId);
        bookInfos[tokenId] = BookInfo(name, description, status, condition, block.timestamp);
        emit BookMinted(tokenId, name, status, condition);
        return tokenId;
    }

    function updateBookStatus(uint256 tokenId, BookStatus newStatus) public onlyAuthorized {
        BookStatus oldStatus = bookInfos[tokenId].status;
        bookInfos[tokenId].status = newStatus;
        emit BookStatusUpdated(tokenId, oldStatus, newStatus);
    }

    function updateCondition(uint256 tokenId, Condition newCondition) public onlyAuthorized {
        require(ownerOf(tokenId) != address(0), "Book does not exist");
        Condition oldCondition = bookInfos[tokenId].condition;
        bookInfos[tokenId].condition = newCondition;
        emit ConditionUpdated(tokenId, oldCondition, newCondition);
    }

    function getCondition(uint256 tokenId) external view returns (Condition) {
        require(ownerOf(tokenId) != address(0), "Book does not exist");
        return bookInfos[tokenId].condition;
    }

    function getBookInfo(uint256 tokenId) external view returns (BookInfo memory) {
        require(ownerOf(tokenId) != address(0), "Book does not exist");
        return bookInfos[tokenId];
    }

    function getBookStatus(uint256 tokenId) external view returns (BookStatus) {
        require(ownerOf(tokenId) != address(0), "Book does not exist");
        return bookInfos[tokenId].status;
    }
}
