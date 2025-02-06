const { ethers, network, config } = require("hardhat");
const { getAccount } = require("./helpful_scripts");

const ETHERSCAN_ADDRESS_URL = "https://sepolia.etherscan.io/address/{}";

async function main() {
    // Get network specific addresses from config
    const networkName = network.name;
    const aaveLendingPoolV2 = config.networks[networkName].aave_lending_pool_v2;
    const uniswapRouter = config.networks[networkName].uniswap_router;
    const sushiswapRouter = config.networks[networkName].sushiswap_router;

    // Get account to deploy with
    const acct = await getAccount();

    // Get contract factory
    const FlashloanV2 = await ethers.getContractFactory("FlashloanV2");

    // Deploy contract
    const flashloan = await FlashloanV2.connect(acct).deploy(
        aaveLendingPoolV2,
        uniswapRouter,
        sushiswapRouter
    );

    await flashloan.deployed();

    console.log("You did it! View your deployed contract here: " + 
        ETHERSCAN_ADDRESS_URL.replace("{}", flashloan.address));
    
    return flashloan;
}

// Execute deployment
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
