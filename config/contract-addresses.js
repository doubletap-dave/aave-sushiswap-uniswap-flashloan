// Contract addresses for different networks
module.exports = {
  mainnet: {
    aave_lending_pool_v2: "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
    uniswap_factory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
    sushiswap_factory: "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac",
    uniswap_router: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    sushiswap_router: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
    weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    dai_token: "0x6B175474E89094C44Da98b954EedeAC495271d0F"
  },
  sepolia: {
    aave_lending_pool_v2: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
    uniswap_router: "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008",
    sushiswap_router: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    // Add these from environment variables since they might change
    uniswap_factory: process.env.SEPOLIA_UNISWAP_FACTORY,
    sushiswap_factory: process.env.SEPOLIA_SUSHISWAP_FACTORY,
    weth: process.env.SEPOLIA_WETH_ADDRESS,
    dai_token: process.env.SEPOLIA_DAI_ADDRESS
  },
  // For local testing with mainnet fork
  hardhat: {
    aave_lending_pool_v2: "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
    uniswap_factory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
    sushiswap_factory: "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac",
    uniswap_router: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    sushiswap_router: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
    weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    dai_token: "0x6B175474E89094C44Da98b954EedeAC495271d0F"
  }
};