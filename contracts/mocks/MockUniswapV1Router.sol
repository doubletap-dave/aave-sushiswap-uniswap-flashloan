// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IUniswapV1Router.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockUniswapV1Router is IUniswapV1Router {
    // Mock token for testing
    IERC20 public token;

    constructor(address _token) {
        token = IERC20(_token);
    }

    function ethToTokenSwapInput(
        uint256 minTokens,
        uint256 /* deadline */
    ) external payable returns (uint256) {
        // Mock implementation - convert ETH to tokens at 1:1000 rate
        uint256 tokensToReturn = msg.value * 1000;
        require(tokensToReturn >= minTokens, "Insufficient output amount");
        
        // Transfer tokens to the caller
        require(token.transfer(msg.sender, tokensToReturn), "Transfer failed");
        
        return tokensToReturn;
    }

    // Function to receive ETH
    receive() external payable {}
}
