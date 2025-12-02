// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RoleManager
 * @notice Quản lý phân quyền cho hệ thống thư viện
 * @dev Admin và User được phân biệt rõ ràng trên blockchain
 */
contract RoleManager is Ownable {
    
    // ============ Enums ============
    
    enum Role {
        None,       // 0 - Không có role
        User,       // 1 - User thông thường
        Librarian,  // 2 - Thủ thư (có thể update book status)
        Admin       // 3 - Admin (full permissions)
    }
    
    // ============ State Variables ============
    
    /// @notice Mapping từ address đến role
    mapping(address => Role) public roles;
    
    /// @notice Danh sách admins
    address[] public admins;
    
    /// @notice Danh sách librarians
    address[] public librarians;
    
    /// @notice Danh sách users
    address[] public users;
    
    /// @notice Total counts
    uint256 public totalAdmins;
    uint256 public totalLibrarians;
    uint256 public totalUsers;
    
    // ============ Events ============
    
    event RoleGranted(address indexed account, Role role, uint256 timestamp);
    event RoleRevoked(address indexed account, Role oldRole, uint256 timestamp);
    event RoleChanged(address indexed account, Role oldRole, Role newRole, uint256 timestamp);
    
    // ============ Modifiers ============
    
    modifier onlyAdmin() {
        require(isAdmin(msg.sender), "RoleManager: Caller is not admin");
        _;
    }
    
    modifier onlyAdminOrLibrarian() {
        require(
            isAdmin(msg.sender) || isLibrarian(msg.sender), 
            "RoleManager: Caller is not admin or librarian"
        );
        _;
    }
    
    // ============ Constructor ============
    
    constructor() Ownable(msg.sender) {
        // Owner is automatically Admin
        _grantRole(msg.sender, Role.Admin);
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Grant role to an address (only owner)
     * @param account Address to grant role
     * @param role Role to grant
     */
    function grantRole(address account, Role role) external onlyOwner {
        require(account != address(0), "RoleManager: Invalid address");
        require(role != Role.None, "RoleManager: Cannot grant None role");
        
        Role oldRole = roles[account];
        
        if (oldRole != Role.None) {
            // Revoke old role first
            _revokeRole(account, oldRole);
        }
        
        _grantRole(account, role);
        
        if (oldRole != Role.None) {
            emit RoleChanged(account, oldRole, role, block.timestamp);
        }
    }
    
    /**
     * @notice Revoke role from an address (only owner)
     * @param account Address to revoke role
     */
    function revokeRole(address account) external onlyOwner {
        require(account != address(0), "RoleManager: Invalid address");
        require(account != owner(), "RoleManager: Cannot revoke owner role");
        
        Role oldRole = roles[account];
        require(oldRole != Role.None, "RoleManager: No role to revoke");
        
        _revokeRole(account, oldRole);
        emit RoleRevoked(account, oldRole, block.timestamp);
    }
    
    /**
     * @notice Batch grant roles (only owner)
     * @param accounts Array of addresses
     * @param role Role to grant to all
     */
    function batchGrantRole(address[] calldata accounts, Role role) external onlyOwner {
        require(role != Role.None, "RoleManager: Cannot grant None role");
        
        for (uint256 i = 0; i < accounts.length; i++) {
            if (accounts[i] != address(0) && roles[accounts[i]] == Role.None) {
                _grantRole(accounts[i], role);
            }
        }
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Check if address is Admin
     */
    function isAdmin(address account) public view returns (bool) {
        return roles[account] == Role.Admin || account == owner();
    }
    
    /**
     * @notice Check if address is Librarian
     */
    function isLibrarian(address account) public view returns (bool) {
        return roles[account] == Role.Librarian;
    }
    
    /**
     * @notice Check if address is User
     */
    function isUser(address account) public view returns (bool) {
        return roles[account] == Role.User;
    }
    
    /**
     * @notice Check if address has any role
     */
    function hasRole(address account) public view returns (bool) {
        return roles[account] != Role.None || account == owner();
    }
    
    /**
     * @notice Get role of address
     */
    function getRole(address account) external view returns (Role) {
        if (account == owner()) return Role.Admin;
        return roles[account];
    }
    
    /**
     * @notice Get all admins
     */
    function getAllAdmins() external view returns (address[] memory) {
        return admins;
    }
    
    /**
     * @notice Get all librarians
     */
    function getAllLibrarians() external view returns (address[] memory) {
        return librarians;
    }
    
    /**
     * @notice Get all users (paginated)
     */
    function getUsers(uint256 offset, uint256 limit) external view returns (address[] memory) {
        require(offset < totalUsers, "Offset out of bounds");
        
        uint256 end = offset + limit;
        if (end > totalUsers) end = totalUsers;
        
        address[] memory result = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = users[i];
        }
        return result;
    }
    
    /**
     * @notice Get role statistics
     */
    function getRoleStats() external view returns (
        uint256 _totalAdmins,
        uint256 _totalLibrarians,
        uint256 _totalUsers
    ) {
        return (totalAdmins, totalLibrarians, totalUsers);
    }
    
    // ============ Internal Functions ============
    
    function _grantRole(address account, Role role) internal {
        roles[account] = role;
        
        if (role == Role.Admin) {
            admins.push(account);
            totalAdmins++;
        } else if (role == Role.Librarian) {
            librarians.push(account);
            totalLibrarians++;
        } else if (role == Role.User) {
            users.push(account);
            totalUsers++;
        }
        
        emit RoleGranted(account, role, block.timestamp);
    }
    
    function _revokeRole(address account, Role role) internal {
        roles[account] = Role.None;
        
        if (role == Role.Admin) {
            _removeFromArray(admins, account);
            totalAdmins--;
        } else if (role == Role.Librarian) {
            _removeFromArray(librarians, account);
            totalLibrarians--;
        } else if (role == Role.User) {
            _removeFromArray(users, account);
            totalUsers--;
        }
    }
    
    function _removeFromArray(address[] storage array, address account) internal {
        for (uint256 i = 0; i < array.length; i++) {
            if (array[i] == account) {
                array[i] = array[array.length - 1];
                array.pop();
                break;
            }
        }
    }
}



