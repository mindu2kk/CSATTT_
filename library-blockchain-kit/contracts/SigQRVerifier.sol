// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SigQRVerifier
 * @notice Optional contract to verify ECDSA signatures from QR payloads and track used nonces on-chain.
 * Storing nonces on-chain prevents replay but costs gas; for production consider server-side nonce tracking.
 */
contract SigQRVerifier {
    address public trustedSigner;
    mapping(bytes32 => bool) public usedNonces;

    event SignerUpdated(address signer);
    event NonceUsed(bytes32 indexed nonce);

    constructor(address signer) {
        trustedSigner = signer;
        emit SignerUpdated(signer);
    }

    function setTrustedSigner(address signer) external {
        // In practice guard with Ownable/Timelock
        trustedSigner = signer;
        emit SignerUpdated(signer);
    }

    function verifyAndConsume(bytes32 payloadHash, bytes32 nonce, bytes calldata sig) external returns (bool) {
        require(!usedNonces[nonce], "nonce used");
        address rcv = recoverSigner(payloadHash, sig);
        require(rcv == trustedSigner, "bad signer");
        usedNonces[nonce] = true;
        emit NonceUsed(nonce);
        return true;
    }

    function recoverSigner(bytes32 messageHash, bytes memory signature) public pure returns (address) {
        bytes32 ethHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(signature);
        return ecrecover(ethHash, v, r, s);
    }

    function splitSignature(bytes memory sig) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "sig length");
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }
}
