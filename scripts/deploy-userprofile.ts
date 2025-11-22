import { ethers } from "hardhat";
import fs from 'fs';
import path from 'path';

async function main() {
    console.log("🚀 Deploying UserProfile contract...\n");
    
    // Get deployer
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH\n");
    
    // Deploy UserProfile
    console.log("📄 Deploying UserProfile...");
    const UserProfile = await ethers.getContractFactory("UserProfile");
    const userProfile = await UserProfile.deploy();
    await userProfile.deployed();
    
    console.log("✅ UserProfile deployed to:", userProfile.address);
    console.log("");
    
    // Update contracts.json
    const contractsPath = path.join(__dirname, '../web/contracts.json');
    let contracts: any = {};
    
    // Read existing contracts
    if (fs.existsSync(contractsPath)) {
        const contractsData = fs.readFileSync(contractsPath, 'utf8');
        contracts = JSON.parse(contractsData);
    }
    
    // Add UserProfile address
    contracts.userProfile = userProfile.address;
    
    // Write back
    fs.writeFileSync(contractsPath, JSON.stringify(contracts, null, 2));
    console.log("✅ Updated web/contracts.json with UserProfile address");
    
    // Also update FE blockchain_config
    const feContractsPath = path.join(__dirname, '../web/contracts.json');
    fs.writeFileSync(feContractsPath, JSON.stringify(contracts, null, 2));
    
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 DEPLOYMENT SUMMARY");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("UserProfile:", userProfile.address);
    console.log("Network:", (await ethers.provider.getNetwork()).name);
    console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    
    console.log("🎉 UserProfile deployment complete!");
    console.log("\n📝 Next steps:");
    console.log("1. Update FE/blockchain_config.py with UserProfile address");
    console.log("2. Copy UserProfile ABI to FE/static/js/shared/abis/");
    console.log("3. Update FE/static/js/account-blockchain.js to use UserProfile");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

