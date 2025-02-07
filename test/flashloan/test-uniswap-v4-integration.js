const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Uniswap V4 Integration", function () {
  describe("ArbitrageHook", function () {
    it("Should deploy with correct initial state", async function () {
      const [owner] = await ethers.getSigners();

      // Deploy mock tokens
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const token0 = await MockERC20.deploy("Token0", "TK0");
      await token0.waitForDeployment();
      const token1 = await MockERC20.deploy("Token1", "TK1");
      await token1.waitForDeployment();

      // Deploy PoolManager
      const PoolManager = await ethers.getContractFactory("PoolManager");
      const poolManager = await PoolManager.deploy();
      await poolManager.waitForDeployment();

      // Deploy ArbitrageHook
      const minProfitThreshold = ethers.parseEther("0.1");
      const ArbitrageHook = await ethers.getContractFactory("UniswapV4ArbitrageHook");
      const arbitrageHook = await ArbitrageHook.deploy(await poolManager.getAddress(), minProfitThreshold);
      await arbitrageHook.waitForDeployment();
      
      expect(await arbitrageHook.poolManager()).to.equal(await poolManager.getAddress());
      expect(await arbitrageHook.minProfitThreshold()).to.equal(minProfitThreshold);
    });

    it("Should allow owner to set authorized caller", async function () {
      const [owner, user1] = await ethers.getSigners();

      // Deploy mock tokens
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const token0 = await MockERC20.deploy("Token0", "TK0");
      await token0.waitForDeployment();
      const token1 = await MockERC20.deploy("Token1", "TK1");
      await token1.waitForDeployment();

      // Deploy PoolManager
      const PoolManager = await ethers.getContractFactory("PoolManager");
      const poolManager = await PoolManager.deploy();
      await poolManager.waitForDeployment();

      // Deploy ArbitrageHook
      const minProfitThreshold = ethers.parseEther("0.1");
      const ArbitrageHook = await ethers.getContractFactory("UniswapV4ArbitrageHook");
      const arbitrageHook = await ArbitrageHook.deploy(await poolManager.getAddress(), minProfitThreshold);
      await arbitrageHook.waitForDeployment();
      
      await arbitrageHook.setAuthorizedCaller(user1.address, true);
      expect(await arbitrageHook.authorizedCallers(user1.address)).to.be.true;
    });

    it("Should prevent unauthorized callers from setting permissions", async function () {
      const [owner, user1, user2] = await ethers.getSigners();

      // Deploy mock tokens
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const token0 = await MockERC20.deploy("Token0", "TK0");
      await token0.waitForDeployment();
      const token1 = await MockERC20.deploy("Token1", "TK1");
      await token1.waitForDeployment();

      // Deploy PoolManager
      const PoolManager = await ethers.getContractFactory("PoolManager");
      const poolManager = await PoolManager.deploy();
      await poolManager.waitForDeployment();

      // Deploy ArbitrageHook
      const minProfitThreshold = ethers.parseEther("0.1");
      const ArbitrageHook = await ethers.getContractFactory("UniswapV4ArbitrageHook");
      const arbitrageHook = await ArbitrageHook.deploy(await poolManager.getAddress(), minProfitThreshold);
      await arbitrageHook.waitForDeployment();
      
      await expect(
        arbitrageHook.connect(user1).setAuthorizedCaller(user2.address, true)
      ).to.be.revertedWithCustomError(arbitrageHook, "OwnableUnauthorizedAccount");
    });
  });

  describe("FlashArbitrage", function () {
    it("Should deploy with correct initial state", async function () {
      const [owner] = await ethers.getSigners();

      // Deploy mock tokens
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const token0 = await MockERC20.deploy("Token0", "TK0");
      await token0.waitForDeployment();
      const token1 = await MockERC20.deploy("Token1", "TK1");
      await token1.waitForDeployment();

      // Deploy PoolManager
      const PoolManager = await ethers.getContractFactory("PoolManager");
      const poolManager = await PoolManager.deploy();
      await poolManager.waitForDeployment();

      // Deploy mock Sushiswap router
      const MockSushiRouter = await ethers.getContractFactory("MockUniswapV2Router");
      const sushiRouter = await MockSushiRouter.deploy();
      await sushiRouter.waitForDeployment();

      // Deploy FlashArbitrage
      const minProfitThreshold = ethers.parseEther("0.1");
      const FlashArbitrage = await ethers.getContractFactory("UniswapV4FlashArbitrage");
      const flashArbitrage = await FlashArbitrage.deploy(
        await poolManager.getAddress(),
        await sushiRouter.getAddress(),
        minProfitThreshold
      );
      await flashArbitrage.waitForDeployment();
      
      expect(await flashArbitrage.poolManager()).to.equal(await poolManager.getAddress());
      expect(await flashArbitrage.sushiswapRouter()).to.equal(await sushiRouter.getAddress());
      expect(await flashArbitrage.minimumProfitThreshold()).to.equal(minProfitThreshold);
    });

    it("Should execute flash arbitrage when profitable", async function () {
      const [owner] = await ethers.getSigners();

      // Deploy mock tokens
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const token0 = await MockERC20.deploy("Token0", "TK0");
      await token0.waitForDeployment();
      const token1 = await MockERC20.deploy("Token1", "TK1");
      await token1.waitForDeployment();

      // Deploy PoolManager
      const PoolManager = await ethers.getContractFactory("PoolManager");
      const poolManager = await PoolManager.deploy();
      await poolManager.waitForDeployment();

      // Deploy mock Sushiswap router
      const MockSushiRouter = await ethers.getContractFactory("MockUniswapV2Router");
      const sushiRouter = await MockSushiRouter.deploy();
      await sushiRouter.waitForDeployment();

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
      
      const amount0 = ethers.parseEther("1");
      const amount1 = ethers.parseEther("0");
      const hookData = "0x";

      // Pre-approve tokens for flash loan repayment
      const flashArbitrageAddress = await flashArbitrage.getAddress();
      await token0.approve(await poolManager.getAddress(), amount0);
      await token1.approve(await poolManager.getAddress(), amount1);

      await expect(
        flashArbitrage.executeArbitrage(
          token0.getAddress(),
          token1.getAddress(),
          amount0,
          amount1,
          hookData
        )
      ).to.emit(flashArbitrage, "FlashOperationStarted")
        .withArgs(token0.getAddress(), token1.getAddress(), amount0, amount1);
    });

    it("Should revert if profit is below threshold", async function () {
      const [owner] = await ethers.getSigners();

      // Deploy mock tokens
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const token0 = await MockERC20.deploy("Token0", "TK0");
      await token0.waitForDeployment();
      const token1 = await MockERC20.deploy("Token1", "TK1");
      await token1.waitForDeployment();

      // Deploy PoolManager
      const PoolManager = await ethers.getContractFactory("PoolManager");
      const poolManager = await PoolManager.deploy();
      await poolManager.waitForDeployment();

      // Deploy mock Sushiswap router
      const MockSushiRouter = await ethers.getContractFactory("MockUniswapV2Router");
      const sushiRouter = await MockSushiRouter.deploy();
      await sushiRouter.waitForDeployment();

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
      
      // Set price to make arbitrage unprofitable
      await sushiRouter.setPrice(token0.getAddress(), token1.getAddress(), ethers.parseEther("0.9"));
      
      const amount0 = ethers.parseEther("0.01"); // Small amount
      const amount1 = ethers.parseEther("0");
      const hookData = "0x";

      // Pre-approve tokens for flash loan repayment
      const flashArbitrageAddress = await flashArbitrage.getAddress();
      await token0.approve(await poolManager.getAddress(), amount0);
      await token1.approve(await poolManager.getAddress(), amount1);

      await expect(
        flashArbitrage.executeArbitrage(
          token0.getAddress(),
          token1.getAddress(),
          amount0,
          amount1,
          hookData
        )
      ).to.be.revertedWithCustomError(flashArbitrage, "InsufficientProfit");
    });

    it("Should allow owner to set minimum profit threshold", async function () {
      const [owner] = await ethers.getSigners();

      // Deploy mock tokens
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const token0 = await MockERC20.deploy("Token0", "TK0");
      await token0.waitForDeployment();
      const token1 = await MockERC20.deploy("Token1", "TK1");
      await token1.waitForDeployment();

      // Deploy PoolManager
      const PoolManager = await ethers.getContractFactory("PoolManager");
      const poolManager = await PoolManager.deploy();
      await poolManager.waitForDeployment();

      // Deploy mock Sushiswap router
      const MockSushiRouter = await ethers.getContractFactory("MockUniswapV2Router");
      const sushiRouter = await MockSushiRouter.deploy();
      await sushiRouter.waitForDeployment();

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
      
      const newThreshold = ethers.parseEther("0.2");
      await flashArbitrage.setMinimumProfitThreshold(newThreshold);
      expect(await flashArbitrage.minimumProfitThreshold()).to.equal(newThreshold);
    });

    it("Should handle emergency withdrawals correctly", async function () {
      const [owner] = await ethers.getSigners();

      // Deploy mock tokens
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const token0 = await MockERC20.deploy("Token0", "TK0");
      await token0.waitForDeployment();
      const token1 = await MockERC20.deploy("Token1", "TK1");
      await token1.waitForDeployment();

      // Deploy PoolManager
      const PoolManager = await ethers.getContractFactory("PoolManager");
      const poolManager = await PoolManager.deploy();
      await poolManager.waitForDeployment();

      // Deploy mock Sushiswap router
      const MockSushiRouter = await ethers.getContractFactory("MockUniswapV2Router");
      const sushiRouter = await MockSushiRouter.deploy();
      await sushiRouter.waitForDeployment();

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
      
      const amount = ethers.parseEther("1");
      await token0.transfer(flashArbitrage.getAddress(), amount);

      await expect(
        flashArbitrage.emergencyWithdraw(token0.getAddress(), amount, user1.address)
      ).to.changeTokenBalance(token0, user1, amount);
    });
  });

  describe("Integration Tests", function () {
    it("Should execute complete arbitrage flow", async function () {
      const [owner] = await ethers.getSigners();

      // Deploy mock tokens
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const token0 = await MockERC20.deploy("Token0", "TK0");
      await token0.waitForDeployment();
      const token1 = await MockERC20.deploy("Token1", "TK1");
      await token1.waitForDeployment();

      // Deploy PoolManager
      const PoolManager = await ethers.getContractFactory("PoolManager");
      const poolManager = await PoolManager.deploy();
      await poolManager.waitForDeployment();

      // Deploy mock Sushiswap router
      const MockSushiRouter = await ethers.getContractFactory("MockUniswapV2Router");
      const sushiRouter = await MockSushiRouter.deploy();
      await sushiRouter.waitForDeployment();

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
      
      // Setup initial liquidity
      const liquidityAmount = ethers.parseEther("100");
      await token0.transfer(sushiRouter.getAddress(), liquidityAmount);
      await token1.transfer(sushiRouter.getAddress(), liquidityAmount);

      // Create price discrepancy
      await sushiRouter.setPrice(token0.getAddress(), token1.getAddress(), ethers.parseEther("1.1")); // 10% higher on Sushiswap

      // Execute arbitrage
      const amount0 = ethers.parseEther("10");
      const amount1 = ethers.parseEther("0");
      const hookData = "0x";

      // Pre-approve tokens for flash loan repayment
      await token0.approve(poolManager.getAddress(), amount0);
      await token1.approve(poolManager.getAddress(), amount1);

      await expect(
        flashArbitrage.executeArbitrage(
          token0.getAddress(),
          token1.getAddress(),
          amount0,
          amount1,
          hookData
        )
      ).to.emit(flashArbitrage, "ArbitrageExecuted");
    });

    it("Should handle failed arbitrage gracefully", async function () {
      const [owner] = await ethers.getSigners();

      // Deploy mock tokens
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const token0 = await MockERC20.deploy("Token0", "TK0");
      await token0.waitForDeployment();
      const token1 = await MockERC20.deploy("Token1", "TK1");
      await token1.waitForDeployment();

      // Deploy PoolManager
      const PoolManager = await ethers.getContractFactory("PoolManager");
      const poolManager = await PoolManager.deploy();
      await poolManager.waitForDeployment();

      // Deploy mock Sushiswap router
      const MockSushiRouter = await ethers.getContractFactory("MockUniswapV2Router");
      const sushiRouter = await MockSushiRouter.deploy();
      await sushiRouter.waitForDeployment();

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
      
      // Set price to make arbitrage unprofitable
      await sushiRouter.setPrice(token0.getAddress(), token1.getAddress(), ethers.parseEther("0.9"));

      const amount0 = ethers.parseEther("1");
      const amount1 = ethers.parseEther("0");
      const hookData = "0x";

      // Pre-approve tokens for flash loan repayment
      await token0.approve(poolManager.getAddress(), amount0);
      await token1.approve(poolManager.getAddress(), amount1);

      await expect(
        flashArbitrage.executeArbitrage(
          token0.getAddress(),
          token1.getAddress(),
          amount0,
          amount1,
          hookData
        )
      ).to.be.revertedWithCustomError(flashArbitrage, "InsufficientProfit");
    });
  });
});