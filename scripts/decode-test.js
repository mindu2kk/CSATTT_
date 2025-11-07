const ethers = require('ethers');

// Test decode error data
const errorData = "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000690b75be000000000000000000000000000000000000000000000000000000000000000b5465737420426f6f6b2031000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f4669727374207465737420626f6f6b0000000000000000000000000000000000";

const ABI = [
    {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "getBookInfo",
        "outputs": [
            {"internalType": "string", "name": "name", "type": "string"},
            {"internalType": "string", "name": "description", "type": "string"},
            {"internalType": "uint8", "name": "status", "type": "uint8"},
            {"internalType": "uint256", "name": "createdAt", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

try {
    const iface = new ethers.utils.Interface(ABI);
    const decoded = iface.decodeFunctionResult('getBookInfo', errorData);
    console.log("Decoded successfully:");
    console.log("Name:", decoded[0]);
    console.log("Description:", decoded[1]);
    console.log("Status:", decoded[2].toString());
    console.log("CreatedAt:", decoded[3].toString());
} catch (error) {
    console.error("Decode failed:", error.message);
}
