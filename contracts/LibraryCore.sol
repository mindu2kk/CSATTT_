// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BookNFT.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title LibraryCore
 * @author Library Blockchain System
 * @notice Contract chính xử lý logic mượn/trả sách
 * @dev Tích hợp với BookNFT để quản lý trạng thái sách
 */
contract LibraryCore is Ownable, ReentrancyGuard, Pausable {
    
    // ============ State Variables ============
    
    /// @notice Contract BookNFT
    BookNFT public immutable bookNFT;
    
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
    
    /**
     * @notice Thông tin về một lần mượn sách
     * @param borrower Địa chỉ người mượn
     * @param borrowedAt Timestamp khi mượn
     * @param dueDate Hạn trả
     * @param deposit Số tiền cọc
     * @param isReturned Đã trả chưa
     * @param statusAtLoan Trạng thái sách khi mượn
     * @param statusAtReturn Trạng thái sách khi trả
     * @param latePenalty Tiền phạt trả muộn
     * @param damagePenalty Tiền phạt làm hỏng
     * @param overdue Có quá hạn không
     * @param damaged Có bị hỏng không
     * @param imageBeforeHash Ảnh trước khi mượn
     * @param imageAfterHash Ảnh sau khi trả
     */
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
        string imageBeforeHash;
        string imageAfterHash;
    }
    
    // ============ Mappings ============
    
    /// @notice Mapping từ token ID đến thông tin mượn
    mapping(uint256 => LoanInfo) public loanInfos;
    
    /// @notice Mapping từ địa chỉ đến điểm uy tín
    mapping(address => int256) public userReputation;
    
    /// @notice Mapping từ token ID đến danh sách người đặt trước
    mapping(uint256 => address[]) public bookReservations;
    
    // ============ Events ============
    
    /// @notice Emit khi mượn sách
    event BookBorrowed(
        address indexed borrower, 
        uint256 indexed tokenId, 
        uint256 deposit,
        uint256 dueDate
    );
    
    /// @notice Emit khi trả sách
    event BookReturned(
        address indexed borrower, 
        uint256 indexed tokenId, 
        uint256 penalty, 
        int256 reputationDelta, 
        string imageAfterHash
    );
    
    /// @notice Emit khi owner withdraw penalty
    event PenaltyWithdrawn(
        address indexed owner, 
        uint256 amount
    );
    
    /// @notice Emit khi gia hạn sách
    event LoanExtended(
        uint256 indexed tokenId,
        address indexed borrower,
        uint256 newDueDate
    );
    
    /// @notice Emit khi đặt trước sách
    event BookReserved(
        uint256 indexed tokenId,
        address indexed reserver
    );
    
    /// @notice Emit khi cập nhật thông tin sách
    event BookInfoUpdated(
        uint256 indexed tokenId,
        string name,
        string description
    );
    
    /// @notice Emit khi sách available cho người đặt trước
    event BookAvailableForReservation(
        uint256 indexed tokenId,
        address indexed reserver
    );
    
    // ============ Errors ============
    
    error InsufficientDeposit(uint256 required, uint256 provided);
    error BookNotAvailable(uint256 tokenId, BookNFT.BookStatus currentStatus);
    error NotBorrower(address caller, address borrower);
    error AlreadyReturned(uint256 tokenId);
    error AlreadyBorrowed(uint256 tokenId);
    error WithdrawFailed();
    
    // ============ Constructor ============
    
    /**
     * @notice Khởi tạo LibraryCore
     * @param _bookNFT Địa chỉ contract BookNFT
     */
    constructor(address _bookNFT) Ownable(msg.sender) {
        require(_bookNFT != address(0), "LibraryCore: Invalid BookNFT address");
        bookNFT = BookNFT(_bookNFT);
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Mượn sách
     * @param tokenId ID của sách cần mượn
     * @dev Người mượn phải gửi kèm tiền cọc (>= BASE_DEPOSIT)
     */
    function borrowBook(uint256 tokenId) 
        external 
        payable 
        whenNotPaused 
        nonReentrant 
    {
        // Validate deposit
        if (msg.value < BASE_DEPOSIT) {
            revert InsufficientDeposit(BASE_DEPOSIT, msg.value);
        }
        
        // Check book status
        BookNFT.BookStatus status = bookNFT.getBookStatus(tokenId);
        if (status == BookNFT.BookStatus.Borrowed) {
            revert BookNotAvailable(tokenId, status);
        }
        if (status == BookNFT.BookStatus.Lost) {
            revert BookNotAvailable(tokenId, status);
        }
        
        // Check if already borrowed
        LoanInfo storage existingLoan = loanInfos[tokenId];
        if (existingLoan.borrower != address(0) && !existingLoan.isReturned) {
            revert AlreadyBorrowed(tokenId);
        }
        
        // Get image before hash from BookNFT
        string memory imageBefore = bookNFT.getBookImage(tokenId, "before");
        
        // Create loan info
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
            damaged: false,
            imageBeforeHash: imageBefore,
            imageAfterHash: ""
        });
        
        // Update book status
        bookNFT.updateBookStatus(tokenId, BookNFT.BookStatus.Borrowed);
        
        emit BookBorrowed(msg.sender, tokenId, msg.value, block.timestamp + LOAN_PERIOD);
    }
    
    /**
     * @notice Trả sách (không có ảnh)
     * @param tokenId ID của sách cần trả
     * @param afterStatus Trạng thái sách sau khi trả
     */
    function returnBook(uint256 tokenId, BookNFT.BookStatus afterStatus) 
        external 
        whenNotPaused 
        nonReentrant 
    {
        _returnBookInternal(tokenId, afterStatus, "");
    }
    
    /**
     * @notice Gia hạn thời gian mượn sách
     * @param tokenId ID của sách cần gia hạn
     */
    function extendLoan(uint256 tokenId) 
        external 
        payable 
        whenNotPaused 
        nonReentrant 
    {
        LoanInfo storage info = loanInfos[tokenId];
        
        // Validate
        if (info.borrower != msg.sender) {
            revert NotBorrower(msg.sender, info.borrower);
        }
        if (info.isReturned) {
            revert AlreadyReturned(tokenId);
        }
        
        // Require extension fee (0.01 ETH)
        uint256 extensionFee = 0.01 ether;
        require(msg.value >= extensionFee, "LibraryCore: Extension fee required");
        
        // Extend due date by 7 days
        info.dueDate += LOAN_PERIOD;
        
        // Track extension fee
        totalPenaltyCollected += msg.value;
        
        emit LoanExtended(tokenId, msg.sender, info.dueDate);
    }
    
    /**
     * @notice Đặt trước sách đang được mượn
     * @param tokenId ID của sách cần đặt trước
     */
    function reserveBook(uint256 tokenId) 
        external 
        whenNotPaused 
    {
        BookNFT.BookStatus status = bookNFT.getBookStatus(tokenId);
        require(status == BookNFT.BookStatus.Borrowed, "LibraryCore: Book not borrowed");
        
        // Check if already reserved by this user
        address[] storage reservations = bookReservations[tokenId];
        for (uint i = 0; i < reservations.length; i++) {
            require(reservations[i] != msg.sender, "LibraryCore: Already reserved");
        }
        
        reservations.push(msg.sender);
        emit BookReserved(tokenId, msg.sender);
    }
    
    /**
     * @notice Cập nhật thông tin sách (chỉ admin)
     * @param tokenId ID của sách
     * @param name Tên mới
     * @param description Mô tả mới
     */
    function updateBookInfo(
        uint256 tokenId, 
        string memory name, 
        string memory description
    ) 
        external 
        onlyOwner 
    {
        require(bytes(name).length > 0, "LibraryCore: Name cannot be empty");
        require(bytes(description).length > 0, "LibraryCore: Description cannot be empty");
        
        bookNFT.updateBookInfo(tokenId, name, description);
        emit BookInfoUpdated(tokenId, name, description);
    }
    
    /**
     * @notice Trả sách (có ảnh)
     * @param tokenId ID của sách cần trả
     * @param afterStatus Trạng thái sách sau khi trả
     * @param imageAfterHash IPFS hash hoặc URL của ảnh sau khi trả
     */
    function returnBookWithImage(
        uint256 tokenId, 
        BookNFT.BookStatus afterStatus, 
        string memory imageAfterHash
    ) 
        external 
        whenNotPaused 
        nonReentrant 
    {
        _returnBookInternal(tokenId, afterStatus, imageAfterHash);
    }
    
    /**
     * @notice Owner withdraw tất cả penalty đã thu
     */
    function withdrawAllPenalty() 
        external 
        onlyOwner 
        nonReentrant 
    {
        uint256 amount = totalPenaltyCollected;
        require(amount > 0, "LibraryCore: No penalty to withdraw");
        
        totalPenaltyCollected = 0;
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        if (!success) {
            revert WithdrawFailed();
        }
        
        emit PenaltyWithdrawn(owner(), amount);
    }
    
    /**
     * @notice Pause contract (chỉ owner)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause contract (chỉ owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Lấy thông tin mượn sách
     * @param tokenId ID của sách
     * @return LoanInfo struct
     */
    function getLoanInfo(uint256 tokenId) 
        external 
        view 
        returns (LoanInfo memory) 
    {
        return loanInfos[tokenId];
    }
    
    /**
     * @notice Lấy điểm uy tín của user
     * @param user Địa chỉ user
     * @return int256 điểm uy tín
     */
    function getReputation(address user) 
        external 
        view 
        returns (int256) 
    {
        return userReputation[user];
    }
    
    /**
     * @notice Kiểm tra sách có đang được mượn không
     * @param tokenId ID của sách
     * @return bool true nếu đang được mượn
     */
    function isBookBorrowed(uint256 tokenId) 
        external 
        view 
        returns (bool) 
    {
        LoanInfo memory loan = loanInfos[tokenId];
        return loan.borrower != address(0) && !loan.isReturned;
    }
    
    /**
     * @notice Lấy danh sách người đặt trước sách
     * @param tokenId ID của sách
     * @return address[] danh sách địa chỉ đặt trước
     */
    function getBookReservations(uint256 tokenId) 
        external 
        view 
        returns (address[] memory) 
    {
        return bookReservations[tokenId];
    }
    
    /**
     * @notice Kiểm tra user có đặt trước sách này không
     * @param tokenId ID của sách
     * @param user Địa chỉ user
     * @return bool true nếu đã đặt trước
     */
    function hasReserved(uint256 tokenId, address user) 
        external 
        view 
        returns (bool) 
    {
        address[] memory reservations = bookReservations[tokenId];
        for (uint i = 0; i < reservations.length; i++) {
            if (reservations[i] == user) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @notice Tính penalty cho một loan
     * @param tokenId ID của sách
     * @return penalty Tổng penalty
     * @return isOverdue Có quá hạn không
     */
    function calculatePenalty(uint256 tokenId) 
        external 
        view 
        returns (uint256 penalty, bool isOverdue) 
    {
        LoanInfo memory loan = loanInfos[tokenId];
        
        if (block.timestamp > loan.dueDate) {
            penalty += PENALTY_LATE;
            isOverdue = true;
        }
        
        return (penalty, isOverdue);
    }
    
    // ============ Internal Functions ============
    
    /**
     * @notice Internal function xử lý trả sách
     * @dev Tránh duplicate code giữa returnBook và returnBookWithImage
     */
    function _returnBookInternal(
        uint256 tokenId,
        BookNFT.BookStatus afterStatus,
        string memory imageAfterHash
    ) 
        internal 
    {
        LoanInfo storage info = loanInfos[tokenId];
        
        // Validate
        if (info.borrower != msg.sender) {
            revert NotBorrower(msg.sender, info.borrower);
        }
        if (info.isReturned) {
            revert AlreadyReturned(tokenId);
        }
        
        // Update loan info
        info.statusAtReturn = afterStatus;
        info.isReturned = true;
        info.imageAfterHash = imageAfterHash;
        
        // Calculate penalty and reputation change
        (uint256 penalty, int256 repChange) = _calculatePenaltyAndReputation(info, afterStatus);
        
        // Update penalty info
        if (block.timestamp > info.dueDate) {
            info.latePenalty = PENALTY_LATE;
            info.overdue = true;
        }
        if (afterStatus == BookNFT.BookStatus.Damaged || afterStatus == BookNFT.BookStatus.Lost) {
            info.damagePenalty = PENALTY_DAMAGE;
            info.damaged = true;
        }
        
        // Update reputation
        userReputation[msg.sender] += repChange;
        
        // Calculate refund
        uint256 refund = info.deposit > penalty ? info.deposit - penalty : 0;
        
        // Track penalty
        if (penalty > 0) {
            totalPenaltyCollected += penalty;
        }
        
        // Refund deposit (minus penalty)
        if (refund > 0) {
            (bool success, ) = payable(msg.sender).call{value: refund}("");
            require(success, "LibraryCore: Refund failed");
        }
        
        // Update image in BookNFT if provided
        if (bytes(imageAfterHash).length > 0) {
            bookNFT.updateBookImage(tokenId, "after", imageAfterHash);
        }
        
        // Update book status
        bookNFT.updateBookStatus(tokenId, afterStatus);
        
        // Process reservations if book becomes available
        if (afterStatus == BookNFT.BookStatus.Available) {
            _processReservations(tokenId);
        }
        
        emit BookReturned(msg.sender, tokenId, penalty, repChange, imageAfterHash);
    }
    
    /**
     * @notice Tính penalty và reputation change
     * @return penalty Tổng penalty
     * @return repChange Thay đổi reputation
     */
    function _calculatePenaltyAndReputation(
        LoanInfo memory info,
        BookNFT.BookStatus afterStatus
    ) 
        internal 
        view 
        returns (uint256 penalty, int256 repChange) 
    {
        // Check late
        if (block.timestamp > info.dueDate) {
            penalty += PENALTY_LATE;
            repChange -= 2;
        }
        
        // Check damage/lost
        if (afterStatus == BookNFT.BookStatus.Damaged || afterStatus == BookNFT.BookStatus.Lost) {
            penalty += PENALTY_DAMAGE;
            repChange -= 5;
        } else {
            // Return on time and in good condition
            repChange += 1;
        }
        
        return (penalty, repChange);
    }
    
    /**
     * @notice Xử lý danh sách đặt trước khi sách available
     * @param tokenId ID của sách
     */
    function _processReservations(uint256 tokenId) internal {
        address[] storage reservations = bookReservations[tokenId];
        if (reservations.length > 0) {
            // Emit event cho người đầu tiên trong queue
            emit BookAvailableForReservation(tokenId, reservations[0]);
            // Clear reservations
            delete bookReservations[tokenId];
        }
    }
    
    // ============ Receive Function ============
    
    /**
     * @notice Cho phép contract nhận ETH
     */
    receive() external payable {}
}
