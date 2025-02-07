const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Uniswap V4 Integration", function () {
  async function deployFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token0 = await MockERC20.deploy("Token0", "TK0");
    await token0.waitForDeployment();
    const token1 = await MockERC20.deploy("Token1", "TK1");
    await token1.waitForDeployment();

    // Deploy mock Sushiswap router
    const MockSushiRouter = await ethers.getContractFactory("MockUniswapV2Router");
    const sushiRouter = await MockSushiRouter.deploy();
    await sushiRouter.waitForDeployment();

    // Deploy PoolManager
    const PoolManager = await ethers.getContractFactory("PoolManager");
    const poolManager = await PoolManager.deploy();
    await poolManager.waitForDeployment();

    // Deploy ArbitrageHook
    const minProfitThreshold = ethers.parseEther("0.1");
    const ArbitrageHook = await ethers.getContractFactory("UniswapV4ArbitrageHook");
    const arbitrageHook = await ArbitrageHook.deploy(await poolManager.getAddress(), minProfitThreshold);
    await arbitrageHook.waitForDeployment();

    // Deploy FlashArbitrage
    const FlashArbitrage = await ethers.getContractFactory("UniswapV4FlashArbitrage");
    const flashArbitrage = await FlashArbitrage.deploy(
      await poolManager.getAddress(),
      await sushiRouter.getAddress(),
      minProfitThreshold
    );
    await flashArbitrage.waitForDeployment();

    // Initialize pool
    const poolKey = {
      currency0: await token0.getAddress(),
      currency1: await token1.getAddress(),
      fee: 3000,
      tickSpacing: 60,
      hooks: await arbitrageHook.getAddress()
    };

    // Initial sqrt price for 1:1 price ratio
    // Using Q64.96 format for sqrtPriceX96
    const sqrtPriceX96 = BigInt("79228162514264337593543950336"); // 1:1 price in Q64.96

    await poolManager.initialize(poolKey, sqrtPriceX96);

    // Set up permissions
    await arbitrageHook.setAuthorizedCaller(await flashArbitrage.getAddress(), true);

    // Mint and approve tokens
    const mintAmount = ethers.parseEther("1000000");
    
    // Mint to owner and PoolManager
    await token0.mint(owner.address, mintAmount);
    await token1.mint(owner.address, mintAmount);
    await token0.mint(await poolManager.getAddress(), mintAmount);
    await token1.mint(await poolManager.getAddress(), mintAmount);
    
    // Approvals
    await token0.approve(await poolManager.getAddress(), mintAmount);
    await token1.approve(await poolManager.getAddress(), mintAmount);
    await token0.approve(await sushiRouter.getAddress(), mintAmount);
    await token1.approve(await sushiRouter.getAddress(), mintAmount);

    return {
      token0,
      token1,
      poolManager,
      arbitrageHook,
      flashArbitrage,
      sushiRouter,
      owner,
      user1,
      user2,
      poolKey,
      minProfitThreshold
    };
  }

  describe("ArbitrageHook", function () {
    it("Should deploy with correct initial state", async function () {
      const { arbitrageHook, poolManager, minProfitThreshold } = await loadFixture(deployFixture);
      
      expect(await arbitrageHook.poolManager()).to.equal(await poolManager.getAddress());
      expect(await arbitrageHook.minProfitThreshold()).to.equal(minProfitThreshold);
    });

    it("Should allow owner to set authorized caller", async function () {
      const { arbitrageHook, user1 } = await loadFixture(deployFixture);
      
      await arbitrageHook.setAuthorizedCaller(user1.address, true);
      expect(await arbitrageHook.authorizedCallers(user1.address)).to.be.true;
    });

    it("Should prevent unauthorized callers from setting permissions", async function () {
      const { arbitrageHook, user1, user2 } = await loadFixture(deployFixture);
      
      await expect(
        arbitrageHook.connect(user1).setAuthorizedCaller(user2.address, true)
      ).to.be.revertedWithCustomError(arbitrageHook, "OwnableUnauthorizedAccount");
    });
  });

  describe("FlashArbitrage", function () {
    it("Should deploy with correct initial state", async function () {
      const { flashArbitrage, poolManager, sushiRouter, minProfitThreshold } = await loadFixture(deployFixture);
      
      expect(await flashArbitrage.poolManager()).to.equal(await poolManager.getAddress());
      expect(await flashArbitrage.sushiswapRouter()).to.equal(await sushiRouter.getAddress());
      expect(await flashArbitrage.minimumProfitThreshold()).to.equal(minProfitThreshold);
    });

    it("Should execute flash arbitrage when profitable", async function () {
      const { flashArbitrage, token0, token1, poolKey } = await loadFixture(deployFixture);
      
      const amount0 = ethers.parseEther("1");
      const amount1 = ethers.parseEther("0");
      const hookData = "0x";

      await expect(
        flashArbitrage.executeArbitrage(
          await token0.getAddress(),
          await token1.getAddress(),
          amount0,
          amount1,
          hookData
        )
      ).to.emit(flashArbitrage, "FlashOperationStarted")
        .withArgs(await token0.getAddress(), await token1.getAddress(), amount0, amount1);
    });

    it("Should revert if profit is below threshold", async function () {
      const { flashArbitrage, token0, token1 } = await loadFixture(deployFixture);
      
      const amount0 = ethers.parseEther("0.01"); // Small amount
      const amount1 = ethers.parseEther("0");
      const hookData = "0x";

      await expect(
        flashArbitrage.executeArbitrage(
          await token0.getAddress(),
          await token1.getAddress(),
          amount0,
          amount1,
          hookData
        )
      ).to.be.revertedWithCustomError(flashArbitrage, "InsufficientProfit");
    });

    it("Should allow owner to set minimum profit threshold", async function () {
      const { flashArbitrage } = await loadFixture(deployFixture);
      
      const newThreshold = ethers.parseEther("0.2");
      await flashArbitrage.setMinimumProfitThreshold(newThreshold);
      expect(await flashArbitrage.minimumProfitThreshold()).to.equal(newThreshold);
    });

    it("Should handle emergency withdrawals correctly", async function () {
      const { flashArbitrage, token0, owner, user1 } = await loadFixture(deployFixture);
      
      const amount = ethers.parseEther("1");
      await token0.transfer(await flashArbitrage.getAddress(), amount);

      await expect(
        flashArbitrage.emergencyWithdraw(await token0.getAddress(), amount, user1.address)
      ).to.changeTokenBalance(token0, user1, amount);
    });
  });

  describe("Integration Tests", function () {
    it("Should execute complete arbitrage flow", async function () {
      const { 
        flashArbitrage, 
        token0, 
        token1, 
        poolManager,
        sushiRouter,
        owner 
      } = await loadFixture(deployFixture);

      // Setup initial liquidity
      const liquidityAmount = ethers.parseEther("100");
      await token0.transfer(await sushiRouter.getAddress(), liquidityAmount);
      await token1.transfer(await sushiRouter.getAddress(), liquidityAmount);

      // Create price discrepancy
      await sushiRouter.setPrice(await token0.getAddress(), await token1.getAddress(), ethers.parseEther("1.1")); // 10% higher on Sushiswap

      // Execute arbitrage
      const amount0 = ethers.parseEther("10");
      const amount1 = ethers.parseEther("0");
      const hookData = "0x";

      await expect(
        flashArbitrage.executeArbitrage(
          await token0.getAddress(),
          await token1.getAddress(),
          amount0,
          amount1,
          hookData
        )
      ).to.emit(flashArbitrage, "ArbitrageExecuted");
    });

    it("Should handle failed arbitrage gracefully", async function () {
      const { flashArbitrage, token0, token1 } = await loadFixture(deployFixture);

      // Setup with unprofitable conditions
      const amount0 = ethers.parseEther("1");
      const amount1 = ethers.parseEther("0");
      const hookData = "0x";

      await expect(
        flashArbitrage.executeArbitrage(
          await token0.getAddress(),
          await token1.getAddress(),
          amount0,
          amount1,
          hookData
        )
      ).to.be.revertedWithCustomError(flashArbitrage, "InsufficientProfit");
    });
  });
});