const { ethers, network, config } = require("hardhat");

const LOCAL_BLOCKCHAIN_ENVIRONMENTS = [
    "mainnet-fork",
    "mainnet-fork-dev"
];

async function getAccount(index = null, id = null) {
    const [defaultAccount, ...otherAccounts] = await ethers.getSigners();
    
    if (index !== null) {
        return otherAccounts[index] || defaultAccount;
    }

    if (LOCAL_BLOCKCHAIN_ENVIRONMENTS.includes(network.name)) {
        return defaultAccount;
    }

    if (id !== null) {
        // Note: Hardhat doesn't have direct equivalent of brownie's accounts.load
        // You would need to import the private key from your config
        const privateKey = config.networks[network.name]?.accounts?.[id];
        if (privateKey) {
            return new ethers.Wallet(privateKey, ethers.provider);
        }
    }

    if (config.networks[network.name]) {
        const privateKey = config.networks[network.name]?.accounts?.[0];
        if (privateKey) {
            return new ethers.Wallet(privateKey, ethers.provider);
        }
    }

    return defaultAccount;
}

module.exports = {
    getAccount,
    LOCAL_BLOCKCHAIN_ENVIRONMENTS
};
