const { ethers, network, config } = require("hardhat");
const { getAccount } = require("./helpful_scripts");

async function main() {
    const networkName = network.name;
    const asset = config.networks[networkName].dai_token;

    // Get account
    const acct = await getAccount();

    // Get the most recently deployed FlashloanV2 contract
    const FlashloanV2 = await ethers.getContractFactory("FlashloanV2");
    const deployedContracts = await FlashloanV2.connect(acct).deploy;
    const flashloan_contract = deployedContracts[deployedContracts.length - 1];

    // Pull tokens
    await flashloan_contract.pullTokens(asset);
    console.log("pull successful!");
}

// Execute script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
