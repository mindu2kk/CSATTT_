// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title UserProfile
 * @notice Manages user profiles on-chain for the library system
 * @dev Stores basic user information linked to wallet addresses
 */
contract UserProfile is Ownable {
    
    // ============ Structs ============
    
    struct Profile {
        string name;           // Full name
        string email;          // Email address (hashed for privacy)
        string studentId;      // Student/Member ID
        uint256 createdAt;     // Profile creation timestamp
        uint256 updatedAt;     // Last update timestamp
        bool isActive;         // Profile status
        uint256 reputation;    // User reputation score
    }
    
    // ============ State Variables ============
    
    /// @notice Mapping from wallet address to user profile
    mapping(address => Profile) public profiles;
    
    /// @notice Mapping from student ID to wallet address (for uniqueness)
    mapping(string => address) public studentIdToAddress;
    
    /// @notice Array of all registered users
    address[] public registeredUsers;
    
    /// @notice Total number of registered users
    uint256 public totalUsers;
    
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
        uint256 newReputation
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
    
    // ============ Constructor ============
    
    constructor() Ownable(msg.sender) {}
    
    // ============ External Functions ============
    
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
        
        // Check if student ID is already used (if provided)
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
            reputation: 0
        });
        
        // Add to registered users
        registeredUsers.push(msg.sender);
        totalUsers++;
        
        emit ProfileCreated(msg.sender, _name, _studentId, block.timestamp);
    }
    
    /**
     * @notice Update user profile
     * @param _name New full name
     * @param _emailHash New hashed email
     * @param _studentId New student ID
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
            // Remove old mapping
            if (bytes(profile.studentId).length > 0) {
                delete studentIdToAddress[profile.studentId];
            }
            
            // Add new mapping (if provided)
            if (bytes(_studentId).length > 0) {
                require(
                    studentIdToAddress[_studentId] == address(0),
                    "Student ID already registered"
                );
                studentIdToAddress[_studentId] = msg.sender;
            }
        }
        
        // Update profile
        profile.name = _name;
        profile.email = _emailHash;
        profile.studentId = _studentId;
        profile.updatedAt = block.timestamp;
        
        emit ProfileUpdated(msg.sender, _name, _studentId, block.timestamp);
    }
    
    /**
     * @notice Update user reputation (only by owner or authorized contracts)
     * @param _user User address
     * @param _newReputation New reputation score
     */
    function updateReputation(
        address _user,
        uint256 _newReputation
    ) external onlyOwner hasProfile(_user) {
        uint256 oldReputation = profiles[_user].reputation;
        profiles[_user].reputation = _newReputation;
        
        emit ReputationUpdated(_user, oldReputation, _newReputation);
    }
    
    /**
     * @notice Deactivate user profile
     */
    function deactivateProfile() external hasProfile(msg.sender) {
        profiles[msg.sender].isActive = false;
        
        // Remove student ID mapping
        string memory studentId = profiles[msg.sender].studentId;
        if (bytes(studentId).length > 0) {
            delete studentIdToAddress[studentId];
        }
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get user profile
     * @param _user User address
     * @return Profile struct
     */
    function getProfile(address _user) external view returns (Profile memory) {
        require(profiles[_user].isActive, "Profile does not exist");
        return profiles[_user];
    }
    
    /**
     * @notice Check if user has profile
     * @param _user User address
     * @return bool True if profile exists and is active
     */
    function hasActiveProfile(address _user) external view returns (bool) {
        return profiles[_user].isActive;
    }
    
    /**
     * @notice Get user by student ID
     * @param _studentId Student ID
     * @return address User wallet address
     */
    function getUserByStudentId(string memory _studentId) external view returns (address) {
        return studentIdToAddress[_studentId];
    }
    
    /**
     * @notice Get all registered users (paginated)
     * @param _offset Starting index
     * @param _limit Number of users to return
     * @return users Array of user addresses
     */
    function getRegisteredUsers(
        uint256 _offset,
        uint256 _limit
    ) external view returns (address[] memory users) {
        require(_offset < totalUsers, "Offset out of bounds");
        
        uint256 end = _offset + _limit;
        if (end > totalUsers) {
            end = totalUsers;
        }
        
        users = new address[](end - _offset);
        for (uint256 i = _offset; i < end; i++) {
            users[i - _offset] = registeredUsers[i];
        }
    }
    
    /**
     * @notice Get user statistics
     * @return totalUsers Total registered users
     * @return activeUsers Active users count
     */
    function getUserStats() external view returns (uint256, uint256) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < totalUsers; i++) {
            if (profiles[registeredUsers[i]].isActive) {
                activeCount++;
            }
        }
        return (totalUsers, activeCount);
    }
}