// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BookNFT.sol";
import "./UserProfile.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title LibraryCoreV2
 * @notice Enhanced library core with integrated user profiles
 * @dev Requires users to have profiles before borrowing books
 */
contract LibraryCoreV2 is Ownable, ReentrancyGuard, Pausable {
    
    // ============ State Variables ============
    
    /// @notice Contract BookNFT
    BookNFT public immutable bookNFT;
    
    /// @notice Contract UserProfile
    UserProfile public immutable userProfile;
    
    /// @notice Tiền cọc mặc định (0.1 ETH)
    uint256 public constant BASE_DEPOSIT = 0.1 ether;
    
    /// @notice Phạt trả muộn (0.02 ETH)
    uint256 public constant PENALTY_LATE = 0.02 ether;
    
    /// @notice Phạt làm hỏng/mất sách (0.05 ETH)
    uint256 public constant PENALTY_DAMAGE = 0.05 ether;
    
    /// @notice Thời hạn mượn (7 ngày)
    uint256 public constant LOAN_PERIOD = 7 days;
    
    /// @notice Điểm uy tín tối thiểu để được giảm cọc
    int256 public constant GOOD_REPUTATION_THRESHOLD = 10;
    
    /// @notice Tổng tiền phạt đã thu
    uint256 public totalPenaltyCollected;
    
    // ============ Structs ============
    
    struct LoanInfo {
        address borrower;
        uint256 borrowedAt;
        uint256 dueDate;
        uint256 deposit;
        bool isReturned;
        uint8 statusAtLoan;
        uint8 statusAtReturn;
        uint256 returnedAt;
        uint256 penaltyPaid;
    }
    
    // ============ Mappings ============
    
    /// @notice Thông tin mượn sách theo bookId
    mapping(uint256 => LoanInfo) public loanInfos;
    
    /// @notice Danh sách sách đang mượn của user
    mapping(address => uint256[]) public userCurrentLoans;
    
    /// @notice Lịch sử mượn sách của user
    mapping(address => uint256[]) public userLoanHistory;
    
    /// @notice Uy tín của user
    mapping(address => int256) public userReputation;
    
    /// @notice Danh sách đặt trước sách
    mapping(uint256 => address[]) public bookReservations;
    
    /// @notice Kiểm tra user đã đặt trước sách chưa
    mapping(uint256 => mapping(address => bool)) public hasReserved;
    
    // ============ Events ============
    
    event BookBorrowed(
        uint256 indexed bookId,
        address indexed borrower,
        uint256 deposit,
        uint256 dueDate,
        uint256 timestamp
    );
    
    event BookReturned(
        uint256 indexed bookId,
        address indexed borrower,
        uint8 returnStatus,
        uint256 penaltyPaid,
        uint256 timestamp
    );
    
    event BookReserved(
        uint256 indexed bookId,
        address indexed user,
        uint256 timestamp
    );
    
    event ReputationUpdated(
        address indexed user,
        int256 oldReputation,
        int256 newReputation
    );
    
    // ============ Modifiers ============
    
    modifier requireProfile() {
        require(
            userProfile.hasActiveProfile(msg.sender),
            "User must have an active profile to borrow books"
        );
        _;
    }
    
    modifier bookExists(uint256 bookId) {
        require(bookId < bookNFT.nextBookId(), "Book does not exist");
        _;
    }
    
    modifier bookAvailable(uint256 bookId) {
        require(
            uint8(bookNFT.getBookStatus(bookId)) == 0, // Available
            "Book is not available"
        );
        _;
    }
    
    modifier onlyBorrower(uint256 bookId) {
        require(
            loanInfos[bookId].borrower == msg.sender,
            "Only borrower can return this book"
        );
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        address _bookNFT,
        address _userProfile
    ) Ownable(msg.sender) {
        bookNFT = BookNFT(_bookNFT);
        userProfile = UserProfile(_userProfile);
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Mượn sách (yêu cầu có profile)
     * @param bookId ID của sách muốn mượn
     */
    function borrowBook(uint256 bookId) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
        requireProfile
        bookExists(bookId)
        bookAvailable(bookId)
    {
        require(msg.value >= BASE_DEPOSIT, "Insufficient deposit");
        
        // Kiểm tra user có trong danh sách đặt trước không (nếu có)
        if (bookReservations[bookId].length > 0) {
            require(
                bookReservations[bookId][0] == msg.sender,
                "Book is reserved for another user"
            );
            // Xóa reservation
            _removeReservation(bookId, msg.sender);
        }
        
        // Tính toán due date
        uint256 dueDate = block.timestamp + LOAN_PERIOD;
        
        // Tạo loan info
        loanInfos[bookId] = LoanInfo({
            borrower: msg.sender,
            borrowedAt: block.timestamp,
            dueDate: dueDate,
            deposit: msg.value,
            isReturned: false,
            statusAtLoan: uint8(bookNFT.getBookStatus(bookId)),
            statusAtReturn: 0,
            returnedAt: 0,
            penaltyPaid: 0
        });
        
        // Cập nhật trạng thái sách
        bookNFT.updateBookStatus(bookId, BookNFT.BookStatus.Borrowed);
        
        // Thêm vào danh sách mượn hiện tại
        userCurrentLoans[msg.sender].push(bookId);
        
        // Thêm vào lịch sử
        userLoanHistory[msg.sender].push(bookId);
        
        emit BookBorrowed(bookId, msg.sender, msg.value, dueDate, block.timestamp);
    }
    
    /**
     * @notice Trả sách
     * @param bookId ID của sách muốn trả
     * @param returnStatus Trạng thái sách khi trả (0=Available, 2=Damaged, 3=Lost)
     */
    function returnBook(uint256 bookId, uint8 returnStatus)
        external
        nonReentrant
        whenNotPaused
        bookExists(bookId)
        onlyBorrower(bookId)
    {
        LoanInfo storage loan = loanInfos[bookId];
        require(!loan.isReturned, "Book already returned");
        
        uint256 penalty = 0;
        
        // Tính phạt trả muộn
        if (block.timestamp > loan.dueDate) {
            penalty += PENALTY_LATE;
        }
        
        // Tính phạt hỏng/mất sách
        if (returnStatus == 2 || returnStatus == 3) { // Damaged or Lost
            penalty += PENALTY_DAMAGE;
        }
        
        // Cập nhật loan info
        loan.isReturned = true;
        loan.statusAtReturn = returnStatus;
        loan.returnedAt = block.timestamp;
        loan.penaltyPaid = penalty;
        
        // Cập nhật trạng thái sách
        bookNFT.updateBookStatus(bookId, BookNFT.BookStatus(returnStatus));
        
        // Xóa khỏi danh sách mượn hiện tại
        _removeFromCurrentLoans(msg.sender, bookId);
        
        // Tính toán refund
        uint256 refund = loan.deposit;
        if (penalty > 0) {
            if (penalty >= refund) {
                totalPenaltyCollected += refund;
                refund = 0;
            } else {
                totalPenaltyCollected += penalty;
                refund -= penalty;
            }
        }
        
        // Cập nhật reputation
        _updateReputation(msg.sender, returnStatus, block.timestamp <= loan.dueDate);
        
        // Refund deposit (trừ penalty)
        if (refund > 0) {
            (bool success, ) = payable(msg.sender).call{value: refund}("");
            require(success, "Refund failed");
        }
        
        // Xử lý reservation queue
        _processReservationQueue(bookId, returnStatus);
        
        emit BookReturned(bookId, msg.sender, returnStatus, penalty, block.timestamp);
    }
    
    /**
     * @notice Đặt trước sách
     * @param bookId ID của sách muốn đặt trước
     */
    function reserveBook(uint256 bookId)
        external
        requireProfile
        bookExists(bookId)
    {
        require(
            uint8(bookNFT.getBookStatus(bookId)) == 1, // Currently borrowed
            "Book must be borrowed to reserve"
        );
        require(
            !hasReserved[bookId][msg.sender],
            "Already reserved this book"
        );
        require(
            loanInfos[bookId].borrower != msg.sender,
            "Cannot reserve book you are borrowing"
        );
        
        bookReservations[bookId].push(msg.sender);
        hasReserved[bookId][msg.sender] = true;
        
        emit BookReserved(bookId, msg.sender, block.timestamp);
    }
    
    // ============ Internal Functions ============
    
    function _updateReputation(address user, uint8 returnStatus, bool onTime) internal {
        int256 oldReputation = userReputation[user];
        int256 change = 0;
        
        if (onTime) {
            change += 1; // +1 for on-time return
        } else {
            change -= 2; // -2 for late return
        }
        
        if (returnStatus == 0) { // Good condition
            change += 1;
        } else if (returnStatus == 2) { // Damaged
            change -= 3;
        } else if (returnStatus == 3) { // Lost
            change -= 5;
        }
        
        int256 newReputation = oldReputation + change;
        userReputation[user] = newReputation;
        
        // Update reputation in UserProfile contract
        if (newReputation >= 0) {
            userProfile.updateReputation(user, uint256(newReputation));
        }
        
        emit ReputationUpdated(user, oldReputation, newReputation);
    }
    
    function _removeFromCurrentLoans(address user, uint256 bookId) internal {
        uint256[] storage loans = userCurrentLoans[user];
        for (uint256 i = 0; i < loans.length; i++) {
            if (loans[i] == bookId) {
                loans[i] = loans[loans.length - 1];
                loans.pop();
                break;
            }
        }
    }
    
    function _removeReservation(uint256 bookId, address user) internal {
        address[] storage reservations = bookReservations[bookId];
        for (uint256 i = 0; i < reservations.length; i++) {
            if (reservations[i] == user) {
                reservations[i] = reservations[reservations.length - 1];
                reservations.pop();
                hasReserved[bookId][user] = false;
                break;
            }
        }
    }
    
    function _processReservationQueue(uint256 bookId, uint8 returnStatus) internal {
        if (returnStatus == 0 && bookReservations[bookId].length > 0) {
            // Book is available and there are reservations
            // The first person in queue gets priority for next borrow
            // (Implementation can be enhanced with time limits)
        }
    }
    
    // ============ View Functions ============
    
    function getUserCurrentLoans(address user) external view returns (uint256[] memory) {
        return userCurrentLoans[user];
    }
    
    function getUserLoanHistory(address user) external view returns (uint256[] memory) {
        return userLoanHistory[user];
    }
    
    function getBookReservations(uint256 bookId) external view returns (address[] memory) {
        return bookReservations[bookId];
    }
    
    function getReputation(address user) external view returns (int256) {
        return userReputation[user];
    }
    
    function getLoanInfo(uint256 bookId) external view returns (LoanInfo memory) {
        return loanInfos[bookId];
    }
    
    // ============ Admin Functions ============
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function withdrawAllPenalty() external onlyOwner {
        uint256 amount = totalPenaltyCollected;
        totalPenaltyCollected = 0;
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Withdrawal failed");
    }
}