const { ethers, network, run } = require("hardhat");
const { getContractAddress } = require("../utils/helpers");

async function main() {
    console.log("Starting migration to Aave V3...");
    
    // Get network specific addresses
    const POOL_ADDRESS = getContractAddress("AaveV3Pool", network.name);
    if (!POOL_ADDRESS) {
        throw new Error("Pool address not configured for network");
    }

    try {
        // Deploy FlashloanV3
        console.log("\nDeploying FlashloanV3...");
        const FlashloanV3 = await ethers.getContractFactory("FlashloanV3");
        const flashloanV3 = await FlashloanV3.deploy(POOL_ADDRESS);
        await flashloanV3.deployed();
        console.log("FlashloanV3 deployed to:", flashloanV3.address);

        // Wait for a few block confirmations
        console.log("\nWaiting for block confirmations...");
        await flashloanV3.deployTransaction.wait(5);

        // Verify contract on Etherscan
        if (network.name !== "hardhat" && network.name !== "localhost") {
            console.log("\nVerifying contract on Etherscan...");
            try {
                await run("verify:verify", {
                    address: flashloanV3.address,
                    constructorArguments: [POOL_ADDRESS],
                });
                console.log("Contract verified successfully");
            } catch (error) {
                console.log("Error verifying contract:", error.message);
            }
        }

        // Perform initial setup
        console.log("\nPerforming initial setup...");
        
        // Transfer ownership if needed
        const [deployer] = await ethers.getSigners();
        if (deployer.address !== await flashloanV3.owner()) {
            const MULTISIG_ADDRESS = getContractAddress("MultiSig", network.name);
            if (MULTISIG_ADDRESS) {
                console.log("\nTransferring ownership to MultiSig...");
                await flashloanV3.transferOwnership(MULTISIG_ADDRESS);
                console.log("Ownership transferred to:", MULTISIG_ADDRESS);
            }
        }

        // Log deployment info
        const deploymentInfo = {
            network: network.name,
            flashloanV3Address: flashloanV3.address,
            poolAddress: POOL_ADDRESS,
            deployer: deployer.address,
            timestamp: new Date().toISOString()
        };

        console.log("\nDeployment Info:", deploymentInfo);
        
        // Save deployment info to file
        const fs = require('fs');
        const deploymentPath = `deployments/${network.name}.json`;
        fs.mkdirSync('deployments', { recursive: true });
        fs.writeFileSync(
            deploymentPath,
            JSON.stringify(deploymentInfo, null, 2)
        );
        console.log(`Deployment info saved to ${deploymentPath}`);

        // Deployment validation
        console.log("\nValidating deployment...");
        
        // Check contract code
        const code = await ethers.provider.getCode(flashloanV3.address);
        if (code === "0x") {
            throw new Error("Contract not deployed correctly");
        }

        // Verify pool connection
        const poolAddress = await flashloanV3.POOL();
        if (poolAddress.toLowerCase() !== POOL_ADDRESS.toLowerCase()) {
            throw new Error("Pool address mismatch");
        }

        console.log("Deployment validation successful");
        console.log("\nMigration completed successfully!");

    } catch (error) {
        console.error("Error during migration:", error);
        process.exit(1);
    }
}

// Execute migration
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });