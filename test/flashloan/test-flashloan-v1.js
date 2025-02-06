const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FlashloanV1", function () {
    async function deployFlashloanV1Fixture() {
        const [owner, user] = await ethers.getSigners();

        // Deploy mock tokens
        const MockToken = await ethers.getContractFactory("MockERC20");
        const WETH = await MockToken.deploy("Wrapped Ether", "WETH", 18);
        const DAI = await MockToken.deploy("Dai Stablecoin", "DAI", 18);

        // Deploy mock lending pool V1
        const MockLendingPoolV1 = await ethers.getContractFactory("MockLendingPoolV1");
        const mockLendingPool = await MockLendingPoolV1.deploy();

        // Deploy FlashloanV1 contract
        const FlashloanV1 = await ethers.getContractFactory("FlashloanV1");
        const flashloan = await FlashloanV1.deploy(mockLendingPool.target);

        // Deploy mock Uniswap V1 router
        const MockUniswapV1Router = await ethers.getContractFactory("MockUniswapV1Router");
        const uniswapDai = await MockUniswapV1Router.deploy(DAI.target);

        // Fund the contracts
        await owner.sendTransaction({value: ethers.parseEther("100"), to: mockLendingPool.target});
        await owner.sendTransaction({value: ethers.parseEther("100"), to: uniswapDai.target});
        await owner.sendTransaction({value: ethers.parseEther("2"), to: flashloan.target}); // For fees
        await DAI.mint(uniswapDai.target, ethers.parseEther("100000")); // Initial DAI liquidity
        await DAI.mint(mockLendingPool.target, ethers.parseEther("100000")); // Initial DAI liquidity
        await DAI.mint(flashloan.target, ethers.parseEther("100")); // For fees

        return { flashloan, WETH, DAI, uniswapDai, mockLendingPool, owner, user };
    }

    describe("Basic Flashloan Operations", function () {
        it("Should execute ETH flashloan", async function () {
            const { flashloan, owner } = await loadFixture(deployFlashloanV1Fixture);

            // Transfer ETH to the flashloan contract for fees
            await owner.sendTransaction({
                to: flashloan.target,
                value: ethers.parseEther("2")
            });

            // Execute flashloan with ETH
            const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
            await expect(
                flashloan.flashloan(ETH_ADDRESS)
            ).to.not.be.reverted;
        });

        it("Should execute DAI flashloan", async function () {
            const { flashloan, DAI, uniswapDai, owner } = await loadFixture(deployFlashloanV1Fixture);

            // Purchase DAI on Uniswap first
            await uniswapDai.ethToTokenSwapInput(
                1,  // min tokens to buy
                10000000000,  // deadline
                { 
                    value: ethers.parseEther("2"),
                    gasLimit: 500000
                }
            );

            // Transfer DAI to the flashloan contract
            const balance = await DAI.balanceOf(owner.address);
            await DAI.transfer(flashloan.target, balance);

            // Execute flashloan with DAI
            await expect(
                flashloan.flashloan(DAI.target)
            ).to.not.be.reverted;
        });
    });

    describe("Edge Cases and Error Handling", function () {
        it("Should revert on insufficient fee amount", async function () {
            const { flashloan, WETH } = await loadFixture(deployFlashloanV1Fixture);

            // Attempt flashloan without sending fees
            await expect(
                flashloan.flashloan(WETH.target)
            ).to.be.reverted;
        });

        it("Should handle zero amount flashloan", async function () {
            const { flashloan, WETH, owner } = await loadFixture(deployFlashloanV1Fixture);

            // Send some ETH for fees
            await owner.sendTransaction({
                to: flashloan.target,
                value: ethers.parseEther("1")
            });

            // Attempt flashloan with zero amount
            await expect(
                flashloan.flashloanWithAmount(WETH.target, 0)
            ).to.be.revertedWith("Amount must be greater than 0");
        });
    });

    describe("Gas Optimization", function () {
        it("Should execute flashloan within gas limits", async function () {
            const { flashloan, WETH, owner } = await loadFixture(deployFlashloanV1Fixture);

            // Send ETH for fees
            await owner.sendTransaction({
                to: flashloan.target,
                value: ethers.parseEther("2")
            });

            // Mint WETH tokens to cover fees
            await WETH.mint(flashloan.target, ethers.parseEther("1"));

            // Execute and check gas usage
            const tx = await flashloan.flashloan(WETH.target);
            const receipt = await tx.wait();
            
            expect(receipt.gasUsed).to.be.lt(500000, "Gas usage too high");
        });
    });

    describe("Security Checks", function () {
        it("Should only allow owner to execute flashloan", async function () {
            const { flashloan, WETH, user } = await loadFixture(deployFlashloanV1Fixture);

            // Try to execute flashloan from non-owner account
            await expect(
                flashloan.connect(user).flashloan(WETH.target)
            ).to.be.revertedWithCustomError(flashloan, "OwnableUnauthorizedAccount")
            .withArgs(user.address);
        });

        it("Should validate token address", async function () {
            const { flashloan } = await loadFixture(deployFlashloanV1Fixture);

            // Try to execute flashloan with invalid token address
            await expect(
                flashloan.flashloan(ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid token address");
        });
    });
});
