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

        // Deploy FlashloanV2 contract
        const FlashloanV2 = await ethers.getContractFactory("FlashloanV2");
        const flashloan = await FlashloanV2.deploy(
            mockAddressesProvider.target,
            "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Uniswap V2 Router
            "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F"  // Sushiswap Router
        );

        // Create mock tokens
        const MockToken = await ethers.getContractFactory("MockERC20");
        const WETH = await MockToken.deploy("Wrapped Ether", "WETH", 18);
        const DAI = await MockToken.deploy("Dai Stablecoin", "DAI", 18);
        const USDC = await MockToken.deploy("USD Coin", "USDC", 6);

        return { flashloan, mockLendingPool, mockAddressesProvider, WETH, DAI, USDC, owner, user };
    }

    describe("End-to-End Arbitrage Flow", function () {
        it("Should execute complete arbitrage between Uniswap and Sushiswap", async function () {
            const { flashloan, WETH, DAI, owner } = await loadFixture(deployFlashloanFixture);
            
            const initialBalance = await WETH.balanceOf(owner.address);
            
            // Execute flashloan with arbitrage
            const loanAmount = ethers.parseEther("100");
            await flashloan.executeArbitrage(
                WETH.target,
                DAI.target,
                loanAmount
            );
            
            const finalBalance = await WETH.balanceOf(owner.address);
            expect(finalBalance).to.be.gt(initialBalance, "Arbitrage should generate profit");
        });

        it("Should respect price difference thresholds", async function () {
            const { flashloan, WETH, DAI, owner } = await loadFixture(deployFlashloanFixture);
            
            // Set minimum profit threshold
            const minProfit = ethers.parseEther("0.1");
            await flashloan.setMinimumProfitThreshold(minProfit);
            
            // Mock prices with insufficient spread
            const lowSpreadPrice = ethers.parseEther("2000");
            const slightlyHigherPrice = ethers.parseEther("2001");
            
            // Should revert due to insufficient profit
            await expect(
                flashloan.executeArbitrage(
                    WETH.target,
                    DAI.target,
                    ethers.parseEther("10"),
                    lowSpreadPrice,
                    slightlyHigherPrice
                )
            ).to.be.revertedWith("Insufficient profit opportunity");
            
            // Mock prices with sufficient spread
            const goodSpreadPrice1 = ethers.parseEther("2000");
            const goodSpreadPrice2 = ethers.parseEther("2020"); // 1% difference
            
            // Should execute successfully
            const tx = await flashloan.executeArbitrage(
                WETH.target,
                DAI.target,
                ethers.parseEther("10"),
                goodSpreadPrice1,
                goodSpreadPrice2
            );
            
            await expect(tx).to.emit(flashloan, "ArbitrageExecuted");
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
            const { flashloan, WETH, DAI, USDC, owner } = await loadFixture(deployFlashloanFixture);
            
            const initialBalance = await WETH.balanceOf(owner.address);
            
            // Set up mock DEX data
            const dexPrices = [
                { dex: "Uniswap", price: ethers.parseEther("2000") },
                { dex: "Sushiswap", price: ethers.parseEther("2010") },
                { dex: "Curve", price: ethers.parseEther("2005") }
            ];
            
            // Execute multi-DEX arbitrage
            const tx = await flashloan.executeMultiDexArbitrage(
                WETH.target,
                [DAI.target, USDC.target],
                ethers.parseEther("10"),
                dexPrices.map(p => p.price)
            );
            
            const receipt = await tx.wait();
            expect(receipt.events).to.have.lengthOf.above(0);
            
            const finalBalance = await WETH.balanceOf(owner.address);
            expect(finalBalance).to.be.gt(initialBalance, "Multi-DEX arbitrage should be profitable");
        });

        it("Should handle complex trading paths", async function () {
            const { flashloan, WETH, DAI, USDC } = await loadFixture(deployFlashloanFixture);
            
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
            
            await expect(
                flashloan.executeComplexArbitrage(
                    tradePath.tokens,
                    tradePath.amounts
                )
            ).to.not.be.reverted;
        });
    });

    describe("Error Handling and Recovery", function () {
        it("Should handle DEX liquidity limitations", async function () {
            const { flashloan, WETH, DAI } = await loadFixture(deployFlashloanFixture);
            
            // Attempt arbitrage with amount exceeding DEX liquidity
            const largeAmount = ethers.parseEther("10000000"); // Very large amount
            
            await expect(
                flashloan.executeArbitrage(
                    WETH.target,
                    DAI.target,
                    largeAmount
                )
            ).to.be.revertedWith("Insufficient liquidity");
        });

        it("Should recover from failed arbitrage attempts", async function () {
            const { flashloan, WETH, DAI, owner } = await loadFixture(deployFlashloanFixture);
            
            const initialBalance = await WETH.balanceOf(owner.address);
            
            // Simulate failed arbitrage
            await flashloan.setSimulateFailure(true);
            
            await expect(
                flashloan.executeArbitrage(
                    WETH.target,
                    DAI.target,
                    ethers.parseEther("10")
                )
            ).to.be.revertedWith("Arbitrage execution failed");
            
            // Verify funds are returned
            const finalBalance = await WETH.balanceOf(owner.address);
            expect(finalBalance).to.equal(initialBalance, "Funds should be returned after failed arbitrage");
        });
    });
});
