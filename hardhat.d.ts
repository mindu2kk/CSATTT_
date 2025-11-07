import "hardhat/types/runtime";

declare module "hardhat/types/runtime" {
  export interface HardhatRuntimeEnvironment {
    ethers: typeof import("@nomicfoundation/hardhat-ethers");
  }
}

declare module "hardhat" {
  export const ethers: typeof import("@nomicfoundation/hardhat-ethers");
}

