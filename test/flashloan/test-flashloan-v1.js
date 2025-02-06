const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FlashloanV1", function () {
    async function deployFlashloanV1Fixture() {
        const [owner, user] = await ethers.getSigners();

        // Deploy FlashloanV1 contract
        const FlashloanV1 = await ethers.getContractFactory("FlashloanV1");
        const flashloan = await FlashloanV1.deploy(
            process.env.AAVE_LENDING_POOL_V1 || "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8"
        );

        // Get token contracts
        const WETH = await ethers.getContractAt("IERC20", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
        const DAI = await ethers.getContractAt("IERC20", "0x6B175474E89094C44Da98b954EedeAC495271d0F");

        // Get Uniswap DAI contract
        const uniswapDai = await ethers.getContractAt(
            "IUniswapV2Router02",
            "0x2a1530C4C41db0B0b2bB646CB5Eb1A67b7158667"
        );

        return { flashloan, WETH, DAI, uniswapDai, owner, user };
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
            ).to.be.revertedWith("Ownable: caller is not the owner");
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
