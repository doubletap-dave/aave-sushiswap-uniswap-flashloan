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

    event Debug(string message, uint256 value);
    event DebugAddr(string message, address addr);
    event DebugBalance(string message, address token, uint256 balance);

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

        emit DebugAddr("Callback from", msg.sender);
        emit DebugBalance("Initial token0 balance", token0, IERC20(token0).balanceOf(address(this)));
        emit DebugBalance("Initial token1 balance", token1, IERC20(token1).balanceOf(address(this)));

        (FlashCallbackData memory callbackData, bytes memory hookData) = 
            abi.decode(data, (FlashCallbackData, bytes));

        // Pre-approve tokens for PoolManager
        if (amount0 > 0) {
            _approveToken(token0, address(poolManager), amount0);
            emit Debug("Approved token0 for PoolManager", amount0);
        }
        if (amount1 > 0) {
            _approveToken(token1, address(poolManager), amount1);
            emit Debug("Approved token1 for PoolManager", amount1);
        }

        // Pre-approve tokens for Sushiswap
        if (amount0 > 0) {
            _approveToken(token0, sushiswapRouter, amount0);
            emit Debug("Approved token0 for Sushiswap", amount0);
        }
        if (amount1 > 0) {
            _approveToken(token1, sushiswapRouter, amount1);
            emit Debug("Approved token1 for Sushiswap", amount1);
        }

        uint256 profit;
        if (callbackData.uniswapFirst) {
            emit Debug("Executing Uniswap first", 0);
            // Execute Uniswap V4 -> Sushiswap arbitrage
            profit = _executeUniswapToSushiArbitrage(
                callbackData.token0,
                callbackData.token1,
                amount0,
                amount1,
                hookData
            );
            emit Debug("Uniswap first arbitrage complete", profit);
        } else {
            emit Debug("Executing Sushiswap first", 0);
            // Execute Sushiswap -> Uniswap V4 arbitrage
            profit = _executeSushiToUniswapArbitrage(
                callbackData.token0,
                callbackData.token1,
                amount0,
                amount1,
                hookData
            );
            emit Debug("Sushiswap first arbitrage complete", profit);
        }

        emit Debug("Profit calculated", profit);

        if (profit < minimumProfitThreshold) {
            emit Debug("Profit below threshold", profit);
            revert InsufficientProfit();
        }

        emit ArbitrageExecuted(token0, token1, profit);

        // Verify we have enough tokens to repay
        emit DebugBalance("Pre-repay token0 balance", token0, IERC20(token0).balanceOf(address(this)));
        emit DebugBalance("Pre-repay token1 balance", token1, IERC20(token1).balanceOf(address(this)));

        // Repay flash loan
        if (amount0 > 0) {
            emit Debug("Repaying token0", amount0);
            require(IERC20(token0).balanceOf(address(this)) >= amount0, "Insufficient token0 for repayment");
            emit Debug("Sufficient token0 balance", amount0);
            require(IERC20(token0).transfer(address(poolManager), amount0), "Token0 transfer failed");
            emit Debug("Token0 transfer complete", amount0);
        }
        if (amount1 > 0) {
            emit Debug("Repaying token1", amount1);
            require(IERC20(token1).balanceOf(address(this)) >= amount1, "Insufficient token1 for repayment");
            emit Debug("Sufficient token1 balance", amount1);
            require(IERC20(token1).transfer(address(poolManager), amount1), "Token1 transfer failed");
            emit Debug("Token1 transfer complete", amount1);
        }

        emit DebugBalance("Final token0 balance", token0, IERC20(token0).balanceOf(address(this)));
        emit DebugBalance("Final token1 balance", token1, IERC20(token1).balanceOf(address(this)));

        return FLASH_CALLBACK_SELECTOR;
    }

    function _executeUniswapToSushiArbitrage(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        bytes memory hookData
    ) internal returns (uint256) {
        emit DebugBalance("Pre-Uniswap token0 balance", token0, IERC20(token0).balanceOf(address(this)));
        emit DebugBalance("Pre-Uniswap token1 balance", token1, IERC20(token1).balanceOf(address(this)));

        // First swap on Uniswap V4
        PoolKey memory poolKey = _createPoolKey(token0, token1, hookData);
        SwapParams memory params = SwapParams({
            zeroForOne: true,
            amountSpecified: int256(amount0),
            sqrtPriceLimitX96: 0
        });

        emit Debug("Executing Uniswap swap with amount", amount0);
        BalanceDelta memory delta = poolManager.swap(poolKey, params);
        emit Debug("Uniswap swap delta0", uint256(-delta.amount0));
        emit Debug("Uniswap swap delta1", uint256(-delta.amount1));

        emit DebugBalance("Post-Uniswap token0 balance", token0, IERC20(token0).balanceOf(address(this)));
        emit DebugBalance("Post-Uniswap token1 balance", token1, IERC20(token1).balanceOf(address(this)));

        // Then swap on Sushiswap
        uint256 sushiAmount = _swapOnSushiswap(
            token1,
            token0,
            uint256(-delta.amount1), // Convert negative delta to positive amount
            0 // No minimum output for testing
        );
        emit Debug("Sushiswap swap result", sushiAmount);

        return sushiAmount > amount0 ? sushiAmount - amount0 : 0;
    }

    function _executeSushiToUniswapArbitrage(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        bytes memory hookData
    ) internal returns (uint256) {
        emit DebugBalance("Pre-Sushiswap token0 balance", token0, IERC20(token0).balanceOf(address(this)));
        emit DebugBalance("Pre-Sushiswap token1 balance", token1, IERC20(token1).balanceOf(address(this)));

        // First swap on Sushiswap
        emit Debug("Executing Sushiswap swap with amount", amount0);
        uint256 sushiAmount = _swapOnSushiswap(
            token0,
            token1,
            amount0,
            0 // No minimum output for testing
        );
        emit Debug("Sushiswap swap result", sushiAmount);

        emit DebugBalance("Post-Sushiswap token0 balance", token0, IERC20(token0).balanceOf(address(this)));
        emit DebugBalance("Post-Sushiswap token1 balance", token1, IERC20(token1).balanceOf(address(this)));

        // Then swap on Uniswap V4
        PoolKey memory poolKey = _createPoolKey(token1, token0, hookData);
        SwapParams memory params = SwapParams({
            zeroForOne: true,
            amountSpecified: int256(sushiAmount),
            sqrtPriceLimitX96: 0
        });

        BalanceDelta memory delta = poolManager.swap(poolKey, params);
        emit Debug("Uniswap swap delta0", uint256(-delta.amount0));
        emit Debug("Uniswap swap delta1", uint256(-delta.amount1));
        
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
        emit DebugBalance("Pre-Sushiswap tokenIn balance", tokenIn, IERC20(tokenIn).balanceOf(address(this)));
        emit DebugBalance("Pre-Sushiswap tokenOut balance", tokenOut, IERC20(tokenOut).balanceOf(address(this)));

        // Approve Sushiswap to spend tokens
        require(IERC20(tokenIn).approve(sushiswapRouter, amountIn), "Sushiswap approval failed");

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

        emit DebugBalance("Post-Sushiswap tokenIn balance", tokenIn, IERC20(tokenIn).balanceOf(address(this)));
        emit DebugBalance("Post-Sushiswap tokenOut balance", tokenOut, IERC20(tokenOut).balanceOf(address(this)));

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
        require(IERC20(token).approve(spender, 0), "Failed to clear approval");
        require(IERC20(token).approve(spender, amount), "Failed to approve");
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