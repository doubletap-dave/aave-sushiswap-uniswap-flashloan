//SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

// Currency is a type representing either the native currency (ETH) or an ERC20 token
type Currency is address;

struct PoolKey {
    Currency currency0;
    Currency currency1;
    uint24 fee;
    int24 tickSpacing;
    IHooks hooks;
}

struct ModifyPositionParams {
    int24 tickLower;
    int24 tickUpper;
    int256 liquidityDelta;
}

struct SwapParams {
    bool zeroForOne;
    int256 amountSpecified;
    uint160 sqrtPriceLimitX96;
}

struct BalanceDelta {
    int256 amount0;
    int256 amount1;
}

interface IHooks {
    function beforeInitialize(
        address sender,
        PoolKey calldata key,
        uint160 sqrtPriceX96
    ) external returns (bytes4);

    function afterInitialize(
        address sender,
        PoolKey calldata key,
        uint160 sqrtPriceX96,
        int24 tick
    ) external returns (bytes4);

    function beforeModifyPosition(
        address sender,
        PoolKey calldata key,
        ModifyPositionParams calldata params
    ) external returns (bytes4);

    function afterModifyPosition(
        address sender,
        PoolKey calldata key,
        ModifyPositionParams calldata params,
        BalanceDelta calldata delta
    ) external returns (bytes4);

    function beforeSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params
    ) external returns (bytes4);

    function afterSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        BalanceDelta calldata delta
    ) external returns (bytes4);
}

interface IUniswapV4PoolManager {
    function initialize(
        PoolKey memory key,
        uint160 sqrtPriceX96
    ) external returns (int24 tick);
    
    function modifyPosition(
        PoolKey memory key,
        ModifyPositionParams memory params
    ) external returns (BalanceDelta memory delta);

    function swap(
        PoolKey memory key,
        SwapParams memory params
    ) external returns (BalanceDelta memory delta);

    function flash(
        address recipient,
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;

    function getSqrtPriceX96(PoolKey memory key) external view returns (uint160);
}

interface IFlashCallback {
    function flashCallback(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external returns (bytes4);
}

// Function selectors
bytes4 constant FLASH_CALLBACK_SELECTOR = IFlashCallback.flashCallback.selector;