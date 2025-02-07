const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FlashloanV3", function () {
    let flashLoan;
    let owner;
    let addr1;
    let mockPool;
    let mockToken;
    let mockTokenB;

    beforeEach(async function () {
        // Get signers
        const signers = await ethers.getSigners();
        owner = signers[0];
        addr1 = signers[1];

        // Deploy mock pool
        const MockPool = await ethers.getContractFactory("MockPool");
        mockPool = await (await MockPool.deploy()).waitForDeployment();

        // Deploy mock tokens
        const MockToken = await ethers.getContractFactory("MockERC20");
        mockToken = await (await MockToken.deploy("Mock Token A", "MTKA")).waitForDeployment();
        mockTokenB = await (await MockToken.deploy("Mock Token B", "MTKB")).waitForDeployment();

        // Deploy FlashloanV3
        const FlashloanV3 = await ethers.getContractFactory("FlashloanV3");
        flashLoan = await (await FlashloanV3.deploy(await mockPool.getAddress())).waitForDeployment();

        // Fund mock tokens
        await mockToken.mint(await mockPool.getAddress(), ethers.parseEther("1000000"));
        await mockTokenB.mint(await mockPool.getAddress(), ethers.parseEther("1000000"));
        
        // Fund flash loan contract for fees
        await mockToken.mint(await flashLoan.getAddress(), ethers.parseEther("1000"));
        await mockTokenB.mint(await flashLoan.getAddress(), ethers.parseEther("1000"));
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await flashLoan.owner()).to.equal(await owner.getAddress());
        });

        it("Should set the correct pool address", async function () {
            expect(await flashLoan.POOL()).to.equal(await mockPool.getAddress());
        });

        it("Should not be paused initially", async function () {
            expect(await flashLoan.paused()).to.equal(false);
        });
    });

    describe("Simple Flash Loan", function () {
        it("Should execute a simple flash loan", async function () {
            const amount = ethers.parseEther("1000");
            
            await expect(flashLoan.flashloanSimple(await mockToken.getAddress(), amount))
                .to.emit(flashLoan, "FlashLoanExecuted")
                .withArgs(await mockToken.getAddress(), amount, 0);
        });

        it("Should revert if amount is too large", async function () {
            const amount = ethers.parseEther("2000000000"); // 2 billion tokens
            
            await expect(
                flashLoan.flashloanSimple(await mockToken.getAddress(), amount)
            ).to.be.revertedWithCustomError(flashLoan, "AmountTooLarge");
        });

        it("Should revert if token address is zero", async function () {
            const amount = ethers.parseEther("1000");
            
            await expect(
                flashLoan.flashloanSimple(ethers.ZeroAddress, amount)
            ).to.be.revertedWithCustomError(flashLoan, "InvalidToken");
        });

        it("Should revert if called by non-owner", async function () {
            const amount = ethers.parseEther("1000");
            
            await expect(
                flashLoan.connect(addr1).flashloanSimple(await mockToken.getAddress(), amount)
            ).to.be.revertedWithCustomError(flashLoan, "OwnableUnauthorizedAccount")
            .withArgs(await addr1.getAddress());
        });
    });

    describe("Multiple Asset Flash Loan", function () {
        it("Should execute a multiple asset flash loan", async function () {
            const amounts = [
                ethers.parseEther("1000"),
                ethers.parseEther("500")
            ];
            
            await expect(
                flashLoan.flashloanMultiple(
                    [await mockToken.getAddress(), await mockTokenB.getAddress()],
                    amounts
                )
            ).to.emit(flashLoan, "FlashLoanExecuted");
        });

        it("Should revert if arrays have different lengths", async function () {
            const amounts = [ethers.parseEther("1000")];
            
            await expect(
                flashLoan.flashloanMultiple(
                    [await mockToken.getAddress(), await mockTokenB.getAddress()],
                    amounts
                )
            ).to.be.revertedWithCustomError(flashLoan, "InvalidAmount");
        });
    });

    describe("Emergency Controls", function () {
        it("Should allow owner to pause contract", async function () {
            await flashLoan.pause();
            expect(await flashLoan.paused()).to.equal(true);
        });

        it("Should prevent flash loans when paused", async function () {
            await flashLoan.pause();
            
            const amount = ethers.parseEther("1000");
            await expect(
                flashLoan.flashloanSimple(await mockToken.getAddress(), amount)
            ).to.be.revertedWithCustomError(flashLoan, "ContractPaused");
        });

        it("Should allow owner to unpause contract", async function () {
            await flashLoan.pause();
            await flashLoan.unpause();
            expect(await flashLoan.paused()).to.equal(false);
        });
    });

    describe("Token Withdrawal", function () {
        it("Should allow owner to withdraw tokens", async function () {
            const amount = ethers.parseEther("1000");
            const initialBalance = await mockToken.balanceOf(await owner.getAddress());
            
            await flashLoan.withdrawToken(await mockToken.getAddress());
            
            expect(await mockToken.balanceOf(await owner.getAddress()))
                .to.equal(initialBalance + amount);
        });

        it("Should allow owner to withdraw ETH", async function () {
            const amount = ethers.parseEther("1.0");
            await owner.sendTransaction({
                to: await flashLoan.getAddress(),
                value: amount
            });

            const initialBalance = await ethers.provider.getBalance(await owner.getAddress());
            const tx = await flashLoan.withdrawToken(
                "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
            );
            const receipt = await tx.wait();
            const gasCost = receipt.gasUsed * receipt.gasPrice;

            const finalBalance = await ethers.provider.getBalance(await owner.getAddress());
            expect(finalBalance).to.equal(
                initialBalance + amount - gasCost
            );
        });
    });
});