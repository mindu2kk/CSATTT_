// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title BookNFT
 * @notice Each physical copy of a book corresponds to a unique ERC-721 tokenId.
 * Metadata URI should point to IPFS/HTTPS JSON describing title, author, cover, and condition.
 */
contract BookNFT is ERC721, Ownable {
    using Strings for uint256;

    string private _baseTokenURI;

    enum Condition { NEW, GOOD, FAIR, POOR }
    mapping(uint256 => Condition) public conditionOf;

    event ConditionUpdated(uint256 indexed tokenId, Condition condition);

    constructor(string memory baseUri) ERC721("Library Book", "BOOK") Ownable(msg.sender) {
        _baseTokenURI = baseUri;
    }

    function mint(address to, uint256 tokenId, Condition initCondition) external onlyOwner {
        _safeMint(to, tokenId);
        conditionOf[tokenId] = initCondition;
    }

    function setCondition(uint256 tokenId, Condition c) external onlyOwner {
        require(_exists(tokenId), "no token");
        conditionOf[tokenId] = c;
        emit ConditionUpdated(tokenId, c);
    }

    function setBaseURI(string calldata newBase) external onlyOwner {
        _baseTokenURI = newBase;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
}
