//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IUniswapV4PoolManager.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PoolManager is IUniswapV4PoolManager, ReentrancyGuard {
    mapping(bytes32 => bool) public initializedPools;
    mapping(bytes32 => uint160) public poolPrices;
    mapping(bytes32 => int24) public poolTicks;
    
    struct PoolState {
        uint256 liquidity;
        uint160 sqrtPriceX96;
        int24 tick;
    }
    
    mapping(bytes32 => PoolState) public pools;
    
    event Debug(string message, uint256 value);
    event DebugAddr(string message, address addr);
    event DebugBalance(string message, address token, uint256 balance);
    
    function initialize(
        PoolKey memory key,
        uint160 sqrtPriceX96
    ) external override returns (int24 tick) {
        bytes32 poolId = _getPoolId(key);
        require(!initializedPools[poolId], "Pool already initialized");
        
        initializedPools[poolId] = true;
        poolPrices[poolId] = sqrtPriceX96;
        
        // Calculate initial tick from sqrtPriceX96
        tick = _calculateTick(sqrtPriceX96);
        poolTicks[poolId] = tick;
        
        pools[poolId] = PoolState({
            liquidity: 0,
            sqrtPriceX96: sqrtPriceX96,
            tick: tick
        });
        
        // Call hooks if they exist
        if (address(key.hooks) != address(0)) {
            key.hooks.beforeInitialize(msg.sender, key, sqrtPriceX96);
            key.hooks.afterInitialize(msg.sender, key, sqrtPriceX96, tick);
        }
        
        return tick;
    }
    
    function modifyPosition(
        PoolKey memory key,
        ModifyPositionParams memory params
    ) external override nonReentrant returns (BalanceDelta memory delta) {
        bytes32 poolId = _getPoolId(key);
        require(initializedPools[poolId], "Pool not initialized");
        
        // Call hooks if they exist
        if (address(key.hooks) != address(0)) {
            key.hooks.beforeModifyPosition(msg.sender, key, params);
        }
        
        // Mock position modification
        PoolState storage pool = pools[poolId];
        pool.liquidity += uint256(params.liquidityDelta > 0 ? params.liquidityDelta : -params.liquidityDelta);
        
        // Calculate mock deltas based on liquidity change
        delta = BalanceDelta({
            amount0: params.liquidityDelta,
            amount1: params.liquidityDelta
        });
        
        if (address(key.hooks) != address(0)) {
            key.hooks.afterModifyPosition(msg.sender, key, params, delta);
        }
        
        return delta;
    }
    
    function swap(
        PoolKey memory key,
        SwapParams memory params
    ) external override nonReentrant returns (BalanceDelta memory delta) {
        bytes32 poolId = _getPoolId(key);
        require(initializedPools[poolId], "Pool not initialized");
        
        // Call hooks if they exist
        if (address(key.hooks) != address(0)) {
            key.hooks.beforeSwap(msg.sender, key, params);
        }
        
        // Get pool state
        PoolState storage pool = pools[poolId];

        // Mock swap calculation
        int256 amount0 = params.zeroForOne ? -params.amountSpecified : int256(0);
        int256 amount1 = params.zeroForOne ? int256(0) : -params.amountSpecified;

        // Update pool state (simplified)
        pool.sqrtPriceX96 = params.sqrtPriceLimitX96 > 0 ? params.sqrtPriceLimitX96 : pool.sqrtPriceX96;
        pool.liquidity += uint256(params.amountSpecified); // Just add the amount for simplicity

        delta = BalanceDelta({
            amount0: amount0,
            amount1: amount1
        });
        
        if (address(key.hooks) != address(0)) {
            key.hooks.afterSwap(msg.sender, key, params, delta);
        }
        
        return delta;
    }
    
    function flash(
        address recipient,
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external override {
        // Transfer tokens to recipient
        if (amount0 > 0) {
            require(IERC20(token0).transferFrom(msg.sender, recipient, amount0), "Transfer failed");
        }
        if (amount1 > 0) {
            require(IERC20(token1).transferFrom(msg.sender, recipient, amount1), "Transfer failed");
        }
        
        // Call recipient's callback
        (bool success, bytes memory result) = recipient.call(
            abi.encodeWithSignature(
                "flashCallback(address,address,uint256,uint256,bytes)",
                token0,
                token1,
                amount0,
                amount1,
                data
            )
        );
        require(success, "Flash callback failed");
        
        // Verify tokens were returned
        if (amount0 > 0) {
            require(
                IERC20(token0).balanceOf(address(this)) >= amount0,
                "Flash loan not repaid"
            );
        }
        if (amount1 > 0) {
            require(
                IERC20(token1).balanceOf(address(this)) >= amount1,
                "Flash loan not repaid"
            );
        }
    }
    
    function getSqrtPriceX96(PoolKey memory key) external view returns (uint160) {
        bytes32 poolId = _getPoolId(key);
        return pools[poolId].sqrtPriceX96;
    }
    
    function _getPoolId(PoolKey memory key) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                key.currency0,
                key.currency1,
                key.fee,
                key.tickSpacing,
                key.hooks
            )
        );
    }
    
    function _calculateTick(uint160 sqrtPriceX96) internal pure returns (int24) {
        // Simplified tick calculation for testing
        return int24(int160(sqrtPriceX96));
    }
}