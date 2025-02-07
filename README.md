# Aave-Sushiswap-Uniswap Flashloan Arbitrage

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](package.json)
[![Solidity](https://img.shields.io/badge/Solidity-%5E0.8.20-blue)](contracts/flashloan/UniswapV4FlashArbitrage.sol)

A smart contract system for executing flash loan arbitrage between Uniswap V4 and Sushiswap using Uniswap's flash accounting feature.

## Overview

This project implements an automated arbitrage system that:
1. Utilizes Uniswap V4's flash accounting for capital-efficient operations
2. Executes trades between Uniswap V4 and Sushiswap to capture price differences
3. Leverages V4's singleton pool architecture for gas optimization
4. Implements custom hooks for enhanced arbitrage opportunities

<details>
<summary>🏗 Architecture</summary>

- Smart contracts written in Solidity for flash accounting and DEX interaction
- Hardhat development environment for testing and deployment
- Integration with Uniswap V4 PoolManager
- Custom hooks for pre and post-swap operations
- Support for both ETH and ERC20 tokens
- Gas-optimized contract design using V4's singleton architecture
</details>

## 🚀 Key Features

- **Uniswap V4 Integration**: Leveraging V4's singleton pool architecture and hooks system
- **Flash Accounting**: Efficient capital utilization through V4's native flash accounting
- **Multi-DEX Support**: Trade across Uniswap V4 and Sushiswap for optimal arbitrage
- **Custom Hooks**: Pre and post-swap hooks for enhanced arbitrage opportunities
- **Gas Optimization**: Efficient contract design using V4's architecture
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
UNISWAP_V4_POOL_MANAGER=pool_manager_address
SUSHISWAP_ROUTER_ADDRESS=sushiswap_router_address
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
npx hardhat run scripts/deployment/migrateToV4.js --network sepolia
```

### Example: Execute Flash Arbitrage

```solidity
// Initialize contracts
UniswapV4FlashArbitrage arbitrage = new UniswapV4FlashArbitrage(
    POOL_MANAGER_ADDRESS,
    SUSHISWAP_ROUTER_ADDRESS,
    MIN_PROFIT_THRESHOLD
);

// Execute arbitrage with flash accounting
arbitrage.executeArbitrage(
    TOKEN0_ADDRESS,
    TOKEN1_ADDRESS,
    AMOUNT0,
    AMOUNT1,
    HOOK_DATA
);

// Using hooks for custom logic
UniswapV4ArbitrageHook hook = new UniswapV4ArbitrageHook(
    POOL_MANAGER_ADDRESS,
    MIN_PROFIT_THRESHOLD
);

// Set up hook permissions
hook.setAuthorizedCaller(ARBITRAGE_CONTRACT, true);
```

## ⚙️ Configuration

<details>
<summary>Flash Accounting Settings</summary>

- Minimum profit threshold: Configurable per deployment
- Hook permissions: Managed by contract owner
- Gas optimization: Utilizes V4's singleton architecture
- Safety checks: Built-in slippage and profit validation
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
npx hardhat test test/flashloan/test-flashloan-v4-arbitrage.js
```

### Gas Optimization
Contract is optimized for gas efficiency:
- Singleton pool architecture
- Minimal storage usage
- Efficient hook implementation
- Optimized arbitrage execution path

## 📄 API Documentation

### Core Functions

#### `executeArbitrage(address token0, address token1, uint256 amount0, uint256 amount1, bytes calldata hookData)`
Execute a flash-accounting-based arbitrage between Uniswap V4 and Sushiswap.

#### `beforeSwap(address sender, PoolKey calldata key, SwapParams calldata params)`
Hook function called before swap execution for custom validation and setup.

#### `afterSwap(address sender, PoolKey calldata key, SwapParams calldata params, BalanceDelta delta)`
Hook function called after swap execution for profit capture and cleanup.

## 🚀 Deployment

1. Validate deployment environment:
```bash
npx hardhat run scripts/validate-deployment-env.js --network sepolia
```

2. Deploy V4 contracts:
```bash
npx hardhat run scripts/deployment/migrateToV4.js --network sepolia
```

3. Verify on Etherscan:
```bash
npx hardhat verify --network sepolia <deployed_contract_address> <constructor_args>
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

- [Uniswap V4 Documentation](https://docs.uniswap.org/contracts/v4/overview)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Sepolia Testnet Explorer](https://sepolia.etherscan.io/)
- [Sushiswap Documentation](https://dev.sushi.com/docs/Overview)