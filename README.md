# Aave-Sushiswap-Uniswap Flashloan Arbitrage

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](package.json)
[![Solidity](https://img.shields.io/badge/Solidity-%5E0.8.0-blue)](contracts/flashloan/FlashloanV3.sol)

A smart contract system for executing flash loan arbitrage between Uniswap and Sushiswap using Aave's flash loan feature.

## Overview

This project implements an automated arbitrage system using Aave V3 (migration complete) that:
1. Obtains a flash loan from Aave
2. Executes trades on Uniswap/Sushiswap to capture price differences
3. Repays the flash loan with fees
4. Retains the profit from the arbitrage

<details>
<summary>🏗 Architecture</summary>

- Smart contracts written in Solidity for flash loan execution and DEX interaction
- Hardhat development environment for testing and deployment
- Integration with Aave V3 lending pools
- Support for both ETH and ERC20 tokens
- Gas-optimized contract design (<300k gas per transaction)
</details>

## 🚀 Key Features

- **Flash Loan Integration**: Seamless integration with Aave's flash loan feature
- **Multi-DEX Support**: Trade across Uniswap and Sushiswap for optimal arbitrage
- **Token Support**: Handle both ETH and ERC20 tokens
- **Gas Optimization**: Efficient contract design for cost-effective execution
- **Safety Features**: Built-in checks and balances for secure operation
- **Owner Controls**: Protected functions for contract management

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/doubletap-dave/aave-sushiswap-uniswap-flashloan.git
cd aave-sushiswap-uniswap-flashloan
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Required environment variables:
```env
ALCHEMY_API_URL_SEPOLIA=your_alchemy_sepolia_url
PRIVATE_KEY=your_wallet_private_key
AAVE_POOL_PROVIDER_ADDRESS=sepolia_pool_provider_address
COINMARKETCAP_API_KEY=optional_for_gas_reporting
```

## 💻 Usage

### Compile Contracts
```bash
npm run compile
```

### Run Tests
```bash
npm test
```

### Deploy to Sepolia Testnet
```bash
npx hardhat ignition deploy ignition/modules/FlashLoanArb.js --network sepolia
```

### Example: Execute Flash Loan

```solidity
// Initialize contract
FlashloanV3 flashloan = new FlashloanV3(POOL_ADDRESS);

// Execute simple flash loan
flashloan.flashloanSimple(TOKEN_ADDRESS, AMOUNT);

// Execute multi-asset flash loan
address[] memory tokens = new address[](2);
uint256[] memory amounts = new uint256[](2);
tokens[0] = TOKEN_A_ADDRESS;
tokens[1] = TOKEN_B_ADDRESS;
amounts[0] = AMOUNT_A;
amounts[1] = AMOUNT_B;
flashloan.flashloanMultiple(tokens, amounts);
```

## ⚙️ Configuration

<details>
<summary>Flash Loan Settings</summary>

- Default ETH flash loan amount: 1 ETH
- Default token flash loan amount: 1000 tokens
- Flash loan fee: 0.05%
- Minimum balance required: 0.09% of flash loan amount (for fees)
</details>

<details>
<summary>Supported Networks</summary>

- Sepolia Testnet (recommended for testing)
- Ethereum Mainnet
- Local Hardhat Network (development)
</details>

## 🔧 Development

### Prerequisites
- Node.js >=18.0.0
- Hardhat
- Alchemy API key
- Wallet with testnet ETH

### Testing
The project includes comprehensive tests:
```bash
# Run all tests
npm test

# Run specific test file
npx hardhat test test/flashloan/test-flashloan-arbitrage.js
```

### Gas Optimization
Contract is optimized for gas efficiency:
- Minimal storage usage
- Efficient token handling
- Optimized arbitrage execution path

## 📄 API Documentation

### Core Functions

#### `flashloan(address _token)`
Execute a flash loan with default amount for specified token.

#### `flashloanWithAmount(address _token, uint256 _amount)`
Execute a flash loan with custom amount for specified token.

#### `withdrawToken(address _token)`
Withdraw tokens from the contract (owner only).

## 🚀 Deployment

1. Validate deployment environment:
```bash
npx hardhat run scripts/validate-deployment-env.js --network sepolia
```

2. Deploy contract:
```bash
npx hardhat ignition deploy ignition/modules/FlashLoanArb.js --network sepolia
```

3. Verify on Etherscan:
```bash
npx hardhat verify --network sepolia <deployed_contract_address> <pool_provider_address>
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Resources

- [Aave V3 Documentation](https://docs.aave.com/developers/v/3.0/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Sepolia Testnet Explorer](https://sepolia.etherscan.io/)
- [Uniswap V2 Documentation](https://docs.uniswap.org/contracts/v2/overview)
- [Sushiswap Documentation](https://dev.sushi.com/docs/Overview)