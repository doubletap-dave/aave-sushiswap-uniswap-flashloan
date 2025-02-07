const { ethers } = require("hardhat");

async function main() {
  console.log("Starting Uniswap V4 migration...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy PoolManager
  console.log("\nDeploying PoolManager...");
  const PoolManager = await ethers.getContractFactory("PoolManager");
  const poolManager = await PoolManager.deploy();
  await poolManager.deployed();
  console.log("PoolManager deployed to:", poolManager.address);

  // Deploy ArbitrageHook
  console.log("\nDeploying ArbitrageHook...");
  const minProfitThreshold = ethers.utils.parseEther("0.1"); // 0.1 ETH minimum profit
  const ArbitrageHook = await ethers.getContractFactory("UniswapV4ArbitrageHook");
  const arbitrageHook = await ArbitrageHook.deploy(poolManager.address, minProfitThreshold);
  await arbitrageHook.deployed();
  console.log("ArbitrageHook deployed to:", arbitrageHook.address);

  // Deploy FlashArbitrage
  console.log("\nDeploying FlashArbitrage...");
  const sushiswapRouter = process.env.SUSHISWAP_ROUTER_ADDRESS;
  if (!sushiswapRouter) {
    throw new Error("SUSHISWAP_ROUTER_ADDRESS not set in environment");
  }

  const FlashArbitrage = await ethers.getContractFactory("UniswapV4FlashArbitrage");
  const flashArbitrage = await FlashArbitrage.deploy(
    poolManager.address,
    sushiswapRouter,
    minProfitThreshold
  );
  await flashArbitrage.deployed();
  console.log("FlashArbitrage deployed to:", flashArbitrage.address);

  // Initialize core pools
  console.log("\nInitializing core pools...");
  const CORE_POOLS = [
    {
      token0: process.env.WETH_ADDRESS,
      token1: process.env.USDC_ADDRESS,
      fee: 3000, // 0.3%
      tickSpacing: 60,
      sqrtPrice: "79228162514264337593543950336", // 1:1 price
      hooks: arbitrageHook.address
    },
    // Add other core pools as needed
  ];

  for (const pool of CORE_POOLS) {
    console.log(`\nInitializing pool ${pool.token0}/${pool.token1}...`);
    const poolKey = {
      currency0: pool.token0,
      currency1: pool.token1,
      fee: pool.fee,
      tickSpacing: pool.tickSpacing,
      hooks: pool.hooks
    };

    try {
      const tx = await poolManager.initialize(poolKey, pool.sqrtPrice);
      await tx.wait();
      console.log("Pool initialized successfully");
    } catch (error) {
      console.error("Failed to initialize pool:", error);
    }
  }

  // Set up hook permissions
  console.log("\nConfiguring hook permissions...");
  await arbitrageHook.setAuthorizedCaller(flashArbitrage.address, true);
  console.log("Hook permissions configured");

  // Update contract addresses in config
  console.log("\nUpdating configuration...");
  const fs = require("fs");
  const configPath = "./config/contract-addresses.js";
  const config = require("../../config/contract-addresses.js");

  const updatedConfig = {
    ...config,
    UNISWAP_V4: {
      PoolManager: poolManager.address,
      ArbitrageHook: arbitrageHook.address,
      FlashArbitrage: flashArbitrage.address
    }
  };

  fs.writeFileSync(
    configPath,
    `module.exports = ${JSON.stringify(updatedConfig, null, 2)};`
  );
  console.log("Configuration updated");

  // Verify contracts on Etherscan
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("\nVerifying contracts on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: poolManager.address,
        constructorArguments: []
      });

      await hre.run("verify:verify", {
        address: arbitrageHook.address,
        constructorArguments: [poolManager.address, minProfitThreshold]
      });

      await hre.run("verify:verify", {
        address: flashArbitrage.address,
        constructorArguments: [poolManager.address, sushiswapRouter, minProfitThreshold]
      });

      console.log("Contract verification completed");
    } catch (error) {
      console.error("Error during contract verification:", error);
    }
  }

  console.log("\nMigration completed successfully!");
  console.log("\nDeployed Contracts:");
  console.log("-------------------");
  console.log("PoolManager:", poolManager.address);
  console.log("ArbitrageHook:", arbitrageHook.address);
  console.log("FlashArbitrage:", flashArbitrage.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });