// File config tạo testnet
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.20",
  networks: {
    // Tạo testnet local
    hardhat: {
      chainId: 31337,           // ID của blockchain
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        count: 10,              // Tạo 10 tài khoản
        accountsBalance: "10000000000000000000000" // 10,000 ETH mỗi tài khoản
      },
      mining: {
        auto: true,             // Tự động mine block
        interval: 0             // Mine ngay lập tức
      }
    },
    // Kết nối từ bên ngoài
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    }
  }
};