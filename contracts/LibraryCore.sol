// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "./BookNFT.sol";
import "./EscrowVault.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract LibraryCore is AccessControl, ReentrancyGuard {
    BookNFT public bookNFT;
    EscrowVault public escrowVault;

    // Role definitions
    bytes32 public constant LIBRARIAN = keccak256("LIBRARIAN");
    bytes32 public constant PAUSER = keccak256("PAUSER");

    struct LoanInfo {
        address borrower;
        uint256 borrowedAt;
        uint256 dueDate;
        uint256 deposit;
        bool isReturned;
        BookNFT.BookStatus statusAtLoan;
        BookNFT.BookStatus statusAtReturn;
        uint256 latePenalty;
        uint256 damagePenalty;
        bool overdue;
        bool damaged;
    }
    mapping(uint256 => LoanInfo) public loanInfos;
    mapping(address => int256) public userReputation;

    uint256 public constant BASE_DEPOSIT = 0.1 ether;
    uint256 public constant PENALTY_LATE = 0.02 ether;
    uint256 public constant PENALTY_DAMAGE = 0.05 ether;
    uint256 public constant LOAN_PERIOD = 7 days;

    bool public paused = false;
    
    event BookBorrowed(address indexed borrower, uint256 indexed tokenId, uint256 deposit);
    event BookReturned(address indexed borrower, uint256 indexed tokenId, uint256 penalty, int256 reputationDelta);
    event Paused(address account);
    event Unpaused(address account);

    modifier whenNotPaused() {
        require(!paused, "Paused");
        _;
    }

    constructor(address _bookNFT, address _escrowVault) {
        bookNFT = BookNFT(_bookNFT);
        escrowVault = EscrowVault(payable(_escrowVault));
        // Grant admin role to deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(LIBRARIAN, msg.sender);
        _grantRole(PAUSER, msg.sender);
    }

    /**
     * @dev Pause the contract (only PAUSER role)
     */
    function pause() external onlyRole(PAUSER) {
        paused = true;
        emit Paused(msg.sender);
    }

    /**
     * @dev Unpause the contract (only PAUSER role)
     */
    function unpause() external onlyRole(PAUSER) {
        paused = false;
        emit Unpaused(msg.sender);
    }

    function borrowBook(uint256 tokenId) external payable whenNotPaused nonReentrant {
        BookNFT.BookStatus status = bookNFT.getBookStatus(tokenId);
        // Only Borrowed (1) and Lost (3) cannot be borrowed
        require(status != BookNFT.BookStatus.Borrowed, "Book is already borrowed");
        require(status != BookNFT.BookStatus.Lost, "Lost books cannot be borrowed");
        require(msg.value >= BASE_DEPOSIT, "Deposit required");
        require(loanInfos[tokenId].borrower == address(0) || loanInfos[tokenId].isReturned, "Already borrowed");
        
        // Lock deposit in EscrowVault
        escrowVault.lock{value: msg.value}(msg.sender, tokenId, msg.value);
        
        loanInfos[tokenId] = LoanInfo({
            borrower: msg.sender,
            borrowedAt: block.timestamp,
            dueDate: block.timestamp + LOAN_PERIOD,
            deposit: msg.value,
            isReturned: false,
            statusAtLoan: status,
            statusAtReturn: status,
            latePenalty: 0,
            damagePenalty: 0,
            overdue: false,
            damaged: false
        });
        bookNFT.updateBookStatus(tokenId, BookNFT.BookStatus.Borrowed);
        emit BookBorrowed(msg.sender, tokenId, msg.value);
    }

    function returnBook(uint256 tokenId, BookNFT.BookStatus afterStatus) external whenNotPaused nonReentrant {
        LoanInfo storage info = loanInfos[tokenId];
        require(info.borrower == msg.sender, "Not borrower");
        require(!info.isReturned, "Already returned");
        info.statusAtReturn = afterStatus;
        info.isReturned = true;

        // Tính phạt chậm/trả muộn
        uint256 penalty = 0;
        int256 repChange = 0;
        if(block.timestamp > info.dueDate){
            penalty += PENALTY_LATE;
            info.latePenalty = PENALTY_LATE;
            info.overdue = true;
            repChange -= 2;
        }
        if(afterStatus == BookNFT.BookStatus.Damaged || afterStatus == BookNFT.BookStatus.Lost) {
            penalty += PENALTY_DAMAGE;
            info.damagePenalty = PENALTY_DAMAGE;
            info.damaged = true;
            repChange -= 5;
        } else {
            // trả đúng hạn, sách bình thường thì cộng điểm (giảm cọc lần sau)
            repChange += 1;
        }
        userReputation[msg.sender] += repChange;
        
        // Release deposit from EscrowVault (trừ phạt)
        // Penalty sẽ ở lại trong EscrowVault, owner có thể withdraw sau
        uint256 refund = info.deposit > penalty ? info.deposit - penalty : 0;
        if(refund > 0) {
            escrowVault.release(payable(msg.sender), tokenId, refund);
        }
        // Note: Penalty (nếu có) sẽ ở lại trong EscrowVault
        // Owner có thể withdraw bằng EscrowVault.withdrawPenalty() hoặc withdrawAllPenalty()
        
        bookNFT.updateBookStatus(tokenId, afterStatus);
        emit BookReturned(msg.sender, tokenId, penalty, repChange);
    }
}
