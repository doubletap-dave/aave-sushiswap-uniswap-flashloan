// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IUniswapV1Router {
    function ethToTokenSwapInput(
        uint256 minTokens,
        uint256 deadline
    ) external payable returns (uint256);
}
