require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
const contractAddresses = require("./config/contract-addresses");

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
const dotenvResult = require("dotenv").config();
if (dotenvResult.error) {
  throw dotenvResult.error;
}

module.exports = {
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  solidity: {
    compilers: [
      {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          },
          evmVersion: "paris"
        }
      }
    ]
  },
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111,
      ...contractAddresses.sepolia
    },
    mainnet: {
      url: process.env.MAINNET_RPC_URL || "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 1,
      ...contractAddresses.mainnet
    },
    hardhat: {
      forking: {
        url: process.env.MAINNET_RPC_URL || "",
        enabled: false
      },
      ...contractAddresses.hardhat
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || ""
  },
  mocha: {
    timeout: 100000
  }
};
