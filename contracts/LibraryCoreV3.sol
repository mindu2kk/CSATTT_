// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BookNFT.sol";
import "./UserProfile.sol";
import "./RoleManager.sol";
import "./UserCart.sol";
import "./EscrowVault.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title LibraryCoreV3
 * @notice Enhanced library với đầy đủ tính năng:
 *         - Role-based access control
 *         - Mandatory user profiles
 *         - Cart integration
 *         - EscrowVault for deposits
 * @dev Hệ thống HOÀN TOÀN blockchain-based, không dùng web database
 */
contract LibraryCoreV3 is Ownable, ReentrancyGuard, Pausable {
    
    // ============ State Variables ============
    
    /// @notice Contract BookNFT
    BookNFT public immutable bookNFT;
    
    /// @notice Contract UserProfile
    UserProfile public immutable userProfile;
    
    /// @notice Contract RoleManager
    RoleManager public immutable roleManager;
    
    /// @notice Contract UserCart
    UserCart public immutable userCart;
    
    /// @notice Contract EscrowVault
    EscrowVault public immutable escrowVault;
    
    /// @notice Tiền cọc mặc định (0.01 ETH)
    uint256 public constant BASE_DEPOSIT = 0.01 ether;
    
    /// @notice Phạt trả muộn mỗi ngày (0.001 ETH)
    uint256 public constant PENALTY_LATE_PER_DAY = 0.001 ether;
    
    /// @notice Phạt làm hỏng sách (0.005 ETH)
    uint256 public constant PENALTY_DAMAGE = 0.005 ether;
    
    /// @notice Thời hạn mượn (7 ngày)
    uint256 public constant LOAN_PERIOD = 7 days;
    
    /// @notice Điểm uy tín tối thiểu để được giảm cọc
    uint256 public constant GOOD_REPUTATION_THRESHOLD = 100;
    
    /// @notice Tổng tiền phạt đã thu
    uint256 public totalPenaltyCollected;
    
    // ============ Structs ============
    
    struct LoanInfo {
        address borrower;
        uint256 borrowedAt;
        uint256 dueDate;
        uint256 deposit;
        bool isReturned;
        BookNFT.BookStatus statusAtLoan;
        BookNFT.BookStatus statusAtReturn;
        uint256 returnedAt;
        uint256 latePenalty;
        uint256 damagePenalty;
    }
    
    struct ReturnRequest {
        address borrower;
        uint256 bookId;
        uint256 requestedAt;
        BookNFT.BookStatus proposedCondition;
        bool isPending;
        bool isApproved;
        address approvedBy;
        uint256 approvedAt;
    }
    
    // ============ Mappings ============
    
    /// @notice Thông tin mượn sách
    mapping(uint256 => LoanInfo) public loanInfos;
    
    /// @notice Sách đang mượn của user (wallet-based!)
    mapping(address => uint256[]) public userCurrentLoans;
    
    /// @notice Lịch sử mượn sách của user (wallet-based!)
    mapping(address => uint256[]) public userLoanHistory;
    
    /// @notice Danh sách đặt trước
    mapping(uint256 => address[]) public bookReservations;
    
    /// @notice Check user đã reserve chưa
    mapping(uint256 => mapping(address => bool)) public hasReserved;
    
    /// @notice Return requests mapping (requestId => ReturnRequest)
    mapping(uint256 => ReturnRequest) public returnRequests;
    
    /// @notice Return request counter for auto-incrementing IDs
    uint256 public returnRequestCounter;
    
    // ============ Events ============
    
    event BookBorrowed(
        address indexed borrower,
        uint256 indexed bookId,
        uint256 deposit,
        uint256 dueDate,
        uint256 timestamp
    );
    
    event BookReturned(
        address indexed borrower,
        uint256 indexed bookId,
        uint256 penalty,
        uint256 timestamp
    );
    
    event BookReserved(
        uint256 indexed bookId,
        address indexed user,
        uint256 timestamp
    );
    
    event LoanExtended(
        uint256 indexed bookId,
        address indexed borrower,
        uint256 newDueDate,
        uint256 fee
    );
    
    event ReturnRequested(
        uint256 indexed requestId,
        address indexed borrower,
        uint256 indexed bookId,
        uint256 timestamp
    );
    
    event ReturnApproved(
        uint256 indexed requestId,
        address indexed approver,
        BookNFT.BookStatus finalCondition,
        uint256 penalty,
        uint256 timestamp
    );
    
    event DeprecatedFunctionUsed(
        address indexed caller,
        string functionName,
        uint256 timestamp
    );
    
    // ============ Modifiers ============
    
    /**
     * @notice Chỉ cho phép user có profile
     */
    modifier onlyWithProfile() {
        require(
            userProfile.hasActiveProfile(msg.sender),
            "LibraryCore: User must have active profile"
        );
        _;
    }
    
    /**
     * @notice Chỉ cho phép admin
     */
    modifier onlyAdmin() {
        require(
            roleManager.isAdmin(msg.sender),
            "LibraryCore: Caller is not admin"
        );
        _;
    }
    
    /**
     * @notice Chỉ cho phép admin hoặc librarian
     */
    modifier onlyAdminOrLibrarian() {
        require(
            roleManager.isAdmin(msg.sender) || roleManager.isLibrarian(msg.sender),
            "LibraryCore: Caller is not admin or librarian"
        );
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        address _bookNFT,
        address _userProfile,
        address _roleManager,
        address _userCart,
        address payable _escrowVault  // ✅ FIXED: payable
    ) Ownable(msg.sender) {
        require(_bookNFT != address(0), "Invalid BookNFT address");
        require(_userProfile != address(0), "Invalid UserProfile address");
        require(_roleManager != address(0), "Invalid RoleManager address");
        require(_userCart != address(0), "Invalid UserCart address");
        require(_escrowVault != address(0), "Invalid EscrowVault address");
        
        bookNFT = BookNFT(_bookNFT);
        userProfile = UserProfile(_userProfile);
        roleManager = RoleManager(_roleManager);
        userCart = UserCart(_userCart);
        escrowVault = EscrowVault(_escrowVault);
    }
    
    // ============ Main Functions ============
    
    /**
     * @notice Mượn sách - CHỈ USER CÓ PROFILE
     * @param bookId ID của sách
     */
    function borrowBook(uint256 bookId) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
        onlyWithProfile 
    {
        // Check user is not admin (admin không mượn sách!)
        require(
            !roleManager.isAdmin(msg.sender),
            "LibraryCore: Admin cannot borrow books"
        );
        
        // Check book status
        BookNFT.BookStatus status = bookNFT.getBookStatus(bookId);
        require(
            status == BookNFT.BookStatus.Available || 
            status == BookNFT.BookStatus.New ||
            status == BookNFT.BookStatus.Old,
            "LibraryCore: Book not available"
        );
        
        // Check not already borrowed
        // ✅ FIXED: Book can be borrowed if:
        //    1. No loan record exists (borrower == address(0)), OR
        //    2. Previous loan was returned (isReturned == true)
        require(
            loanInfos[bookId].borrower == address(0) || loanInfos[bookId].isReturned,
            "LibraryCore: Book already borrowed"
        );
        
        // Calculate deposit (discount for good reputation)
        uint256 deposit = BASE_DEPOSIT;
        UserProfile.Profile memory profile = userProfile.getProfile(msg.sender);
        if (profile.reputation >= GOOD_REPUTATION_THRESHOLD) {
            deposit = deposit * 80 / 100; // 20% discount
        }
        
        require(msg.value >= deposit, "LibraryCore: Insufficient deposit");
        
        // Lock deposit in EscrowVault
        escrowVault.lock{value: deposit}(msg.sender, bookId, deposit);
        
        // Update book status to Borrowed
        bookNFT.updateBookStatus(bookId, BookNFT.BookStatus.Borrowed);
        
        // Create loan record
        uint256 dueDate = block.timestamp + LOAN_PERIOD;
        loanInfos[bookId] = LoanInfo({
            borrower: msg.sender,
            borrowedAt: block.timestamp,
            dueDate: dueDate,
            deposit: deposit,
            isReturned: false,
            statusAtLoan: status,
            statusAtReturn: BookNFT.BookStatus.Available,
            returnedAt: 0,
            latePenalty: 0,
            damagePenalty: 0
        });
        
        // Add to user's current loans (wallet-based!)
        userCurrentLoans[msg.sender].push(bookId);
        userLoanHistory[msg.sender].push(bookId);
        
        // Remove from cart if exists
        if (userCart.checkInCart(msg.sender, bookId)) {
            userCart.removeAfterBorrow(msg.sender, bookId);
        }
        
        // Refund excess payment
        if (msg.value > deposit) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - deposit}("");
            require(success, "LibraryCore: Refund failed");
        }
        
        emit BookBorrowed(msg.sender, bookId, deposit, dueDate, block.timestamp);
    }
    
    /**
     * @notice Trả sách - CHỈ BORROWER
     * @param bookId ID của sách
     * @param returnStatus Trạng thái sách khi trả (Good/Fair/Poor/Damaged)
     * @dev DEPRECATED: This function is deprecated. Use requestReturn() and approveReturn() workflow instead.
     *      This function is kept for backward compatibility only.
     *      New implementations should use the two-step approval workflow to prevent fraud.
     */
    function returnBook(uint256 bookId, BookNFT.BookStatus returnStatus)
        external
        nonReentrant
        whenNotPaused
    {
        // Emit deprecation warning event
        emit DeprecatedFunctionUsed(msg.sender, "returnBook", block.timestamp);
        
        LoanInfo storage loan = loanInfos[bookId];
        
        require(loan.borrower == msg.sender, "LibraryCore: Not the borrower");
        require(!loan.isReturned, "LibraryCore: Book already returned");
        
        // Calculate penalties
        uint256 totalPenalty = 0;
        
        // Late penalty
        if (block.timestamp > loan.dueDate) {
            uint256 daysLate = (block.timestamp - loan.dueDate) / 1 days + 1;
            loan.latePenalty = daysLate * PENALTY_LATE_PER_DAY;
            totalPenalty += loan.latePenalty;
        }
        
        // Damage penalty
        if (returnStatus == BookNFT.BookStatus.Damaged || 
            returnStatus == BookNFT.BookStatus.Lost) {
            loan.damagePenalty = PENALTY_DAMAGE;
            totalPenalty += loan.damagePenalty;
        }
        
        // Calculate refund
        uint256 refund = 0;
        if (totalPenalty < loan.deposit) {
            refund = loan.deposit - totalPenalty;
        } else {
            totalPenalty = loan.deposit; // Cap penalty at deposit
        }
        
        // Update state
        loan.isReturned = true;
        loan.statusAtReturn = returnStatus;
        loan.returnedAt = block.timestamp;
        totalPenaltyCollected += totalPenalty;
        
        // Update book status
        bookNFT.updateBookStatus(bookId, returnStatus);
        
        // Remove from current loans
        _removeFromCurrentLoans(msg.sender, bookId);
        
        // Release refund from EscrowVault
        if (refund > 0) {
            escrowVault.release(payable(msg.sender), bookId, refund);
        }
        
        // Update reputation (on-chain!)
        _updateUserReputation(msg.sender, totalPenalty);
        
        emit BookReturned(msg.sender, bookId, totalPenalty, block.timestamp);
    }
    
    /**
     * @notice Request to return a borrowed book - NEW WORKFLOW
     * @dev User submits return request with proposed condition, admin must approve
     * @param bookId ID of the book to return
     * @param proposedCondition Book condition proposed by user
     */
    function requestReturn(uint256 bookId, BookNFT.BookStatus proposedCondition)
        external
        nonReentrant
        whenNotPaused
    {
        LoanInfo storage loan = loanInfos[bookId];
        
        // Validate caller is borrower
        require(loan.borrower == msg.sender, "LibraryCore: Not the borrower");
        
        // Validate book not already returned
        require(!loan.isReturned, "LibraryCore: Book already returned");
        
        // Validate proposed condition is valid enum value
        // Valid return conditions: Available (good), New (like new), Old (fair/poor), Damaged, Lost
        require(
            proposedCondition == BookNFT.BookStatus.Available ||
            proposedCondition == BookNFT.BookStatus.New ||
            proposedCondition == BookNFT.BookStatus.Old ||
            proposedCondition == BookNFT.BookStatus.Damaged ||
            proposedCondition == BookNFT.BookStatus.Lost,
            "LibraryCore: Invalid proposed condition"
        );
        
        // Check if there's already a pending request for this book
        // Iterate through existing requests to ensure only one pending per book
        for (uint256 i = 1; i <= returnRequestCounter; i++) {
            ReturnRequest storage existingRequest = returnRequests[i];
            if (existingRequest.bookId == bookId && 
                existingRequest.isPending && 
                existingRequest.borrower == msg.sender) {
                revert("LibraryCore: Return request already pending");
            }
        }
        
        // Increment counter
        returnRequestCounter++;
        
        // Create new ReturnRequest
        returnRequests[returnRequestCounter] = ReturnRequest({
            borrower: msg.sender,
            bookId: bookId,
            requestedAt: block.timestamp,
            proposedCondition: proposedCondition,
            isPending: true,
            isApproved: false,
            approvedBy: address(0),
            approvedAt: 0
        });
        
        // Emit event
        emit ReturnRequested(returnRequestCounter, msg.sender, bookId, block.timestamp);
    }
    
    /**
     * @notice Approve return request - ADMIN/LIBRARIAN ONLY
     * @dev Admin inspects book and sets final condition, which may differ from proposed
     * @param requestId ID of the return request
     * @param finalCondition Actual book condition determined by admin after inspection
     */
    function approveReturn(uint256 requestId, BookNFT.BookStatus finalCondition)
        external
        nonReentrant
        whenNotPaused
        onlyAdminOrLibrarian
    {
        ReturnRequest storage request = returnRequests[requestId];
        
        // Validate request exists (borrower != address(0))
        require(request.borrower != address(0), "LibraryCore: Request not found");
        
        // Validate not already approved
        require(!request.isApproved, "LibraryCore: Already approved");
        
        // Validate request is pending
        require(request.isPending, "LibraryCore: Request not pending");
        
        // Validate final condition is valid
        require(
            finalCondition == BookNFT.BookStatus.Available ||
            finalCondition == BookNFT.BookStatus.New ||
            finalCondition == BookNFT.BookStatus.Old ||
            finalCondition == BookNFT.BookStatus.Damaged ||
            finalCondition == BookNFT.BookStatus.Lost,
            "LibraryCore: Invalid final condition"
        );
        
        // Get loan info for the book
        uint256 bookId = request.bookId;
        LoanInfo storage loan = loanInfos[bookId];
        
        // Calculate penalties
        uint256 totalPenalty = 0;
        
        // Calculate late penalty if overdue
        if (block.timestamp > loan.dueDate) {
            uint256 daysLate = (block.timestamp - loan.dueDate) / 1 days + 1;
            loan.latePenalty = daysLate * PENALTY_LATE_PER_DAY;
            totalPenalty += loan.latePenalty;
        }
        
        // Calculate damage penalty based on FINAL condition (not proposed)
        if (finalCondition == BookNFT.BookStatus.Damaged || 
            finalCondition == BookNFT.BookStatus.Lost) {
            loan.damagePenalty = PENALTY_DAMAGE;
            totalPenalty += loan.damagePenalty;
        }
        
        // Cap total penalty at deposit
        if (totalPenalty > loan.deposit) {
            totalPenalty = loan.deposit;
        }
        
        // Calculate refund (deposit - penalty)
        uint256 refund = loan.deposit - totalPenalty;
        
        // Update loan state
        loan.isReturned = true;
        loan.statusAtReturn = finalCondition;
        loan.returnedAt = block.timestamp;
        totalPenaltyCollected += totalPenalty;
        
        // Map New to Available (book like new = available for borrowing)
        BookNFT.BookStatus actualStatus = finalCondition;
        if (finalCondition == BookNFT.BookStatus.New) {
            actualStatus = BookNFT.BookStatus.Available;
        }
        
        // Update book status via BookNFT.updateBookStatus()
        bookNFT.updateBookStatus(bookId, actualStatus);
        
        // Remove book from userCurrentLoans array
        _removeFromCurrentLoans(request.borrower, bookId);
        
        // Release refund via EscrowVault.release()
        if (refund > 0) {
            escrowVault.release(payable(request.borrower), bookId, refund);
        }
        
        // Update request
        request.isPending = false;
        request.isApproved = true;
        request.approvedBy = msg.sender;
        request.approvedAt = block.timestamp;
        
        // Update user reputation
        _updateUserReputation(request.borrower, totalPenalty);
        
        // Emit ReturnApproved and BookReturned events
        emit ReturnApproved(requestId, msg.sender, finalCondition, totalPenalty, block.timestamp);
        emit BookReturned(request.borrower, bookId, totalPenalty, block.timestamp);
    }
    
    /**
     * @notice Reserve sách - CHỈ USER CÓ PROFILE
     * @param bookId ID của sách
     */
    function reserveBook(uint256 bookId) external onlyWithProfile {
        require(!hasReserved[bookId][msg.sender], "Already reserved");
        
        bookReservations[bookId].push(msg.sender);
        hasReserved[bookId][msg.sender] = true;
        
        emit BookReserved(bookId, msg.sender, block.timestamp);
    }
    
    /**
     * @notice Extend loan - Gia hạn mượn sách
     * @param bookId ID của sách
     */
    function extendLoan(uint256 bookId) external payable nonReentrant {
        LoanInfo storage loan = loanInfos[bookId];
        
        require(loan.borrower == msg.sender, "Not the borrower");
        require(!loan.isReturned, "Book already returned");
        require(block.timestamp <= loan.dueDate, "Cannot extend overdue loan");
        
        uint256 extensionFee = BASE_DEPOSIT / 10; // 10% of deposit
        require(msg.value >= extensionFee, "Insufficient extension fee");
        
        // Extend by 7 more days
        loan.dueDate += LOAN_PERIOD;
        
        // Refund excess
        if (msg.value > extensionFee) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - extensionFee}("");
            require(success, "Refund failed");
        }
        
        emit LoanExtended(bookId, msg.sender, loan.dueDate, extensionFee);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Pause contract - CHỈ ADMIN
     */
    function pause() external onlyAdmin {
        _pause();
    }
    
    /**
     * @notice Unpause contract - CHỈ ADMIN
     */
    function unpause() external onlyAdmin {
        _unpause();
    }
    
    /**
     * @notice Withdraw penalty funds - CHỈ ADMIN
     */
    function withdrawPenalty(uint256 amount) external onlyAdmin {
        escrowVault.withdrawPenalty(amount);
    }
    
    /**
     * @notice Withdraw all penalty - CHỈ ADMIN
     */
    function withdrawAllPenalty() external onlyAdmin {
        escrowVault.withdrawAllPenalty();
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Lấy sách đang mượn của user - THEO WALLET
     * @param user Address của user
     */
    function getUserCurrentLoans(address user) external view returns (uint256[] memory) {
        return userCurrentLoans[user];
    }
    
    /**
     * @notice Lấy lịch sử mượn - THEO WALLET
     * @param user Address của user
     */
    function getUserLoanHistory(address user) external view returns (uint256[] memory) {
        return userLoanHistory[user];
    }
    
    /**
     * @notice Check if book is borrowed
     */
    function isBookBorrowed(uint256 bookId) external view returns (bool) {
        return !loanInfos[bookId].isReturned && loanInfos[bookId].borrower != address(0);
    }
    
    /**
     * @notice Get loan info
     */
    function getLoanInfo(uint256 bookId) external view returns (LoanInfo memory) {
        return loanInfos[bookId];
    }
    
    /**
     * @notice Calculate current penalty for a loan
     */
    function calculateCurrentPenalty(uint256 bookId) external view returns (uint256) {
        LoanInfo memory loan = loanInfos[bookId];
        
        if (loan.isReturned) return 0;
        if (block.timestamp <= loan.dueDate) return 0;
        
        uint256 daysLate = (block.timestamp - loan.dueDate) / 1 days + 1;
        uint256 latePenalty = daysLate * PENALTY_LATE_PER_DAY;
        
        // Cap at deposit
        if (latePenalty > loan.deposit) {
            latePenalty = loan.deposit;
        }
        
        return latePenalty;
    }
    
    /**
     * @notice Get reservations for a book
     */
    function getBookReservations(uint256 bookId) external view returns (address[] memory) {
        return bookReservations[bookId];
    }
    
    /**
     * @notice Get all pending return request IDs
     * @dev Returns array of request IDs where isPending = true
     * @return Array of pending request IDs
     */
    function getPendingReturnRequests() external view returns (uint256[] memory) {
        // First pass: count pending requests
        uint256 pendingCount = 0;
        for (uint256 i = 1; i <= returnRequestCounter; i++) {
            if (returnRequests[i].isPending) {
                pendingCount++;
            }
        }
        
        // Create array of appropriate size
        uint256[] memory pendingRequestIds = new uint256[](pendingCount);
        
        // Second pass: populate array with pending request IDs
        uint256 currentIndex = 0;
        for (uint256 i = 1; i <= returnRequestCounter; i++) {
            if (returnRequests[i].isPending) {
                pendingRequestIds[currentIndex] = i;
                currentIndex++;
            }
        }
        
        return pendingRequestIds;
    }
    
    // ============ Internal Functions ============
    
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
    
    function _updateUserReputation(address user, uint256 penalty) internal {
        // Get current reputation from UserProfile
        UserProfile.Profile memory profile = userProfile.getProfile(user);
        uint256 newReputation = profile.reputation;
        
        if (penalty == 0) {
            // Good return - increase reputation
            newReputation += 10;
        } else if (penalty < BASE_DEPOSIT / 2) {
            // Minor penalty - small decrease
            if (newReputation >= 5) newReputation -= 5;
        } else {
            // Major penalty - large decrease
            if (newReputation >= 20) newReputation -= 20;
            else newReputation = 0;
        }
        
        // Update reputation in UserProfile (only owner can call)
        // Note: This requires LibraryCore to be owner of UserProfile
        // Or UserProfile needs to allow authorized contracts to update reputation
    }
}

