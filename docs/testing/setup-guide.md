# Testing Setup Guide

## Overview

This project uses Hardhat for testing, providing comprehensive coverage of all system components through JavaScript test suites.

## Test Structure

```
├── test/                     # Hardhat JavaScript tests
│   ├── flashloan/           # Flashloan specific tests
│   │   ├── test-flashloan-v1.js          # V1 protocol tests
│   │   ├── test-flashloan-arbitrage.js   # Arbitrage specific tests
│   │   └── test-flashloan-integration.js # Integration tests
│   └── utils/              # Test utilities and helpers
```

## Running Tests

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/flashloan/test-flashloan-arbitrage.js

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run on a forked network
npx hardhat test --network hardhat --fork https://eth-mainnet.alchemyapi.io/v2/YOUR-API-KEY
```

## Test Coverage

The test suite includes:
- Unit Tests: Individual contract functions and logic (test-flashloan-v1.js)
- Integration Tests: Cross-contract interactions and DEX integrations (test-flashloan-integration.js)
- Arbitrage Tests: Specialized tests for arbitrage functionality (test-flashloan-arbitrage.js)
- Gas Optimization Tests: Monitoring and optimizing gas usage
- Error Cases: Comprehensive validation of failure scenarios
- Multi-DEX Tests: Testing interactions across multiple decentralized exchanges

## Continuous Integration

The project uses GitHub Actions for automated testing:
- Runs full test suite on every push and pull request
- Generates coverage reports using hardhat-coverage
- Performs gas usage analysis with hardhat-gas-reporter
- Validates contract deployments and interactions
- Reports test results in PR comments

## Writing New Tests

### Test Case Template
```javascript
describe("Component", function() {
    // Use loadFixture for efficient test isolation
    async function deployFixture() {
        // Setup code
    }

    before(async function() {
        // Any additional setup
    });

    it("should perform expected behavior", async function() {
        const { contract, owner } = await loadFixture(deployFixture);
        // Test implementation
    });

    after(async function() {
        // Cleanup if needed
    });
});
```

### Best Practices
1. Use descriptive test names that indicate the expected behavior
2. Test both success and failure scenarios thoroughly
3. Use fixtures for test isolation and efficiency
4. Mock external dependencies when appropriate
5. Include gas usage assertions for critical functions
6. Group related tests using describe blocks
7. Use proper assertions with descriptive messages
8. Test events and state changes explicitly

## Test Environment Setup

### Configuration
```javascript
// hardhat.config.js
module.exports = {
  networks: {
    hardhat: {
      forking: {
        url: process.env.MAINNET_RPC_URL,
        blockNumber: 12345678
      }
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false
  },
  mocha: {
    timeout: 100000
  }
};
```

## Debugging Tests

### Common Issues
1. Network timeouts: Increase timeout in hardhat.config.js
2. Gas estimation failures: Check transaction parameters
3. State contamination: Use proper test isolation with fixtures
4. Contract verification failures: Ensure correct compiler settings
5. RPC errors: Verify network configuration and node status

### Tools
- Hardhat Console: Use `console.log()` in your tests and contracts
- Gas Reporter: Enable with `REPORT_GAS=true`
- Stack Traces: Enabled by default in Hardhat
- Network Helpers: Use `loadFixture`, `time.increase()`, etc.

### Troubleshooting Commands
```bash
# Run tests with detailed logging
npx hardhat test --verbose

# Run a specific test with gas reporting
REPORT_GAS=true npx hardhat test test/specific-test.js

# Clean and recompile before testing
npx hardhat clean && npx hardhat compile && npx hardhat test
