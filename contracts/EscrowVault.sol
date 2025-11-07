// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 * @title EscrowVault
 * @notice Manages deposit escrow for book loans
 * @dev Separates deposit management from core library logic for better security and auditability
 */
contract EscrowVault {
    address public libraryCore;
    address public owner;
    
    error OnlyCore();
    error CoreAlreadySet();
    error InsufficientBalance();
    error TransferFailed();
    error OnlyOwner();

    // Mapping: keccak256(user, bookId) => deposit amount
    mapping(bytes32 => uint256) public depositOf;
    
    event Locked(address indexed user, uint256 indexed bookId, uint256 amount);
    event Released(address indexed to, uint256 indexed bookId, uint256 amount);
    event CoreSet(address indexed core);

    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    /**
     * @dev Set the LibraryCore address (can only be set once)
     */
    function setCore(address _core) external {
        if (libraryCore != address(0)) revert CoreAlreadySet();
        libraryCore = _core;
        emit CoreSet(_core);
    }

    modifier onlyCore() {
        if (msg.sender != libraryCore) revert OnlyCore();
        _;
    }

    /**
     * @dev Lock deposit for a book loan (only LibraryCore can call)
     * @param user The borrower address
     * @param bookId The book token ID
     * @param amt The deposit amount in wei
     */
    function lock(address user, uint256 bookId, uint256 amt) external payable onlyCore {
        require(amt > 0, "Amount must be greater than 0");
        require(msg.value >= amt, "Insufficient ETH sent");
        
        bytes32 key = keccak256(abi.encode(user, bookId));
        depositOf[key] += amt;
        
        emit Locked(user, bookId, amt);
    }

    /**
     * @dev Release deposit (refund) to user (only LibraryCore can call)
     * @param to The address to receive the refund
     * @param bookId The book token ID
     * @param amt The amount to release in wei
     */
    function release(address payable to, uint256 bookId, uint256 amt) external onlyCore {
        bytes32 key = keccak256(abi.encode(to, bookId));
        uint256 bal = depositOf[key];
        
        if (bal < amt) revert InsufficientBalance();
        
        depositOf[key] = bal - amt;
        
        (bool success, ) = to.call{value: amt}("");
        if (!success) revert TransferFailed();
        
        emit Released(to, bookId, amt);
    }

    /**
     * @dev Get deposit amount for a user and book
     * @param user The user address
     * @param bookId The book token ID
     * @return The deposit amount
     */
    function getDeposit(address user, uint256 bookId) external view returns (uint256) {
        bytes32 key = keccak256(abi.encode(user, bookId));
        return depositOf[key];
    }

    /**
     * @dev Withdraw penalty funds to owner (only owner can call)
     * @param amount The amount to withdraw in wei
     */
    function withdrawPenalty(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient contract balance");
        
        (bool success, ) = payable(owner).call{value: amount}("");
        if (!success) revert TransferFailed();
    }
    
    /**
     * @dev Withdraw all penalty funds to owner (only owner can call)
     */
    function withdrawAllPenalty() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner).call{value: balance}("");
        if (!success) revert TransferFailed();
    }
    
    /**
     * @dev Get contract balance (total penalty funds)
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Receive ETH (for deposits)
     */
    receive() external payable {}
}
