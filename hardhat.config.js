require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
const dotenvResult = require("dotenv").config();
if (dotenvResult.error) {
  throw dotenvResult.error;
}

// Configure source directory mappings
const path = require("path");

module.exports = {
  // Source directory configuration
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  solidity: {
    compilers: [
      {
        version: "0.8.0",
      },
      {
        version: "0.8.20",
      },
      {
        version: "0.8.28",
      },
    ],
  },
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111,
      // Contract addresses for Sepolia network
      aave_lending_pool_v2: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951", // Aave V3 Pool on Sepolia
      uniswap_router: "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008", // Uniswap V2 Router on Sepolia
      sushiswap_router: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506" // Sushiswap Router on Sepolia
    },
    mainnet: {
      url: process.env.MAINNET_RPC_URL || "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 1,
      // Contract addresses for Mainnet
      aave_lending_pool_v2: "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9", // Aave V2 LendingPool
      uniswap_router: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Uniswap V2 Router
      sushiswap_router: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F" // SushiSwap Router
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || ""
  }
};
