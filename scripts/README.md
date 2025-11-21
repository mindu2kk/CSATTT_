# Blockchain Scripts

Essential scripts for the Library Blockchain System.

## Available Scripts

### 🚀 Deployment Scripts

- **`deploy.ts`** - Main deployment script
  - Deploys BookNFT and LibraryCore contracts
  - Sets up authorization between contracts
  - Mints sample books for testing
  - Saves contract addresses to `web/contracts.json`

- **`deploy-minimal.ts`** - Minimal deployment for quick testing
  - Deploys minimal versions of contracts
  - Faster deployment with basic functionality
  - Good for development and testing

### 🔧 Interaction Scripts

- **`interact.ts`** - Contract interaction script
  - Tests borrow/return functionality
  - Demonstrates basic usage patterns
  - Useful for manual testing

### 🧪 Testing Scripts

- **`test-system.ts`** - Comprehensive system test suite
  - Tests all contract functionality
  - Includes error handling tests
  - Provides detailed gas usage reports
  - Validates entire system integrity

### ✅ Verification Scripts

- **`verify-deployment.ts`** - Deployment verification
  - Verifies contracts are properly deployed
  - Checks contract permissions and setup
  - Tests basic functionality
  - Provides system diagnostics

## Usage

Make sure Hardhat node is running:
```bash
npx hardhat node
```

Then run any script:
```bash
npx hardhat run scripts/deploy.ts --network localhost
npx hardhat run scripts/interact.ts --network localhost
npx hardhat run scripts/test-system.ts --network localhost
npx hardhat run scripts/verify-deployment.ts --network localhost
```

## Dependencies

All scripts require:
- Hardhat environment
- Deployed contracts (for interaction/testing scripts)
- Local blockchain node running