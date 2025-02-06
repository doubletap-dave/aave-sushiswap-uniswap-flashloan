const { ethers, network, config } = require("hardhat");
const { getAccount } = require("./helpful_scripts");

const ETHERSCAN_TX_URL = "https://kovan.etherscan.io/tx/{}";

async function main() {
    const networkName = network.name;

    // Factory addresses
    const uniswapFactory = config.networks[networkName].uniswap_factory;
    const sushiswapFactory = config.networks[networkName].sushiswap_factory;

    // flash_Asset is the Aave borrowed token
    const flashAsset = config.networks[networkName].dai_token;
    // Converting 50 ether to wei using ethers.utils
    const flashAmount = ethers.utils.parseEther("50");

    // swapping_pair is the asset you wish to swap with. This is not the aave borrowed token
    const swappingPair = config.networks[networkName].weth;

    // Get account
    const acct = await getAccount();

    // Get the most recently deployed FlashloanV2 contract
    const FlashloanV2 = await ethers.getContractFactory("FlashloanV2");
    const deployedContracts = await FlashloanV2.connect(acct).deploy;
    const flashloanContract = deployedContracts[deployedContracts.length - 1];

    // Execute flashloan
    const flashloanTx = await flashloanContract.startTransaction(
        flashAsset,
        flashAmount,
        swappingPair,
        uniswapFactory,
        {
            gasLimit: 12000000,
            gasPrice: ethers.utils.parseUnits("20", "gwei")
        }
    );

    // Wait for transaction to be mined
    await flashloanTx.wait();

    if (network.name === "kovan") {
        console.log("You did it! View your tx here: " + 
            ETHERSCAN_TX_URL.replace("{}", flashloanTx.hash));
    }
    console.log("Flashloan success!");
    
    return flashloanContract;
}

// Execute script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
