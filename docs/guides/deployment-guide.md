# Deployment Guide

## Prerequisites

Before deploying the FlashLoanArb contract to Sepolia testnet, ensure you have:

1. Node.js and npm installed
2. Required environment variables set in `.env`:
   ```
   ALCHEMY_API_URL_SEPOLIA=your_alchemy_sepolia_url
   PRIVATE_KEY=your_wallet_private_key
   AAVE_POOL_PROVIDER_ADDRESS=sepolia_pool_provider_address
   COINMARKETCAP_API_KEY=optional_for_gas_reporting
   ```

## Pre-deployment Steps

1. Install dependencies:
   ```bash
   npm install
   ```

2. Validate deployment environment:
   ```bash
   npx hardhat run scripts/validate-deployment-env.js --network sepolia
   ```
   This script will verify:
   - All required environment variables are set
   - Network connection is successful
   - AAVE Pool Provider address is valid
   - Deployer account has sufficient ETH for gas
   - AAVE Pool configuration is correct
   - Flash loan fee settings are as expected
   - Target assets are properly configured
   - Sufficient liquidity exists in the pool

3. Run tests to ensure everything is working:
   ```bash
   npx hardhat test
   ```

## Flash Loan Configuration

Before deployment, ensure:
1. Target assets have borrowing enabled in the AAVE pool
2. Your contract can handle the current flash loan fee (0.05%)
3. Gas optimization meets target (<300k gas per transaction)
4. Contract has proper allowance management for repayment

## Deployment Process

1. Deploy using Hardhat Ignition:
   ```bash
   npx hardhat ignition deploy ignition/modules/FlashLoanArb.js --network sepolia
   ```

2. Verify contract on Etherscan:
   ```bash
   npx hardhat verify --network sepolia <deployed_contract_address> <pool_provider_address>
   ```
   Replace `<deployed_contract_address>` with the address from step 1
   Replace `<pool_provider_address>` with your AAVE_POOL_PROVIDER_ADDRESS

## Post-deployment Verification

1. Test contract connection:
   ```bash
   npx hardhat run scripts/test-connection.js --network sepolia
   ```

2. Verify contract is properly initialized:
   - Check contract state variables
   - Ensure AAVE Pool Provider is correctly set
   - Verify contract has required permissions
   - Confirm flash loan capabilities are enabled

3. Flash Loan Specific Checks:
   - Verify token allowances are correctly set
   - Confirm contract can calculate flash loan fees
   - Test emergency withdrawal functionality
   - Validate event emission

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Environment validation passed
- [ ] Flash loan configuration verified
- [ ] Tests passing
- [ ] Contract deployed
- [ ] Contract verified on Etherscan
- [ ] Post-deployment tests successful
- [ ] Flash loan capabilities confirmed

## Troubleshooting

### Common Issues

1. Insufficient funds
   - Ensure deployer account has enough Sepolia ETH
   - Get testnet ETH from Sepolia faucet

2. Network issues
   - Verify Alchemy API URL is correct
   - Check network status at https://status.alchemyapi.com/

3. Verification failures
   - Ensure contract was compiled with the exact same settings
   - Double-check constructor arguments
   - Verify Solidity compiler version matches

4. Flash Loan Issues
   - Verify asset has borrowing enabled
   - Check pool liquidity
   - Confirm fee calculations
   - Validate allowance settings

### Support Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [AAVE V3 Documentation](https://docs.aave.com/developers/v/2.0/)
- [Sepolia Testnet Explorer](https://sepolia.etherscan.io/)
- [AAVE V3 Flash Loans](https://docs.aave.com/developers/guides/flash-loans)