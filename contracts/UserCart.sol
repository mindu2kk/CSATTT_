// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title UserCart
 * @notice Quản lý giỏ sách của user - THEO BLOCKCHAIN WALLET
 * @dev Mỗi wallet có cart riêng, không lưu trên web
 */
contract UserCart {
    
    // ============ Structs ============
    
    struct CartItem {
        uint256 bookId;
        uint256 addedAt;
        bool isActive;
    }
    
    // ============ State Variables ============
    
    /// @notice Cart của từng user: user address => book IDs
    mapping(address => uint256[]) public userCarts;
    
    /// @notice Track xem book đã có trong cart chưa
    mapping(address => mapping(uint256 => bool)) public isInCart;
    
    /// @notice Thời gian thêm vào cart
    mapping(address => mapping(uint256 => uint256)) public addedAt;
    
    /// @notice Total items in all carts
    uint256 public totalCartItems;
    
    // ============ Events ============
    
    event ItemAdded(address indexed user, uint256 indexed bookId, uint256 timestamp);
    event ItemRemoved(address indexed user, uint256 indexed bookId, uint256 timestamp);
    event CartCleared(address indexed user, uint256 timestamp);
    
    // ============ External Functions ============
    
    /**
     * @notice Thêm sách vào cart
     * @param bookId ID của sách
     */
    function addToCart(uint256 bookId) external {
        require(!isInCart[msg.sender][bookId], "Book already in cart");
        
        userCarts[msg.sender].push(bookId);
        isInCart[msg.sender][bookId] = true;
        addedAt[msg.sender][bookId] = block.timestamp;
        totalCartItems++;
        
        emit ItemAdded(msg.sender, bookId, block.timestamp);
    }
    
    /**
     * @notice Xóa sách khỏi cart
     * @param bookId ID của sách
     */
    function removeFromCart(uint256 bookId) external {
        require(isInCart[msg.sender][bookId], "Book not in cart");
        
        // Remove from array
        uint256[] storage cart = userCarts[msg.sender];
        for (uint256 i = 0; i < cart.length; i++) {
            if (cart[i] == bookId) {
                cart[i] = cart[cart.length - 1];
                cart.pop();
                break;
            }
        }
        
        isInCart[msg.sender][bookId] = false;
        delete addedAt[msg.sender][bookId];
        totalCartItems--;
        
        emit ItemRemoved(msg.sender, bookId, block.timestamp);
    }
    
    /**
     * @notice Xóa toàn bộ cart
     */
    function clearCart() external {
        uint256[] storage cart = userCarts[msg.sender];
        
        // Clear all isInCart flags
        for (uint256 i = 0; i < cart.length; i++) {
            uint256 bookId = cart[i];
            isInCart[msg.sender][bookId] = false;
            delete addedAt[msg.sender][bookId];
            totalCartItems--;
        }
        
        // Clear array
        delete userCarts[msg.sender];
        
        emit CartCleared(msg.sender, block.timestamp);
    }
    
    /**
     * @notice Xóa item sau khi borrow thành công
     * @param user Address của user
     * @param bookId ID của sách
     */
    function removeAfterBorrow(address user, uint256 bookId) external {
        if (isInCart[user][bookId]) {
            uint256[] storage cart = userCarts[user];
            for (uint256 i = 0; i < cart.length; i++) {
                if (cart[i] == bookId) {
                    cart[i] = cart[cart.length - 1];
                    cart.pop();
                    break;
                }
            }
            
            isInCart[user][bookId] = false;
            delete addedAt[user][bookId];
            totalCartItems--;
            
            emit ItemRemoved(user, bookId, block.timestamp);
        }
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Lấy cart của user
     * @param user Address của user
     * @return Array of book IDs
     */
    function getCart(address user) external view returns (uint256[] memory) {
        return userCarts[user];
    }
    
    /**
     * @notice Lấy cart của caller
     * @return Array of book IDs
     */
    function getMyCart() external view returns (uint256[] memory) {
        return userCarts[msg.sender];
    }
    
    /**
     * @notice Kiểm tra book có trong cart không
     * @param user Address của user
     * @param bookId ID của sách
     */
    function checkInCart(address user, uint256 bookId) external view returns (bool) {
        return isInCart[user][bookId];
    }
    
    /**
     * @notice Lấy số lượng items trong cart
     * @param user Address của user
     */
    function getCartCount(address user) external view returns (uint256) {
        return userCarts[user].length;
    }
    
    /**
     * @notice Lấy số lượng items trong cart của mình
     */
    function getMyCartCount() external view returns (uint256) {
        return userCarts[msg.sender].length;
    }
    
    /**
     * @notice Lấy cart với metadata
     * @param user Address của user
     */
    function getCartWithMetadata(address user) external view returns (
        uint256[] memory bookIds,
        uint256[] memory timestamps
    ) {
        uint256[] memory cart = userCarts[user];
        bookIds = new uint256[](cart.length);
        timestamps = new uint256[](cart.length);
        
        for (uint256 i = 0; i < cart.length; i++) {
            bookIds[i] = cart[i];
            timestamps[i] = addedAt[user][cart[i]];
        }
        
        return (bookIds, timestamps);
    }
}



