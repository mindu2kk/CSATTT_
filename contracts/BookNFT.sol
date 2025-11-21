// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BookNFT
 * @author Library Blockchain System
 * @notice Quản lý sách dưới dạng NFT (ERC721)
 * @dev Mỗi cuốn sách là một NFT duy nhất với metadata và trạng thái riêng
 */
contract BookNFT is ERC721, Ownable {
    
    // ============ Enums ============
    
    /**
     * @notice Trạng thái của sách
     * @dev Available: Sẵn sàng cho mượn
     *      Borrowed: Đang được mượn
     *      Damaged: Bị hỏng
     *      Lost: Bị mất
     *      Old: Sách cũ (vẫn có thể mượn)
     *      New: Sách mới
     */
    enum BookStatus { 
        Available,  // 0
        Borrowed,   // 1
        Damaged,    // 2
        Lost,       // 3
        Old,        // 4
        New         // 5
    }
    
    /**
     * @notice Tình trạng vật lý của sách
     * @dev New: Mới hoàn toàn
     *      Good: Tốt
     *      Fair: Khá
     *      Poor: Kém
     */
    enum Condition { 
        New,   // 0
        Good,  // 1
        Fair,  // 2
        Poor   // 3
    }
    
    // ============ Structs ============
    
    /**
     * @notice Thông tin chi tiết của một cuốn sách
     * @param name Tên sách
     * @param description Mô tả sách
     * @param status Trạng thái hiện tại
     * @param condition Tình trạng vật lý
     * @param createdAt Timestamp khi tạo
     * @param imageBeforeHash IPFS hash hoặc URL của ảnh trước khi mượn
     * @param imageAfterHash IPFS hash hoặc URL của ảnh sau khi trả
     */
    struct BookInfo {
        string name;
        string description;
        BookStatus status;
        Condition condition;
        uint256 createdAt;
        string imageBeforeHash;
        string imageAfterHash;
    }
    
    // ============ State Variables ============
    
    /// @notice ID sẽ được gán cho cuốn sách tiếp theo
    uint256 public nextBookId;
    
    /// @notice Mapping từ token ID đến thông tin sách
    mapping(uint256 => BookInfo) public bookInfos;
    
    /// @notice Mapping các địa chỉ được phép cập nhật trạng thái sách
    mapping(address => bool) public authorizedUpdaters;
    
    // ============ Events ============
    
    /// @notice Emit khi mint sách mới
    event BookMinted(
        uint256 indexed tokenId, 
        string name, 
        BookStatus status, 
        Condition condition
    );
    
    /// @notice Emit khi cập nhật trạng thái sách
    event BookStatusUpdated(
        uint256 indexed tokenId, 
        BookStatus oldStatus, 
        BookStatus newStatus
    );
    
    /// @notice Emit khi cập nhật tình trạng sách
    event ConditionUpdated(
        uint256 indexed tokenId, 
        Condition oldCondition, 
        Condition newCondition
    );
    
    /// @notice Emit khi cập nhật ảnh sách
    event BookImageUpdated(
        uint256 indexed tokenId, 
        string imageType, 
        string imageHash
    );
    
    /// @notice Emit khi cập nhật thông tin sách
    event BookInfoUpdated(
        uint256 indexed tokenId,
        string name,
        string description
    );
    
    // ============ Modifiers ============
    
    /**
     * @notice Chỉ cho phép owner hoặc authorized updaters
     */
    modifier onlyAuthorized() {
        require(
            msg.sender == owner() || authorizedUpdaters[msg.sender], 
            "BookNFT: Not authorized"
        );
        _;
    }
    
    /**
     * @notice Kiểm tra sách tồn tại
     */
    modifier bookExists(uint256 tokenId) {
        require(
            _ownerOf(tokenId) != address(0), 
            "BookNFT: Book does not exist"
        );
        _;
    }
    
    // ============ Constructor ============
    
    constructor() ERC721("BookNFT", "BOOK") Ownable(msg.sender) {}
    
    // ============ External Functions ============
    
    /**
     * @notice Cấp hoặc thu hồi quyền cập nhật
     * @param updater Địa chỉ cần cấp/thu hồi quyền
     * @param authorized true để cấp quyền, false để thu hồi
     */
    function setAuthorizedUpdater(address updater, bool authorized) 
        external 
        onlyOwner 
    {
        require(updater != address(0), "BookNFT: Invalid address");
        authorizedUpdaters[updater] = authorized;
    }
    
    /**
     * @notice Mint sách mới (version đơn giản)
     * @param name Tên sách
     * @param description Mô tả sách
     * @param status Trạng thái ban đầu
     * @return tokenId ID của sách vừa tạo
     */
    function mintBook(
        string memory name, 
        string memory description, 
        BookStatus status
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        return _mintBookInternal(name, description, status, Condition.New, "");
    }
    
    /**
     * @notice Mint sách mới với tình trạng cụ thể
     * @param name Tên sách
     * @param description Mô tả sách
     * @param status Trạng thái ban đầu
     * @param condition Tình trạng vật lý
     * @return tokenId ID của sách vừa tạo
     */
    function mintBookWithCondition(
        string memory name, 
        string memory description, 
        BookStatus status, 
        Condition condition
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        return _mintBookInternal(name, description, status, condition, "");
    }
    
    /**
     * @notice Mint sách mới với ảnh
     * @param name Tên sách
     * @param description Mô tả sách
     * @param status Trạng thái ban đầu
     * @param condition Tình trạng vật lý
     * @param imageBeforeHash IPFS hash hoặc URL của ảnh
     * @return tokenId ID của sách vừa tạo
     */
    function mintBookWithImage(
        string memory name, 
        string memory description, 
        BookStatus status, 
        Condition condition, 
        string memory imageBeforeHash
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        return _mintBookInternal(name, description, status, condition, imageBeforeHash);
    }
    
    /**
     * @notice Cập nhật trạng thái sách
     * @param tokenId ID của sách
     * @param newStatus Trạng thái mới
     */
    function updateBookStatus(uint256 tokenId, BookStatus newStatus) 
        external 
        onlyAuthorized 
        bookExists(tokenId)
    {
        BookStatus oldStatus = bookInfos[tokenId].status;
        bookInfos[tokenId].status = newStatus;
        emit BookStatusUpdated(tokenId, oldStatus, newStatus);
    }
    
    /**
     * @notice Cập nhật tình trạng vật lý của sách
     * @param tokenId ID của sách
     * @param newCondition Tình trạng mới
     */
    function updateCondition(uint256 tokenId, Condition newCondition) 
        external 
        onlyAuthorized 
        bookExists(tokenId)
    {
        Condition oldCondition = bookInfos[tokenId].condition;
        bookInfos[tokenId].condition = newCondition;
        emit ConditionUpdated(tokenId, oldCondition, newCondition);
    }
    
    /**
     * @notice Cập nhật ảnh sách
     * @param tokenId ID của sách
     * @param imageType "before" hoặc "after"
     * @param imageHash IPFS hash hoặc URL
     */
    function updateBookImage(
        uint256 tokenId, 
        string memory imageType, 
        string memory imageHash
    ) 
        external 
        onlyAuthorized 
        bookExists(tokenId)
    {
        require(
            _isValidImageType(imageType),
            "BookNFT: Invalid image type (use 'before' or 'after')"
        );
        
        if (_compareStrings(imageType, "before")) {
            bookInfos[tokenId].imageBeforeHash = imageHash;
        } else {
            bookInfos[tokenId].imageAfterHash = imageHash;
        }
        
        emit BookImageUpdated(tokenId, imageType, imageHash);
    }
    
    /**
     * @notice Cập nhật thông tin cơ bản của sách
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
        onlyAuthorized
        bookExists(tokenId)
    {
        require(bytes(name).length > 0, "BookNFT: Name cannot be empty");
        require(bytes(description).length > 0, "BookNFT: Description cannot be empty");
        
        bookInfos[tokenId].name = name;
        bookInfos[tokenId].description = description;
        
        emit BookInfoUpdated(tokenId, name, description);
    }
    
    /**
     * @notice Batch mint nhiều sách cùng lúc
     * @param names Danh sách tên sách
     * @param descriptions Danh sách mô tả
     * @param statuses Danh sách trạng thái
     * @return tokenIds Danh sách ID của các sách vừa tạo
     */
    function batchMintBooks(
        string[] memory names,
        string[] memory descriptions,
        BookStatus[] memory statuses
    )
        external
        onlyOwner
        returns (uint256[] memory tokenIds)
    {
        require(names.length == descriptions.length, "BookNFT: Arrays length mismatch");
        require(names.length == statuses.length, "BookNFT: Arrays length mismatch");
        require(names.length > 0, "BookNFT: Empty arrays");
        
        tokenIds = new uint256[](names.length);
        
        for (uint256 i = 0; i < names.length; i++) {
            tokenIds[i] = _mintBookInternal(
                names[i],
                descriptions[i],
                statuses[i],
                Condition.New,
                ""
            );
        }
        
        return tokenIds;
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Lấy thông tin đầy đủ của sách
     * @param tokenId ID của sách
     * @return BookInfo struct chứa tất cả thông tin
     */
    function getBookInfo(uint256 tokenId) 
        external 
        view 
        bookExists(tokenId)
        returns (BookInfo memory) 
    {
        return bookInfos[tokenId];
    }
    
    /**
     * @notice Lấy trạng thái của sách
     * @param tokenId ID của sách
     * @return BookStatus trạng thái hiện tại
     */
    function getBookStatus(uint256 tokenId) 
        external 
        view 
        bookExists(tokenId)
        returns (BookStatus) 
    {
        return bookInfos[tokenId].status;
    }
    
    /**
     * @notice Lấy tình trạng vật lý của sách
     * @param tokenId ID của sách
     * @return Condition tình trạng hiện tại
     */
    function getCondition(uint256 tokenId) 
        external 
        view 
        bookExists(tokenId)
        returns (Condition) 
    {
        return bookInfos[tokenId].condition;
    }
    
    /**
     * @notice Lấy ảnh của sách
     * @param tokenId ID của sách
     * @param imageType "before" hoặc "after"
     * @return string IPFS hash hoặc URL
     */
    function getBookImage(uint256 tokenId, string memory imageType) 
        external 
        view 
        bookExists(tokenId)
        returns (string memory) 
    {
        require(
            _isValidImageType(imageType),
            "BookNFT: Invalid image type (use 'before' or 'after')"
        );
        
        if (_compareStrings(imageType, "before")) {
            return bookInfos[tokenId].imageBeforeHash;
        } else {
            return bookInfos[tokenId].imageAfterHash;
        }
    }
    
    /**
     * @notice Lấy tổng số sách đã mint
     * @return uint256 tổng số sách
     */
    function getTotalBooks() external view returns (uint256) {
        return nextBookId;
    }
    
    /**
     * @notice Lấy danh sách sách theo trạng thái
     * @param status Trạng thái cần lọc
     * @param offset Vị trí bắt đầu
     * @param limit Số lượng tối đa
     * @return tokenIds Danh sách ID sách
     * @return hasMore Còn sách nữa không
     */
    function getBooksByStatus(
        BookStatus status,
        uint256 offset,
        uint256 limit
    )
        external
        view
        returns (uint256[] memory tokenIds, bool hasMore)
    {
        require(limit > 0 && limit <= 100, "BookNFT: Invalid limit");
        
        uint256[] memory tempIds = new uint256[](limit);
        uint256 count = 0;
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < nextBookId && count < limit; i++) {
            if (_ownerOf(i) != address(0) && bookInfos[i].status == status) {
                if (currentIndex >= offset) {
                    tempIds[count] = i;
                    count++;
                }
                currentIndex++;
            }
        }
        
        // Resize array to actual count
        tokenIds = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            tokenIds[i] = tempIds[i];
        }
        
        // Check if there are more books
        hasMore = false;
        for (uint256 i = 0; i < nextBookId; i++) {
            if (_ownerOf(i) != address(0) && bookInfos[i].status == status) {
                if (currentIndex >= offset + limit) {
                    hasMore = true;
                    break;
                }
                currentIndex++;
            }
        }
        
        return (tokenIds, hasMore);
    }
    
    // ============ Internal Functions ============
    
    /**
     * @notice Internal function để mint sách
     * @dev Tránh duplicate code giữa các hàm mint
     */
    function _mintBookInternal(
        string memory name,
        string memory description,
        BookStatus status,
        Condition condition,
        string memory imageBeforeHash
    ) 
        internal 
        returns (uint256) 
    {
        require(bytes(name).length > 0, "BookNFT: Name cannot be empty");
        require(bytes(description).length > 0, "BookNFT: Description cannot be empty");
        
        uint256 tokenId = nextBookId++;
        _mint(msg.sender, tokenId);
        
        bookInfos[tokenId] = BookInfo({
            name: name,
            description: description,
            status: status,
            condition: condition,
            createdAt: block.timestamp,
            imageBeforeHash: imageBeforeHash,
            imageAfterHash: ""
        });
        
        emit BookMinted(tokenId, name, status, condition);
        
        if (bytes(imageBeforeHash).length > 0) {
            emit BookImageUpdated(tokenId, "before", imageBeforeHash);
        }
        
        return tokenId;
    }
    
    /**
     * @notice So sánh hai strings
     * @dev Solidity không có built-in string comparison
     */
    function _compareStrings(string memory a, string memory b) 
        internal 
        pure 
        returns (bool) 
    {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
    
    /**
     * @notice Kiểm tra imageType có hợp lệ không
     */
    function _isValidImageType(string memory imageType) 
        internal 
        pure 
        returns (bool) 
    {
        return _compareStrings(imageType, "before") || _compareStrings(imageType, "after");
    }
}
