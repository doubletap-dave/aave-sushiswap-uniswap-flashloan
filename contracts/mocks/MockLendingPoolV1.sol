// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/ILendingPoolV1.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockLendingPoolV1 is ILendingPoolV1 {
    address constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    function flashLoan(
        address _receiver,
        address _reserve,
        uint256 _amount,
        bytes calldata /* _params */
    ) external override {
        // Mock implementation
        // For ETH flashloan
        if (_reserve == ETH) {
            require(address(this).balance >= _amount, "Insufficient ETH balance");
            (bool success, ) = _receiver.call{value: _amount}("");
            require(success, "ETH transfer failed");
        } else {
            // For ERC20 flashloan
            IERC20 token = IERC20(_reserve);
            require(token.balanceOf(address(this)) >= _amount, "Insufficient token balance");
            require(token.transfer(_receiver, _amount), "Token transfer failed");
        }

        // TODO: In a real implementation, we'd expect the borrowed amount back
        // plus a fee, but for testing we'll keep it simple
    }

    function deposit(
        address _reserve,
        uint256 _amount,
        uint16 /* _referralCode */
    ) external payable override {
        if (_reserve == ETH) {
            require(msg.value == _amount, "Invalid ETH amount");
        } else {
            IERC20 token = IERC20(_reserve);
            require(token.transferFrom(msg.sender, address(this), _amount), "Transfer failed");
        }
    }

    function redeemUnderlying(
        address _reserve,
        address _user,
        uint256 _amount
    ) external override {
        if (_reserve == ETH) {
            (bool success, ) = _user.call{value: _amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20 token = IERC20(_reserve);
            require(token.transfer(_user, _amount), "Transfer failed");
        }
    }

    // Function to receive ETH
    receive() external payable {}
}
