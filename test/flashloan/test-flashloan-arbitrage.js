const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FlashloanArbitrage", function () {
    // Test fixture to deploy contracts and set up test environment
    async function deployFlashloanArbitrageFixture() {
        const [owner, user] = await ethers.getSigners();

        // Deploy mock contracts
        const MockLendingPool = await ethers.getContractFactory("MockLendingPool");
        const mockLendingPool = await MockLendingPool.deploy();

        const MockLendingPoolAddressesProvider = await ethers.getContractFactory("MockLendingPoolAddressesProvider");
        const mockAddressesProvider = await MockLendingPoolAddressesProvider.deploy(mockLendingPool.target);

        // Deploy FlashloanArbitrage contract
        const FlashloanArbitrage = await ethers.getContractFactory("FlashloanV2");
        const flashloanArbitrage = await FlashloanArbitrage.deploy(
            mockAddressesProvider.target,
            "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Uniswap V2 Router
            "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F"  // Sushiswap Router
        );

        // Create mock tokens
        const MockToken = await ethers.getContractFactory("MockERC20");
        const WETH = await MockToken.deploy("Wrapped Ether", "WETH", 18);
        const DAI = await MockToken.deploy("Dai Stablecoin", "DAI", 18);

        return { flashloanArbitrage, mockLendingPool, mockAddressesProvider, WETH, DAI, owner, user };
    }

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const { flashloanArbitrage, owner } = await loadFixture(deployFlashloanArbitrageFixture);
            expect(await flashloanArbitrage.owner()).to.equal(owner.address);
        });

        it("Should initialize with correct Aave lending pool", async function () {
            const { flashloanArbitrage, mockLendingPool } = await loadFixture(deployFlashloanArbitrageFixture);
            const lendingPool = await flashloanArbitrage.LENDING_POOL();
            expect(lendingPool).to.equal(mockLendingPool.target);
        });
    });

    describe("Flashloan Operations", function () {
        it("Should execute single token flashloan", async function () {
            const { flashloanArbitrage, WETH, owner } = await loadFixture(deployFlashloanArbitrageFixture);
            const amount = ethers.parseEther("10");

            // Ensure contract has enough to cover fees
            await owner.sendTransaction({
                to: flashloanArbitrage.target,
                value: ethers.parseEther("1")
            });

            await expect(flashloanArbitrage.executeOperation(
                [WETH.target],
                [amount],
                [0],
                owner.address,
                "0x"
            )).to.not.be.reverted;
        });

        it("Should execute multi-token flashloan", async function () {
            const { flashloanArbitrage, WETH, DAI, owner } = await loadFixture(deployFlashloanArbitrageFixture);
            const wethAmount = ethers.parseEther("10");
            const daiAmount = ethers.parseEther("5000");

            // Ensure contract has enough to cover fees
            await owner.sendTransaction({
                to: flashloanArbitrage.target,
                value: ethers.parseEther("1")
            });

            await expect(flashloanArbitrage.executeOperation(
                [WETH.target, DAI.target],
                [wethAmount, daiAmount],
                [0, 0],
                owner.address,
                "0x"
            )).to.not.be.reverted;
        });
    });

    describe("Arbitrage Logic", function () {
        it("Should calculate correct profit opportunity", async function () {
            const { flashloanArbitrage, WETH, DAI } = await loadFixture(deployFlashloanArbitrageFixture);
            
            // Mock prices (implementation will vary based on actual arbitrage logic)
            const uniswapPrice = ethers.parseEther("2000"); // 1 ETH = 2000 DAI
            const sushiswapPrice = ethers.parseEther("2010"); // 1 ETH = 2010 DAI
            
            // Calculate potential profit
            const profit = await flashloanArbitrage.calculateArbitrageProfitEstimate(
                WETH.target,
                DAI.target,
                ethers.parseEther("1"),
                uniswapPrice,
                sushiswapPrice
            );

            expect(profit).to.be.gt(0);
        });

        it("Should revert if no profit opportunity exists", async function () {
            const { flashloanArbitrage, WETH, DAI } = await loadFixture(deployFlashloanArbitrageFixture);
            
            // Mock equal prices (no arbitrage opportunity)
            const price = ethers.parseEther("2000");
            
            await expect(flashloanArbitrage.executeArbitrage(
                WETH.target,
                DAI.target,
                ethers.parseEther("1"),
                price,
                price
            )).to.be.revertedWith("No profitable arbitrage opportunity");
        });
    });

    describe("Gas Optimization", function () {
        it("Should execute arbitrage within gas limits", async function () {
            const { flashloanArbitrage, WETH, DAI, owner } = await loadFixture(deployFlashloanArbitrageFixture);
            
            const tx = await flashloanArbitrage.executeOperation(
                [WETH.target],
                [ethers.parseEther("1")],
                [0],
                owner.address,
                "0x"
            );
            
            const receipt = await tx.wait();
            expect(receipt.gasUsed).to.be.lt(500000); // Adjust gas limit based on requirements
        });
    });

    describe("Error Handling", function () {
        it("Should handle failed transactions gracefully", async function () {
            const { flashloanArbitrage, WETH, user } = await loadFixture(deployFlashloanArbitrageFixture);
            
            // Attempt operation without proper setup
            await expect(
                flashloanArbitrage.connect(user).executeOperation(
                    [WETH.target],
                    [ethers.parseEther("1")],
                    [0],
                    user.address,
                    "0x"
                )
            ).to.be.reverted;
        });

        it("Should validate input parameters", async function () {
            const { flashloanArbitrage, WETH, DAI } = await loadFixture(deployFlashloanArbitrageFixture);
            
            // Test with invalid parameters
            await expect(
                flashloanArbitrage.executeArbitrage(
                    WETH.target,
                    DAI.target,
                    0, // Invalid amount
                    ethers.parseEther("2000"),
                    ethers.parseEther("2010")
                )
            ).to.be.revertedWith("Invalid parameters");
        });
    });
});
