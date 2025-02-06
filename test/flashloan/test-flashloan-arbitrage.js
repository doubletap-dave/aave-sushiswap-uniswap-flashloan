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

        // Deploy mock routers
        const MockUniswapV2Router = await ethers.getContractFactory("MockUniswapV2Router");
        const uniswapRouter = await MockUniswapV2Router.deploy();
        const sushiswapRouter = await MockUniswapV2Router.deploy();

        // Deploy FlashloanArbitrage contract
        const FlashloanArbitrage = await ethers.getContractFactory("FlashloanArbitrage");
        const flashloan = await FlashloanArbitrage.deploy(
            mockAddressesProvider.target,
            uniswapRouter.target,
            sushiswapRouter.target
        );

        // Create mock tokens
        const MockToken = await ethers.getContractFactory("MockERC20");
        const WETH = await MockToken.deploy("Wrapped Ether", "WETH", 18);
        const DAI = await MockToken.deploy("Dai Stablecoin", "DAI", 18);

        // Set initial prices in mock routers
        await uniswapRouter.setPrice(WETH.target, DAI.target, ethers.parseEther("2000")); // 1 ETH = 2000 DAI
        await sushiswapRouter.setPrice(WETH.target, DAI.target, ethers.parseEther("2010")); // 1 ETH = 2010 DAI
        await DAI.mint(uniswapRouter.target, ethers.parseEther("1000000")); // Add liquidity
        await DAI.mint(sushiswapRouter.target, ethers.parseEther("1000000")); // Add liquidity
        await WETH.mint(uniswapRouter.target, ethers.parseEther("1000")); // Add liquidity
        await WETH.mint(sushiswapRouter.target, ethers.parseEther("1000")); // Add liquidity

        return { flashloan, mockLendingPool, mockAddressesProvider, WETH, DAI, owner, user, uniswapRouter, sushiswapRouter };
    }

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const { flashloan, mockLendingPool, owner } = await loadFixture(deployFlashloanArbitrageFixture);
            expect(await flashloan.owner()).to.equal(owner.address);
        });

        it("Should initialize with correct Aave lending pool", async function () {
            const { flashloan, mockLendingPool } = await loadFixture(deployFlashloanArbitrageFixture);
            const lendingPool = await flashloan.LENDING_POOL();
            expect(lendingPool).to.equal(mockLendingPool.target);
        });
    });

    describe("Flashloan Operations", function () {
        it("Should execute single token flashloan", async function () {
            const { flashloan, mockLendingPool, WETH, owner } = await loadFixture(deployFlashloanArbitrageFixture);
            const amount = ethers.parseEther("10");

            // Mint tokens to cover fees
            await WETH.mint(flashloan.target, ethers.parseEther("1")); // Cover fees
            
            // Approve lending pool
            await WETH.connect(flashloan.target).approve(mockLendingPool.target, amount);

            // Execute flashloan directly through lending pool
            await expect(mockLendingPool.flashLoan(
                flashloan.target,
                [WETH.target],
                [amount],
                [0],
                owner.address,
                "0x",
                0
            )).to.not.be.reverted;
        });

        it("Should execute multi-token flashloan", async function () {
            const { flashloan, mockLendingPool, WETH, DAI, owner } = await loadFixture(deployFlashloanArbitrageFixture);
            const wethAmount = ethers.parseEther("10");
            const daiAmount = ethers.parseEther("5000");

            // Mint tokens to cover fees
            await WETH.mint(flashloan.target, ethers.parseEther("1")); // Cover WETH fees
            await DAI.mint(flashloan.target, ethers.parseEther("50")); // Cover DAI fees
            
            // Approve lending pool
            await WETH.connect(flashloan.target).approve(mockLendingPool.target, wethAmount);
            await DAI.connect(flashloan.target).approve(mockLendingPool.target, daiAmount);

            // Execute flashloan directly through lending pool
            await expect(mockLendingPool.flashLoan(
                flashloan.target,
                [WETH.target, DAI.target],
                [wethAmount, daiAmount],
                [0, 0],
                owner.address,
                "0x",
                0
            )).to.not.be.reverted;
        });
    });

    describe("Arbitrage Logic", function () {
        it("Should calculate correct profit opportunity", async function () {
            const { flashloan, WETH, DAI } = await loadFixture(deployFlashloanArbitrageFixture);
            
            // Calculate potential profit
            const profit = await flashloan.calculateArbitrageProfitEstimate(
                WETH.target,
                DAI.target,
                ethers.parseEther("1")
            );

            expect(profit).to.be.gt(0);
        });

        it("Should revert if no profit opportunity exists", async function () {
            const { flashloan, WETH, DAI, uniswapRouter, sushiswapRouter } = await loadFixture(deployFlashloanArbitrageFixture);
            
            // Set equal prices on both DEXes
            const price = ethers.parseEther("2000");
            await uniswapRouter.setPrice(WETH.target, DAI.target, price);
            await sushiswapRouter.setPrice(WETH.target, DAI.target, price);
            
            // Ensure sufficient token balance and approvals
            await WETH.mint(flashloan.target, ethers.parseEther("1"));
            await WETH.connect(flashloan.target).approve(uniswapRouter.target, ethers.parseEther("1"));
            await WETH.connect(flashloan.target).approve(sushiswapRouter.target, ethers.parseEther("1"));
            
            await expect(flashloan.executeArbitrage(
                WETH.target,
                DAI.target,
                ethers.parseEther("1")
            )).to.be.revertedWith("No profitable arbitrage opportunity");
        });
    });

    describe("Gas Optimization", function () {
        it("Should execute arbitrage within gas limits", async function () {
            const { flashloan, mockLendingPool, WETH, DAI, owner, uniswapRouter, sushiswapRouter } = await loadFixture(deployFlashloanArbitrageFixture);
            
            // Set up price difference for profitable arbitrage
            await uniswapRouter.setPrice(WETH.target, DAI.target, ethers.parseEther("2000"));
            await sushiswapRouter.setPrice(WETH.target, DAI.target, ethers.parseEther("2010"));
            
            // Mint tokens and approve
            await WETH.mint(flashloan.target, ethers.parseEther("2")); // Extra for fees
            await WETH.connect(flashloan.target).approve(mockLendingPool.target, ethers.parseEther("1"));
            await WETH.connect(flashloan.target).approve(uniswapRouter.target, ethers.parseEther("1"));
            await WETH.connect(flashloan.target).approve(sushiswapRouter.target, ethers.parseEther("1"));
            
            const tx = await mockLendingPool.flashLoan(
                flashloan.target,
                [WETH.target],
                [ethers.parseEther("1")],
                [0],
                owner.address,
                "0x",
                0
            );
            
            const receipt = await tx.wait();
            expect(receipt.gasUsed).to.be.lt(500000); // Adjust gas limit based on requirements
        });
    });

    describe("Error Handling", function () {
        it("Should handle failed transactions gracefully", async function () {
            const { flashloan, WETH, user } = await loadFixture(deployFlashloanArbitrageFixture);
            
            // Attempt operation without proper setup
            await expect(
                flashloan.connect(user).executeOperation(
                    [WETH.target],
                    [ethers.parseEther("1")],
                    [0],
                    user.address,
                    "0x"
                )
            ).to.be.reverted;
        });

        it("Should validate input parameters", async function () {
            const { flashloan, WETH, DAI } = await loadFixture(deployFlashloanArbitrageFixture);
            
            // Test with invalid parameters
            await expect(
                flashloan.executeArbitrage(
                    WETH.target,
                    DAI.target,
                    0 // Invalid amount
                )
            ).to.be.revertedWith("Invalid parameters");
        });
    });
});
