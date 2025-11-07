// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ERC20Mock {
    string public name;
    string public symbol;
    uint8 public decimals = 6;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);

    constructor(string memory _name, string memory _symbol) {
        name = _name; symbol = _symbol;
        _mint(msg.sender, 1_000_000_000 * 10**decimals); // 1e15 units for dev
    }

    function _mint(address to, uint256 amt) internal {
        balanceOf[to] += amt; totalSupply += amt;
        emit Transfer(address(0), to, amt);
    }

    function transfer(address to, uint256 amt) external returns (bool) {
        require(balanceOf[msg.sender] >= amt, "bal");
        balanceOf[msg.sender] -= amt; balanceOf[to] += amt;
        emit Transfer(msg.sender, to, amt);
        return true;
    }

    function approve(address sp, uint256 amt) external returns (bool) {
        allowance[msg.sender][sp] = amt;
        emit Approval(msg.sender, sp, amt);
        return true;
    }

    function transferFrom(address from, address to, uint256 amt) external returns (bool) {
        require(balanceOf[from] >= amt, "bal");
        uint256 al = allowance[from][msg.sender];
        require(al >= amt, "allow");
        allowance[from][msg.sender] = al - amt;
        balanceOf[from] -= amt; balanceOf[to] += amt;
        emit Transfer(from, to, amt);
        return true;
    }
}
