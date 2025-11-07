// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IBookNFT {
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface IERC20Like {
    function transferFrom(address, address, uint256) external returns (bool);
    function transfer(address, uint256) external returns (bool);
}

interface IEscrow {
    function lock(address token, address user, uint256 bookId, uint256 amt) external;
    function release(address token, address to, uint256 bookId, uint256 amt) external;
}

contract LibraryCore is AccessControl, ReentrancyGuard {
    bytes32 public constant LIBRARIAN = keccak256("LIBRARIAN");
    bytes32 public constant PAUSER = keccak256("PAUSER");

    enum Status { AVAILABLE, BORROWED }

    struct Loan {
        address user;
        uint64 borrowAt;
        uint64 dueAt;
        uint256 deposit;
    }

    IBookNFT public immutable book;
    IERC20Like public immutable stable; // e.g., USDC or BKC
    IEscrow public immutable vault;

    mapping(uint256 => Status) public statusOf;
    mapping(uint256 => Loan) public loanOf;
    mapping(address => uint32) public reputation; // 0..100

    uint256 public baseDeposit = 50e6; // 50 USDC
    uint256 public dailyLateFee = 2e6; // 2 USDC/day
    bool public paused = false;

    event Borrowed(address indexed user, uint256 indexed bookId, uint64 dueAt, uint256 deposit);
    event Returned(address indexed user, uint256 indexed bookId, uint256 refund, uint256 fee, bytes32 notesHash);
    event ReputationChanged(address indexed user, uint32 newScore);

    error NotAvailable();
    error NotBorrower();
    error Paused();

    constructor(address _book, address _stable, address _vault, address admin) {
        book = IBookNFT(_book);
        stable = IERC20Like(_stable);
        vault = IEscrow(_vault);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(LIBRARIAN, admin);
        _grantRole(PAUSER, admin);
    }

    modifier whenNotPaused() { if (paused) revert Paused(); _; }

    function setParams(uint256 _baseDeposit, uint256 _dailyLateFee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        baseDeposit = _baseDeposit;
        dailyLateFee = _dailyLateFee;
    }

    function setPaused(bool p) external onlyRole(PAUSER) { paused = p; }

    function borrow(uint256 bookId, uint32 days_) external whenNotPaused nonReentrant {
        if (statusOf[bookId] != Status.AVAILABLE) revert NotAvailable();

        uint256 deposit = _calcDeposit(msg.sender);
        vault.lock(address(stable), msg.sender, bookId, deposit);

        statusOf[bookId] = Status.BORROWED;
        loanOf[bookId] = Loan(msg.sender, uint64(block.timestamp), uint64(block.timestamp + days_ * 1 days), deposit);

        emit Borrowed(msg.sender, bookId, loanOf[bookId].dueAt, deposit);
    }

    function returnBook(uint256 bookId, bool damaged, uint16 damagePercent, bytes32 notesHash) external whenNotPaused nonReentrant {
        Loan memory L = loanOf[bookId];
        if (L.user != msg.sender) revert NotBorrower();

        uint256 fee = 0;
        if (block.timestamp > L.dueAt) {
            uint256 daysLate = (block.timestamp - L.dueAt) / 1 days + 1;
            fee += daysLate * dailyLateFee;
            _decreaseRep(msg.sender, 5);
        } else {
            _increaseRep(msg.sender, 3);
        }
        if (damaged && damagePercent > 0) {
            fee += (L.deposit * damagePercent) / 100;
            _decreaseRep(msg.sender, 10);
        }

        uint256 refund = L.deposit > fee ? L.deposit - fee : 0;

        delete loanOf[bookId];
        statusOf[bookId] = Status.AVAILABLE;

        vault.release(address(stable), msg.sender, bookId, refund);
        emit Returned(msg.sender, bookId, refund, fee, notesHash);
    }

    function setStatus(uint256 bookId, Status s) external onlyRole(LIBRARIAN) {
        statusOf[bookId] = s;
    }

    function _calcDeposit(address user) internal view returns (uint256) {
        uint32 rep = reputation[user]; // 0..100
        uint256 discountBps = rep >= 80 ? 3000 : rep >= 60 ? 2000 : rep >= 40 ? 1000 : 0; // 30/20/10%
        return baseDeposit * (10000 - discountBps) / 10000;
    }

    function _increaseRep(address u, uint32 x) internal {
        uint32 cur = reputation[u];
        uint32 nv = cur + x;
        if (nv > 100) nv = 100;
        reputation[u] = nv;
        emit ReputationChanged(u, nv);
    }
    function _decreaseRep(address u, uint32 x) internal {
        uint32 cur = reputation[u];
        uint32 nv = cur > x ? cur - x : 0;
        reputation[u] = nv;
        emit ReputationChanged(u, nv);
    }

    // Admin can adjust reputation (appeals, manual corrections)
    function adminSetReputation(address u, uint32 score) external onlyRole(LIBRARIAN) {
        require(score <= 100, "max 100");
        reputation[u] = score;
        emit ReputationChanged(u, score);
    }
}
