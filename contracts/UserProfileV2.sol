// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title UserProfileV2
 * @notice Manages user profiles với authorized contract support
 * @dev Cho phép LibraryCore update reputation
 */
contract UserProfileV2 is Ownable {
    
    // ============ Structs ============
    
    struct Profile {
        string name;           // Full name
        string email;          // Email address (hashed for privacy)
        string studentId;      // Student/Member ID
        uint256 createdAt;     // Profile creation timestamp
        uint256 updatedAt;     // Last update timestamp
        bool isActive;         // Profile status
        uint256 reputation;    // User reputation score (starts at 0)
    }
    
    // ============ State Variables ============
    
    /// @notice Mapping from wallet address to user profile
    mapping(address => Profile) public profiles;
    
    /// @notice Mapping from student ID to wallet address
    mapping(string => address) public studentIdToAddress;
    
    /// @notice Array of all registered users
    address[] public registeredUsers;
    
    /// @notice Total number of registered users
    uint256 public totalUsers;
    
    /// @notice Authorized contracts that can update reputation
    mapping(address => bool) public authorizedUpdaters;
    
    // ============ Events ============
    
    event ProfileCreated(
        address indexed user,
        string name,
        string studentId,
        uint256 timestamp
    );
    
    event ProfileUpdated(
        address indexed user,
        string name,
        string studentId,
        uint256 timestamp
    );
    
    event ReputationUpdated(
        address indexed user,
        uint256 oldReputation,
        uint256 newReputation,
        address indexed updater
    );
    
    event AuthorizedUpdaterSet(
        address indexed updater,
        bool authorized
    );
    
    // ============ Modifiers ============
    
    modifier hasProfile(address user) {
        require(profiles[user].isActive, "User profile does not exist");
        _;
    }
    
    modifier noProfile(address user) {
        require(!profiles[user].isActive, "User profile already exists");
        _;
    }
    
    modifier onlyAuthorized() {
        require(
            msg.sender == owner() || authorizedUpdaters[msg.sender],
            "UserProfile: Not authorized"
        );
        _;
    }
    
    // ============ Constructor ============
    
    constructor() Ownable(msg.sender) {}
    
    // ============ Admin Functions ============
    
    /**
     * @notice Authorize contract to update reputations
     * @param updater Address of contract (e.g., LibraryCore)
     * @param authorized True to authorize, false to revoke
     */
    function setAuthorizedUpdater(address updater, bool authorized) external onlyOwner {
        require(updater != address(0), "Invalid address");
        authorizedUpdaters[updater] = authorized;
        emit AuthorizedUpdaterSet(updater, authorized);
    }
    
    // ============ User Functions ============
    
    /**
     * @notice Create a new user profile
     * @param _name Full name of the user
     * @param _emailHash Hashed email for privacy
     * @param _studentId Student or member ID
     */
    function createProfile(
        string memory _name,
        string memory _emailHash,
        string memory _studentId
    ) external noProfile(msg.sender) {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(bytes(_emailHash).length > 0, "Email hash cannot be empty");
        
        // Check if student ID is already used
        if (bytes(_studentId).length > 0) {
            require(
                studentIdToAddress[_studentId] == address(0),
                "Student ID already registered"
            );
            studentIdToAddress[_studentId] = msg.sender;
        }
        
        // Create profile
        profiles[msg.sender] = Profile({
            name: _name,
            email: _emailHash,
            studentId: _studentId,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            isActive: true,
            reputation: 0  // Start at 0
        });
        
        // Add to registered users
        registeredUsers.push(msg.sender);
        totalUsers++;
        
        emit ProfileCreated(msg.sender, _name, _studentId, block.timestamp);
    }
    
    /**
     * @notice Update user profile
     */
    function updateProfile(
        string memory _name,
        string memory _emailHash,
        string memory _studentId
    ) external hasProfile(msg.sender) {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(bytes(_emailHash).length > 0, "Email hash cannot be empty");
        
        Profile storage profile = profiles[msg.sender];
        
        // Update student ID mapping if changed
        if (keccak256(bytes(profile.studentId)) != keccak256(bytes(_studentId))) {
            if (bytes(profile.studentId).length > 0) {
                delete studentIdToAddress[profile.studentId];
            }
            
            if (bytes(_studentId).length > 0) {
                require(
                    studentIdToAddress[_studentId] == address(0),
                    "Student ID already registered"
                );
                studentIdToAddress[_studentId] = msg.sender;
            }
        }
        
        profile.name = _name;
        profile.email = _emailHash;
        profile.studentId = _studentId;
        profile.updatedAt = block.timestamp;
        
        emit ProfileUpdated(msg.sender, _name, _studentId, block.timestamp);
    }
    
    /**
     * @notice Update reputation - CHỈ AUTHORIZED CONTRACTS (e.g., LibraryCore)
     * @param _user User address
     * @param _newReputation New reputation score
     */
    function updateReputation(
        address _user,
        uint256 _newReputation
    ) external onlyAuthorized hasProfile(_user) {
        uint256 oldReputation = profiles[_user].reputation;
        profiles[_user].reputation = _newReputation;
        
        emit ReputationUpdated(_user, oldReputation, _newReputation, msg.sender);
    }
    
    /**
     * @notice Deactivate profile
     */
    function deactivateProfile() external hasProfile(msg.sender) {
        profiles[msg.sender].isActive = false;
        
        string memory studentId = profiles[msg.sender].studentId;
        if (bytes(studentId).length > 0) {
            delete studentIdToAddress[studentId];
        }
    }
    
    // ============ View Functions ============
    
    function getProfile(address _user) external view returns (Profile memory) {
        require(profiles[_user].isActive, "Profile does not exist");
        return profiles[_user];
    }
    
    function hasActiveProfile(address _user) external view returns (bool) {
        return profiles[_user].isActive;
    }
    
    function getUserByStudentId(string memory _studentId) external view returns (address) {
        return studentIdToAddress[_studentId];
    }
    
    function getRegisteredUsers(
        uint256 _offset,
        uint256 _limit
    ) external view returns (address[] memory) {
        require(_offset < totalUsers, "Offset out of bounds");
        
        uint256 end = _offset + _limit;
        if (end > totalUsers) end = totalUsers;
        
        address[] memory result = new address[](end - _offset);
        for (uint256 i = _offset; i < end; i++) {
            result[i - _offset] = registeredUsers[i];
        }
        return result;
    }
    
    function getUserStats() external view returns (uint256 total, uint256 active) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < totalUsers; i++) {
            if (profiles[registeredUsers[i]].isActive) {
                activeCount++;
            }
        }
        return (totalUsers, activeCount);
    }
}



