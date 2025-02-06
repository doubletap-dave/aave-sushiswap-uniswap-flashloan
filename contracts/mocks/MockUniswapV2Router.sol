// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockUniswapV2Router is IUniswapV2Router02 {
    mapping(address => mapping(address => uint256)) public prices;
    uint256 public constant PRECISION = 1e18;

    function setPrice(address tokenIn, address tokenOut, uint256 price) external {
        prices[tokenIn][tokenOut] = price;
    }

    function getAmountsOut(uint256 amountIn, address[] calldata path) external view override returns (uint256[] memory) {
        require(path.length >= 2, "Invalid path");
        uint256[] memory amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        
        for (uint i = 0; i < path.length - 1; i++) {
            uint256 price = prices[path[i]][path[i + 1]];
            if (price == 0) price = PRECISION; // Default 1:1 price
            amounts[i + 1] = (amounts[i] * price) / PRECISION;
        }
        
        return amounts;
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external override returns (uint256[] memory amounts) {
        require(deadline >= block.timestamp, "Expired");
        amounts = this.getAmountsOut(amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "Insufficient output amount");

        // Transfer tokens
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        IERC20(path[path.length - 1]).transfer(to, amounts[amounts.length - 1]);

        return amounts;
    }

    // Required interface implementations with minimal functionality
    function WETH() external pure override returns (address) {
        return address(0);
    }

    function factory() external pure override returns (address) {
        return address(0);
    }

    function addLiquidity(
        address /* tokenA */,
        address /* tokenB */, 
        uint /* amountADesired */,
        uint /* amountBDesired */,
        uint /* amountAMin */,
        uint /* amountBMin */,
        address /* to */,
        uint /* deadline */
    ) external override returns (uint amountA, uint amountB, uint liquidity) {
        return (0, 0, 0);
    }

    function addLiquidityETH(
        address /* token */,
        uint /* amountTokenDesired */,
        uint /* amountTokenMin */,
        uint /* amountETHMin */,
        address /* to */,
        uint /* deadline */
    ) external payable override returns (uint amountToken, uint amountETH, uint liquidity) {
        return (0, 0, 0);
    }

    function removeLiquidity(
        address /* tokenA */,
        address /* tokenB */,
        uint /* liquidity */,
        uint /* amountAMin */,
        uint /* amountBMin */,
        address /* to */,
        uint /* deadline */
    ) external override returns (uint amountA, uint amountB) {
        return (0, 0);
    }

    function removeLiquidityETH(
        address /* token */,
        uint /* liquidity */,
        uint /* amountTokenMin */,
        uint /* amountETHMin */,
        address /* to */,
        uint /* deadline */
    ) external override returns (uint amountToken, uint amountETH) {
        return (0, 0);
    }

    function removeLiquidityWithPermit(
        address /* tokenA */,
        address /* tokenB */,
        uint /* liquidity */,
        uint /* amountAMin */,
        uint /* amountBMin */,
        address /* to */,
        uint /* deadline */,
        bool /* approveMax */,
        uint8 /* v */,
        bytes32 /* r */,
        bytes32 /* s */
    ) external override returns (uint amountA, uint amountB) {
        return (0, 0);
    }

    function removeLiquidityETHWithPermit(
        address /* token */,
        uint /* liquidity */,
        uint /* amountTokenMin */,
        uint /* amountETHMin */,
        address /* to */,
        uint /* deadline */,
        bool /* approveMax */,
        uint8 /* v */,
        bytes32 /* r */,
        bytes32 /* s */
    ) external override returns (uint amountToken, uint amountETH) {
        return (0, 0);
    }

    function swapTokensForExactTokens(
        uint /* amountOut */,
        uint /* amountInMax */,
        address[] calldata /* path */,
        address /* to */,
        uint /* deadline */
    ) external override returns (uint256[] memory amounts) {
        return new uint256[](0);
    }

    function swapExactETHForTokens(
        uint /* amountOutMin */,
        address[] calldata /* path */,
        address /* to */,
        uint /* deadline */
    ) external payable override returns (uint256[] memory amounts) {
        return new uint256[](0);
    }

    function swapTokensForExactETH(
        uint /* amountOut */,
        uint /* amountInMax */,
        address[] calldata /* path */,
        address /* to */,
        uint /* deadline */
    ) external override returns (uint256[] memory amounts) {
        return new uint256[](0);
    }

    function swapExactTokensForETH(
        uint /* amountIn */,
        uint /* amountOutMin */,
        address[] calldata /* path */,
        address /* to */,
        uint /* deadline */
    ) external override returns (uint256[] memory amounts) {
        return new uint256[](0);
    }

    function swapETHForExactTokens(
        uint amountOut,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable override returns (uint256[] memory amounts) {
        return new uint256[](0);
    }

    function quote(
        uint /* amountA */,
        uint /* reserveA */,
        uint /* reserveB */
    ) external pure override returns (uint amountB) {
        return 0;
    }

    function getAmountOut(
        uint /* amountIn */,
        uint /* reserveIn */,
        uint /* reserveOut */
    ) external pure override returns (uint amountOut) {
        return 0;
    }

    function getAmountIn(
        uint /* amountOut */,
        uint /* reserveIn */,
        uint /* reserveOut */
    ) external pure override returns (uint amountIn) {
        return 0;
    }

    function getAmountsIn(
        uint /* amountOut */,
        address[] calldata /* path
 */
    ) external view override returns (uint256[] memory amounts) {
        return new uint256[](0);
    }

    function removeLiquidityETHSupportingFeeOnTransferTokens(
        address /* token */,
        uint /* liquidity */,
        uint /* amountTokenMin */,
        uint /* amountETHMin */,
        address /* to */,
        uint /* deadline */
    ) external override returns (uint amountETH) {
        return 0;
    }

    function removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(
        address /* token */,
        uint /* liquidity */,
        uint /* amountTokenMin */,
        uint /* amountETHMin */,
        address /* to */,
        uint /* deadline */,
        bool /* approveMax */,
        uint8 /* v */,
        bytes32 /* r */,
        bytes32 /* s */
    ) external override returns (uint amountETH) {
        return 0;
    }

    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external override {}

    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable override {}

    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external override {}
}