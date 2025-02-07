//SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "../interfaces/IUniswapV4PoolManager.sol";
import "../interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

error InsufficientProfit();

contract UniswapV4FlashArbitrage is Ownable, ReentrancyGuard, IFlashCallback {
    IUniswapV4PoolManager public immutable poolManager;
    address public immutable sushiswapRouter;
    uint256 public minimumProfitThreshold;
    
    event ArbitrageExecuted(
        address indexed token0,
        address indexed token1,
        uint256 profit
    );
    
    event FlashOperationStarted(
        address indexed token0,
        address indexed token1,
        uint256 amount0,
        uint256 amount1
    );

    constructor(
        address _poolManager,
        address _sushiswapRouter,
        uint256 _minimumProfitThreshold
    ) Ownable(msg.sender) {
        require(_poolManager != address(0), "Invalid pool manager");
        require(_sushiswapRouter != address(0), "Invalid Sushiswap router");
        poolManager = IUniswapV4PoolManager(_poolManager);
        sushiswapRouter = _sushiswapRouter;
        minimumProfitThreshold = _minimumProfitThreshold;
    }

    struct FlashCallbackData {
        address token0;
        address token1;
        uint256 amount0;
        uint256 amount1;
        bool uniswapFirst;
    }

    function executeArbitrage(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        bytes calldata hookData
    ) external onlyOwner nonReentrant {
        require(token0 != address(0) && token1 != address(0), "Invalid tokens");
        require(amount0 > 0 || amount1 > 0, "Invalid amounts");

        // Compare prices between Uniswap V4 and Sushiswap
        bool uniswapFirst = _comparePrice(token0, token1, amount0, amount1);

        FlashCallbackData memory callbackData = FlashCallbackData({
            token0: token0,
            token1: token1,
            amount0: amount0,
            amount1: amount1,
            uniswapFirst: uniswapFirst
        });

        emit FlashOperationStarted(token0, token1, amount0, amount1);

        // Execute flash loan through pool manager
        poolManager.flash(
            address(this),
            token0,
            token1,
            amount0,
            amount1,
            abi.encode(callbackData, hookData)
        );
    }

    function flashCallback(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external override returns (bytes4) {
        require(msg.sender == address(poolManager), "Unauthorized callback");

        (FlashCallbackData memory callbackData, bytes memory hookData) = 
            abi.decode(data, (FlashCallbackData, bytes));

        // Pre-approve tokens for Sushiswap
        if (amount0 > 0) {
            _approveToken(token0, sushiswapRouter, amount0);
        }
        if (amount1 > 0) {
            _approveToken(token1, sushiswapRouter, amount1);
        }

        uint256 profit;
        if (callbackData.uniswapFirst) {
            // Execute Uniswap V4 -> Sushiswap arbitrage
            profit = _executeUniswapToSushiArbitrage(
                callbackData.token0,
                callbackData.token1,
                amount0,
                amount1,
                hookData
            );
        } else {
            // Execute Sushiswap -> Uniswap V4 arbitrage
            profit = _executeSushiToUniswapArbitrage(
                callbackData.token0,
                callbackData.token1,
                amount0,
                amount1,
                hookData
            );
        }

        if (profit < minimumProfitThreshold) {
            revert InsufficientProfit();
        }

        emit ArbitrageExecuted(token0, token1, profit);

        // Approve and transfer tokens back to pool manager
        if (amount0 > 0) {
            _approveToken(token0, address(poolManager), amount0);
            require(IERC20(token0).transfer(address(poolManager), amount0), "Transfer failed");
        }
        if (amount1 > 0) {
            _approveToken(token1, address(poolManager), amount1);
            require(IERC20(token1).transfer(address(poolManager), amount1), "Transfer failed");
        }

        return FLASH_CALLBACK_SELECTOR;
    }

    function _executeUniswapToSushiArbitrage(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        bytes memory hookData
    ) internal returns (uint256) {
        // First swap on Uniswap V4
        PoolKey memory poolKey = _createPoolKey(token0, token1, hookData);
        SwapParams memory params = SwapParams({
            zeroForOne: true,
            amountSpecified: int256(amount0),
            sqrtPriceLimitX96: 0
        });

        BalanceDelta memory delta = poolManager.swap(poolKey, params);

        // Then swap on Sushiswap
        uint256 sushiAmount = _swapOnSushiswap(
            token1,
            token0,
            uint256(-delta.amount1), // Convert negative delta to positive amount
            0 // No minimum output for testing
        );

        return sushiAmount > amount0 ? sushiAmount - amount0 : 0;
    }

    function _executeSushiToUniswapArbitrage(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        bytes memory hookData
    ) internal returns (uint256) {
        // First swap on Sushiswap
        uint256 sushiAmount = _swapOnSushiswap(
            token0,
            token1,
            amount0,
            0 // No minimum output for testing
        );

        // Then swap on Uniswap V4
        PoolKey memory poolKey = _createPoolKey(token1, token0, hookData);
        SwapParams memory params = SwapParams({
            zeroForOne: true,
            amountSpecified: int256(sushiAmount),
            sqrtPriceLimitX96: 0
        });

        BalanceDelta memory delta = poolManager.swap(poolKey, params);
        
        return uint256(-delta.amount1) > amount0 ? 
            uint256(-delta.amount1) - amount0 : 0;
    }

    function _createPoolKey(
        address token0,
        address token1,
        bytes memory hookData
    ) internal pure returns (PoolKey memory) {
        return PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: 3000, // 0.3% fee tier
            tickSpacing: 60,
            hooks: IHooks(address(0)) // No hooks for direct swaps
        });
    }

    function _swapOnSushiswap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) internal returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        uint256[] memory amounts = IUniswapV2Router02(sushiswapRouter)
            .swapExactTokensForTokens(
                amountIn,
                minAmountOut,
                path,
                address(this),
                block.timestamp + 300
            );

        return amounts[amounts.length - 1];
    }

    function _comparePrice(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1
    ) internal view returns (bool) {
        // Get Uniswap V4 price
        PoolKey memory poolKey = _createPoolKey(token0, token1, "");
        uint160 sqrtPriceX96 = poolManager.getSqrtPriceX96(poolKey);
        uint256 uniswapPrice = uint256(sqrtPriceX96) * uint256(sqrtPriceX96) * amount0 / 2**192;

        // Get Sushiswap price
        address[] memory path = new address[](2);
        path[0] = token0;
        path[1] = token1;
        uint256 sushiswapPrice = IUniswapV2Router02(sushiswapRouter)
            .getAmountsOut(amount0, path)[1];

        return uniswapPrice > sushiswapPrice;
    }

    function _approveToken(
        address token,
        address spender,
        uint256 amount
    ) internal {
        IERC20(token).approve(spender, 0);
        IERC20(token).approve(spender, amount);
    }

    function setMinimumProfitThreshold(uint256 newThreshold) external onlyOwner {
        minimumProfitThreshold = newThreshold;
    }

    // Emergency withdrawal function
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address recipient
    ) external onlyOwner nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        require(IERC20(token).transfer(recipient, amount), "Transfer failed");
    }
}