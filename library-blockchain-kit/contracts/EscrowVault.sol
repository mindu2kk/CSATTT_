// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20Like {
    function transferFrom(address, address, uint256) external returns (bool);
    function transfer(address, uint256) external returns (bool);
}

contract EscrowVault {
    address public libraryCore;
    error OnlyCore();
    error CoreAlreadySet();

    mapping(bytes32 => uint256) public depositOf; // key = keccak(user, bookId)
    event Locked(address indexed token, address indexed user, uint256 indexed bookId, uint256 amount);
    event Released(address indexed token, address indexed to, uint256 indexed bookId, uint256 amount);
    event CoreSet(address core);

    constructor() {}

    function setCore(address _core) external {
        if (libraryCore != address(0)) revert CoreAlreadySet();
        libraryCore = _core;
        emit CoreSet(_core);
    }

    modifier onlyCore() { if (msg.sender != libraryCore) revert OnlyCore(); _; }

    function lock(address token, address user, uint256 bookId, uint256 amt) external onlyCore {
        require(IERC20Like(token).transferFrom(user, address(this), amt), "transferFrom failed");
        bytes32 key = keccak256(abi.encode(user, bookId));
        depositOf[key] += amt;
        emit Locked(token, user, bookId, amt);
    }

    function release(address token, address to, uint256 bookId, uint256 amt) external onlyCore {
        bytes32 key = keccak256(abi.encode(to, bookId));
        uint256 bal = depositOf[key];
        require(bal >= amt, "insufficient");
        depositOf[key] = bal - amt;
        require(IERC20Like(token).transfer(to, amt), "transfer failed");
        emit Released(token, to, bookId, amt);
    }
}
