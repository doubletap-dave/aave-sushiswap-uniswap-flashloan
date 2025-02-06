const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Flashloan Integration Tests", function () {
    async function deployFlashloanFixture() {
        const [owner, user] = await ethers.getSigners();

        // Deploy mock contracts
        const MockLendingPool = await ethers.getContractFactory("MockLendingPool");
        const mockLendingPool = await MockLendingPool.deploy();

        const MockLendingPoolAddressesProvider = await ethers.getContractFactory("MockLendingPoolAddressesProvider");
        const mockAddressesProvider = await MockLendingPoolAddressesProvider.deploy(mockLendingPool.target);

        // Deploy FlashloanArbitrage contract
        // Deploy mock routers
        const MockUniswapV2Router = await ethers.getContractFactory("MockUniswapV2Router");
        const uniswapRouter = await MockUniswapV2Router.deploy();
        const sushiswapRouter = await MockUniswapV2Router.deploy();

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
        const USDC = await MockToken.deploy("USD Coin", "USDC", 6);

        return {
            flashloan,
            mockLendingPool,
            mockAddressesProvider,
            WETH,
            DAI,
            USDC,
            owner,
            user,
            uniswapRouter,
            sushiswapRouter
        };
    }

    describe("End-to-End Arbitrage Flow", function () {
        it("Should execute complete arbitrage between Uniswap and Sushiswap", async function () {
            const { flashloan, mockLendingPool, WETH, DAI, owner, uniswapRouter, sushiswapRouter } = await loadFixture(deployFlashloanFixture);
            
            // Set up different prices on DEXes
            await uniswapRouter.setPrice(WETH.target, DAI.target, ethers.parseEther("2000")); // 1 ETH = 2000 DAI
            await sushiswapRouter.setPrice(WETH.target, DAI.target, ethers.parseEther("2020")); // 1 ETH = 2020 DAI
            
            // Add liquidity to DEXes
            await DAI.mint(uniswapRouter.target, ethers.parseEther("1000000"));
            await DAI.mint(sushiswapRouter.target, ethers.parseEther("1000000"));
            await WETH.mint(uniswapRouter.target, ethers.parseEther("1000"));
            await WETH.mint(sushiswapRouter.target, ethers.parseEther("1000"));
            
            // Mint tokens to cover fees
            await WETH.mint(flashloan.target, ethers.parseEther("1"));
            
            // Set up approvals
            await WETH.connect(flashloan.target).approve(mockLendingPool.target, ethers.parseEther("1000"));
            await WETH.connect(flashloan.target).approve(uniswapRouter.target, ethers.parseEther("1000"));
            await WETH.connect(flashloan.target).approve(sushiswapRouter.target, ethers.parseEther("1000"));
            
            const initialBalance = await WETH.balanceOf(flashloan.target);
            
            // Execute flashloan with arbitrage
            const loanAmount = ethers.parseEther("100");
            await mockLendingPool.flashLoan(
                flashloan.target,
                [WETH.target],
                [loanAmount],
                [0],
                owner.address,
                "0x",
                0
            );
            
            const finalBalance = await WETH.balanceOf(flashloan.target);
            expect(finalBalance).to.be.gt(initialBalance, "Arbitrage should generate profit");
        });

        it("Should respect price difference thresholds", async function () {
            const { flashloan, mockLendingPool, WETH, DAI, owner, uniswapRouter, sushiswapRouter } = await loadFixture(deployFlashloanFixture);
            
            // Set minimum profit threshold
            const minProfit = ethers.parseEther("0.1");
            await flashloan.setMinimumProfitThreshold(minProfit);
            
            // Add initial liquidity
            await DAI.mint(uniswapRouter.target, ethers.parseEther("1000000"));
            await DAI.mint(sushiswapRouter.target, ethers.parseEther("1000000"));
            await WETH.mint(uniswapRouter.target, ethers.parseEther("1000"));
            await WETH.mint(sushiswapRouter.target, ethers.parseEther("1000"));
            
            // Set up prices with insufficient spread
            await uniswapRouter.setPrice(WETH.target, DAI.target, ethers.parseEther("2000"));
            await sushiswapRouter.setPrice(WETH.target, DAI.target, ethers.parseEther("2001"));
            
            // Mint tokens to cover fees
            await WETH.mint(flashloan.target, ethers.parseEther("1"));
            
            // Set up approvals
            await WETH.connect(flashloan.target).approve(mockLendingPool.target, ethers.parseEther("1000"));
            await WETH.connect(flashloan.target).approve(uniswapRouter.target, ethers.parseEther("1000"));
            await WETH.connect(flashloan.target).approve(sushiswapRouter.target, ethers.parseEther("1000"));
            
            // Should revert due to insufficient profit
            await expect(
                mockLendingPool.flashLoan(
                    flashloan.target,
                    [WETH.target],
                    [ethers.parseEther("10")],
                    [0],
                    owner.address,
                    "0x",
                    0
                )
            ).to.be.revertedWith("No profitable arbitrage opportunity");
            
            // Set up prices with sufficient spread
            await uniswapRouter.setPrice(WETH.target, DAI.target, ethers.parseEther("2000"));
            await sushiswapRouter.setPrice(WETH.target, DAI.target, ethers.parseEther("2020")); // 1% difference
            
            // Execute flashloan with arbitrage
            const tx = await mockLendingPool.flashLoan(
                flashloan.target,
                [WETH.target],
                [ethers.parseEther("10")],
                [0],
                owner.address,
                "0x",
                0
            );
            
            const receipt = await tx.wait();
            const arbitrageEvent = receipt.logs.find(log => log.fragment?.name === "ArbitrageExecuted");
            expect(arbitrageEvent).to.not.be.undefined;
        });
    });

    describe("Gas Optimization Tests", function () {
        const testCases = [
            { amount: "1" },
            { amount: "10" },
            { amount: "100" }
        ];

        testCases.forEach(({ amount }) => {
            it(`Should optimize gas usage for ${amount} ETH flashloan`, async function () {
                const { flashloan, WETH } = await loadFixture(deployFlashloanFixture);
                
                const tx = await flashloan.flashloan(
                    WETH.target,
                    ethers.parseEther(amount)
                );
                
                const receipt = await tx.wait();
                expect(receipt.gasUsed).to.be.lt(500000, `Gas usage too high: ${receipt.gasUsed}`);
            });
        });
    });

    describe("Multi-DEX Integration", function () {
        it("Should execute arbitrage across multiple DEXes", async function () {
            const { flashloan, mockLendingPool, WETH, DAI, USDC, owner, uniswapRouter, sushiswapRouter } = await loadFixture(deployFlashloanFixture);
            
            // Add initial liquidity
            await DAI.mint(uniswapRouter.target, ethers.parseEther("1000000"));
            await DAI.mint(sushiswapRouter.target, ethers.parseEther("1000000"));
            await USDC.mint(uniswapRouter.target, ethers.parseUnits("1000000", 6));
            await USDC.mint(sushiswapRouter.target, ethers.parseUnits("1000000", 6));
            await WETH.mint(uniswapRouter.target, ethers.parseEther("1000"));
            await WETH.mint(sushiswapRouter.target, ethers.parseEther("1000"));
            
            // Set up different prices on DEXes
            await uniswapRouter.setPrice(WETH.target, DAI.target, ethers.parseEther("2000"));
            await sushiswapRouter.setPrice(WETH.target, DAI.target, ethers.parseEther("2010"));
            await uniswapRouter.setPrice(DAI.target, USDC.target, ethers.parseEther("1"));
            await sushiswapRouter.setPrice(DAI.target, USDC.target, ethers.parseEther("0.999"));
            
            // Mint tokens to cover fees
            await WETH.mint(flashloan.target, ethers.parseEther("1"));
            
            // Set up approvals
            await WETH.connect(flashloan.target).approve(mockLendingPool.target, ethers.parseEther("1000"));
            await WETH.connect(flashloan.target).approve(uniswapRouter.target, ethers.parseEther("1000"));
            await WETH.connect(flashloan.target).approve(sushiswapRouter.target, ethers.parseEther("1000"));
            
            const initialBalance = await WETH.balanceOf(flashloan.target);
            
            // Execute multi-DEX arbitrage through flashloan
            const tx = await mockLendingPool.flashLoan(
                flashloan.target,
                [WETH.target],
                [ethers.parseEther("10")],
                [0],
                owner.address,
                ethers.AbiCoder.defaultAbiCoder().encode(
                    ['address[]', 'uint256[]'],
                    [[DAI.target, USDC.target], [ethers.parseEther("2000"), ethers.parseEther("2010")]]
                ),
                0
            );
            
            const receipt = await tx.wait();
            const arbitrageEvent = receipt.logs.find(log => log.fragment?.name === "ArbitrageExecuted");
            expect(arbitrageEvent).to.not.be.undefined;
            
            const finalBalance = await WETH.balanceOf(flashloan.target);
            expect(finalBalance).to.be.gt(initialBalance, "Multi-DEX arbitrage should be profitable");
        });

        it("Should handle complex trading paths", async function () {
            const { flashloan, mockLendingPool, WETH, DAI, USDC, owner, uniswapRouter, sushiswapRouter } = await loadFixture(deployFlashloanFixture);
            
            // Add initial liquidity
            await DAI.mint(uniswapRouter.target, ethers.parseEther("1000000"));
            await DAI.mint(sushiswapRouter.target, ethers.parseEther("1000000"));
            await USDC.mint(uniswapRouter.target, ethers.parseUnits("1000000", 6));
            await USDC.mint(sushiswapRouter.target, ethers.parseUnits("1000000", 6));
            await WETH.mint(uniswapRouter.target, ethers.parseEther("1000"));
            await WETH.mint(sushiswapRouter.target, ethers.parseEther("1000"));
            
            // Set up prices for the complex path
            await uniswapRouter.setPrice(WETH.target, DAI.target, ethers.parseEther("2000")); // 1 ETH = 2000 DAI
            await uniswapRouter.setPrice(DAI.target, USDC.target, ethers.parseEther("1")); // 1 DAI = 1 USDC
            await sushiswapRouter.setPrice(USDC.target, WETH.target, ethers.parseUnits("0.0004995", 18)); // 2001 USDC = 1 ETH
            
            // Mint tokens to cover fees
            await WETH.mint(flashloan.target, ethers.parseEther("1"));
            
            // Set up approvals
            await WETH.connect(flashloan.target).approve(mockLendingPool.target, ethers.parseEther("1000"));
            await WETH.connect(flashloan.target).approve(uniswapRouter.target, ethers.parseEther("1000"));
            await WETH.connect(flashloan.target).approve(sushiswapRouter.target, ethers.parseEther("1000"));
            await DAI.connect(flashloan.target).approve(uniswapRouter.target, ethers.parseEther("1000000"));
            await DAI.connect(flashloan.target).approve(sushiswapRouter.target, ethers.parseEther("1000000"));
            await USDC.connect(flashloan.target).approve(uniswapRouter.target, ethers.parseUnits("1000000", 6));
            await USDC.connect(flashloan.target).approve(sushiswapRouter.target, ethers.parseUnits("1000000", 6));
            
            // Test complex path: WETH -> DAI -> USDC -> WETH
            const tradePath = {
                tokens: [WETH.target, DAI.target, USDC.target, WETH.target],
                amounts: [
                    ethers.parseEther("10"),
                    ethers.parseEther("20000"),
                    ethers.parseUnits("20000", 6), // USDC has 6 decimals
                    ethers.parseEther("10.1") // Expected profit
                ]
            };
            
            // Execute complex arbitrage through flashloan
            await expect(
                mockLendingPool.flashLoan(
                    flashloan.target,
                    [WETH.target],
                    [ethers.parseEther("10")],
                    [0],
                    owner.address,
                    ethers.AbiCoder.defaultAbiCoder().encode(
                        ['address[]', 'uint256[]'],
                        [tradePath.tokens, tradePath.amounts]
                    ),
                    0
                )
            ).to.not.be.reverted;
        });
    });

    describe("Error Handling and Recovery", function () {
        it("Should handle DEX liquidity limitations", async function () {
            const { flashloan, mockLendingPool, WETH, DAI, owner, uniswapRouter, sushiswapRouter } = await loadFixture(deployFlashloanFixture);
            
            // Add limited liquidity
            await DAI.mint(uniswapRouter.target, ethers.parseEther("1000"));
            await WETH.mint(uniswapRouter.target, ethers.parseEther("1"));
            
            // Set up prices
            await uniswapRouter.setPrice(WETH.target, DAI.target, ethers.parseEther("2000"));
            await sushiswapRouter.setPrice(WETH.target, DAI.target, ethers.parseEther("2020"));
            
            // Mint tokens to cover fees
            await WETH.mint(flashloan.target, ethers.parseEther("0.1"));
            
            // Set up approvals
            await WETH.connect(flashloan.target).approve(mockLendingPool.target, ethers.parseEther("1000"));
            await WETH.connect(flashloan.target).approve(uniswapRouter.target, ethers.parseEther("1000"));
            await WETH.connect(flashloan.target).approve(sushiswapRouter.target, ethers.parseEther("1000"));
            
            // Attempt arbitrage with amount exceeding DEX liquidity
            const largeAmount = ethers.parseEther("100"); // Amount larger than available liquidity
            
            await expect(
                mockLendingPool.flashLoan(
                    flashloan.target,
                    [WETH.target],
                    [largeAmount],
                    [0],
                    owner.address,
                    "0x",
                    0
                )
            ).to.be.revertedWith("Insufficient liquidity");
        });

        it("Should recover from failed arbitrage attempts", async function () {
            const { flashloan, mockLendingPool, WETH, DAI, owner, uniswapRouter, sushiswapRouter } = await loadFixture(deployFlashloanFixture);
            
            // Set up initial conditions
            await uniswapRouter.setPrice(WETH.target, DAI.target, ethers.parseEther("2000"));
            await sushiswapRouter.setPrice(WETH.target, DAI.target, ethers.parseEther("2020"));
            
            // Add liquidity
            await WETH.mint(uniswapRouter.target, ethers.parseEther("1000"));
            await DAI.mint(uniswapRouter.target, ethers.parseEther("1000000"));
            
            // Mint tokens to cover fees
            await WETH.mint(flashloan.target, ethers.parseEther("1"));
            
            // Set up approvals
            await WETH.connect(flashloan.target).approve(mockLendingPool.target, ethers.parseEther("1000"));
            await WETH.connect(flashloan.target).approve(uniswapRouter.target, ethers.parseEther("1000"));
            await WETH.connect(flashloan.target).approve(sushiswapRouter.target, ethers.parseEther("1000"));
            
            const initialBalance = await WETH.balanceOf(flashloan.target);
            
            // Simulate failed arbitrage
            await flashloan.setSimulateFailure(true);
            
            await expect(
                mockLendingPool.flashLoan(
                    flashloan.target,
                    [WETH.target],
                    [ethers.parseEther("10")],
                    [0],
                    owner.address,
                    "0x",
                    0
                )
            ).to.be.revertedWith("Arbitrage execution failed");
            
            // Verify funds are returned
            const finalBalance = await WETH.balanceOf(flashloan.target);
            expect(finalBalance).to.equal(initialBalance, "Funds should be returned after failed arbitrage");
            
            // Reset simulation flag
            await flashloan.setSimulateFailure(false);
        });
    });
});
