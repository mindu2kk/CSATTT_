/**
 * Script to verify and fix all configuration conflicts
 * Validates blockchain configuration across the entire project
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFYING PROJECT CONFIGURATION...\n');

// Expected values for local development
const EXPECTED = {
    chainId: 31337,
    chainIdHex: '0x7a69',
    rpcUrl: 'http://127.0.0.1:8545',
    network: 'localhost'
};

let hasErrors = false;
let warnings = [];

// 1. Check web/contracts.json
console.log('1️⃣ Checking web/contracts.json...');
try {
    const contractsPath = path.join(__dirname, 'web', 'contracts.json');
    const contracts = JSON.parse(fs.readFileSync(contractsPath, 'utf8'));
    
    const chainId = typeof contracts.chainId === 'string' ? parseInt(contracts.chainId) : contracts.chainId;
    
    if (chainId !== EXPECTED.chainId) {
        console.log(`   ❌ Chain ID mismatch: ${chainId} (expected ${EXPECTED.chainId})`);
        hasErrors = true;
    } else {
        console.log(`   ✅ Chain ID correct: ${chainId}`);
    }
    
    if (contracts.network !== EXPECTED.network) {
        console.log(`   ❌ Network mismatch: ${contracts.network} (expected ${EXPECTED.network})`);
        hasErrors = true;
    } else {
        console.log(`   ✅ Network correct: ${contracts.network}`);
    }
    
    console.log(`   📋 BookNFT: ${contracts.bookNFT}`);
    console.log(`   📋 LibraryCore: ${contracts.libraryCore}`);
    
} catch (error) {
    console.log(`   ❌ Error reading contracts.json: ${error.message}`);
    hasErrors = true;
}

// 2. Check Java application.properties
console.log('\n2️⃣ Checking Java application.properties...');
try {
    const propsPath = path.join(__dirname, 'csattt', 'src', 'main', 'resources', 'application.properties');
    const props = fs.readFileSync(propsPath, 'utf8');
    
    // Check RPC URL
    if (props.includes('blockchain.network.url=http://127.0.0.1:8545')) {
        console.log(`   ✅ RPC URL correct`);
    } else if (props.includes('blockchain.network.url=http://localhost:8545')) {
        console.log(`   ⚠️  RPC URL uses localhost (should be 127.0.0.1)`);
    } else {
        console.log(`   ❌ RPC URL incorrect`);
        hasErrors = true;
    }
    
    // Extract contract addresses
    const bookNFTMatch = props.match(/blockchain\.contract\.bookNFT=(.+)/);
    const libraryCoreMatch = props.match(/blockchain\.contract\.libraryCore=(.+)/);
    
    if (bookNFTMatch) {
        console.log(`   📋 BookNFT: ${bookNFTMatch[1]}`);
    }
    if (libraryCoreMatch) {
        console.log(`   📋 LibraryCore: ${libraryCoreMatch[1]}`);
    }
    
} catch (error) {
    console.log(`   ❌ Error reading application.properties: ${error.message}`);
    hasErrors = true;
}

// 3. Check hardhat.config.ts
console.log('\n3️⃣ Checking hardhat.config.ts...');
try {
    const hardhatPath = path.join(__dirname, 'hardhat.config.ts');
    const hardhat = fs.readFileSync(hardhatPath, 'utf8');
    
    if (hardhat.includes('hardhat:') && hardhat.includes('type: "edr-simulated"')) {
        console.log(`   ✅ Hardhat network configured (default chain ID: 31337)`);
    } else {
        console.log(`   ⚠️  Hardhat network configuration may be custom`);
    }
    
} catch (error) {
    console.log(`   ❌ Error reading hardhat.config.ts: ${error.message}`);
}

// 4. Check Python server configuration
console.log('\n4️⃣ Checking Python server...');
try {
    const pythonServerPath = path.join(__dirname, 'python-blockchain-server', 'blockchain_server.py');
    if (fs.existsSync(pythonServerPath)) {
        console.log('   ✅ Python server found');
        const requirementsPath = path.join(__dirname, 'python-blockchain-server', 'requirements.txt');
        if (fs.existsSync(requirementsPath)) {
            console.log('   ✅ Requirements.txt exists');
        } else {
            warnings.push('requirements.txt not found in python-blockchain-server');
        }
    } else {
        warnings.push('Python blockchain server not found');
    }
} catch (error) {
    warnings.push(`Error checking Python server: ${error.message}`);
}

// 5. Verify Hardhat configuration
console.log('\n5️⃣ Checking hardhat.config.ts...');
try {
    const hardhatPath = path.join(__dirname, 'hardhat.config.ts');
    if (fs.existsSync(hardhatPath)) {
        console.log('   ✅ Hardhat config exists');
        const config = fs.readFileSync(hardhatPath, 'utf8');
        if (config.includes('chainId: 31337')) {
            console.log('   ✅ Chain ID configured correctly');
        } else {
            hasErrors = true;
            console.log('   ❌ Chain ID not set to 31337');
        }
    } else {
        hasErrors = true;
        console.log('   ❌ hardhat.config.ts not found');
    }
} catch (error) {
    hasErrors = true;
    console.log(`   ❌ Error reading hardhat.config.ts: ${error.message}`);
}

// 6. Summary
console.log('\n' + '='.repeat(60));
if (hasErrors) {
    console.log('❌ CONFIGURATION ERRORS DETECTED!');
    console.log('\n📝 TO FIX:');
    console.log('1. Make sure web/contracts.json has chainId: 31337 (number, not string)');
    console.log('2. Make sure all RPC URLs use http://127.0.0.1:8545');
    console.log('3. Run deployment script to update contract addresses');
    console.log('\n🔧 Run: npm run deploy');
    process.exit(1);
} else {
    console.log('✅ ALL CONFIGURATIONS LOOK GOOD!');
    
    if (warnings.length > 0) {
        console.log('\n⚠️  WARNINGS:');
        warnings.forEach((warning, i) => {
            console.log(`   ${i + 1}. ${warning}`);
        });
    }
    
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Start Hardhat node:       npx hardhat node');
    console.log('2. Deploy contracts:         npm run deploy');
    console.log('3. Start Java backend:       cd csattt && mvnw spring-boot:run');
    console.log('4. Start web server:         cd web && python start-server.py');
    console.log('5. Start Python API server:  cd python-blockchain-server && python blockchain_server.py');
    console.log('6. Connect MetaMask to Hardhat Local (Chain ID: 31337)');
    console.log('\n🔗 URLs:');
    console.log('   - Hardhat RPC:      http://127.0.0.1:8545');
    console.log('   - Web Interface:    http://localhost:8080');
    console.log('   - Java Backend:     http://localhost:8081');
    console.log('   - Python API:       http://localhost:8001');
    console.log('   - API Docs:         http://localhost:8001/docs');
}
console.log('='.repeat(60));
