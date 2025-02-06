const { ethers, network, config } = require("hardhat");
const { getAccount } = require("./helpful_scripts");

async function main() {
    // Ensure we're on mainnet
    if (network.name !== 'mainnet') {
        throw new Error('This script must be run on mainnet');
    }

    console.log("Starting mainnet migration...");
    console.log("Network:", network.name);
    console.log("Chain ID:", network.config.chainId);

    // Get account to deploy with
    const acct = await getAccount();
    const balance = await ethers.provider.getBalance(acct.address);
    
    // Check if deployer has sufficient ETH (0.1 ETH minimum for safety)
    if (balance.lt(ethers.utils.parseEther("0.1"))) {
        throw new Error("Insufficient ETH balance for deployment");
    }

    console.log("Deployer address:", acct.address);
    console.log("Deployer balance:", ethers.utils.formatEther(balance), "ETH");

    // Get contract addresses from config
    const aaveLendingPoolV2 = config.networks[network.name].aave_lending_pool_v2;
    const uniswapRouter = config.networks[network.name].uniswap_router;
    const sushiswapRouter = config.networks[network.name].sushiswap_router;

    // Validate addresses
    if (!aaveLendingPoolV2 || !uniswapRouter || !sushiswapRouter) {
        throw new Error("Missing required contract addresses in config");
    }

    console.log("\nUsing the following addresses:");
    console.log("Aave Lending Pool V2:", aaveLendingPoolV2);
    console.log("Uniswap Router:", uniswapRouter);
    console.log("Sushiswap Router:", sushiswapRouter);

    // Final confirmation
    console.log("\nWARNING: About to deploy to mainnet!");
    console.log("Please verify all addresses above are correct.");
    console.log("Waiting 20 seconds before deployment...");
    
    await new Promise(resolve => setTimeout(resolve, 20000));

    // Deploy contract
    console.log("\nDeploying FlashloanV2...");
    const FlashloanV2 = await ethers.getContractFactory("FlashloanV2");
    const flashloan = await FlashloanV2.connect(acct).deploy(
        aaveLendingPoolV2,
        uniswapRouter,
        sushiswapRouter
    );

    await flashloan.deployed();

    console.log("\nFlashloanV2 deployed to:", flashloan.address);
    console.log("View on Etherscan:", `https://etherscan.io/address/${flashloan.address}`);
    
    // Additional verification steps could be added here
    // For example, verifying the contract on Etherscan
    
    return flashloan;
}

// Execute migration
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Migration failed:", error);
        process.exit(1);
    });
