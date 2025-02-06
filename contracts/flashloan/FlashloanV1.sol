// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/ILendingPoolV1.sol";

contract FlashloanV1 is Ownable {
    using SafeERC20 for IERC20;

    address private constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    ILendingPoolV1 public immutable LENDING_POOL;

    event FlashLoanExecuted(address token, uint256 amount);

    constructor(address _lendingPool) Ownable(msg.sender) {
        LENDING_POOL = ILendingPoolV1(_lendingPool);
    }

    // Function to receive ETH
    receive() external payable {}

    function flashloan(address _token) external onlyOwner {
        require(_token != address(0), "Invalid token address");
        
        uint256 amount;
        if (_token == ETH_ADDRESS) {
            amount = 1 ether; // Default amount for ETH
        } else {
            amount = 1000 * (10 ** IERC20(_token).decimals()); // Default amount for tokens
        }

        _executeFlashloan(_token, amount);
    }

    function flashloanWithAmount(address _token, uint256 _amount) external onlyOwner {
        require(_token != address(0), "Invalid token address");
        require(_amount > 0, "Amount must be greater than 0");

        _executeFlashloan(_token, _amount);
    }

    function _executeFlashloan(address _token, uint256 _amount) internal {
        // Verify this contract has enough balance to pay fees
        if (_token == ETH_ADDRESS) {
            require(address(this).balance >= (_amount * 9) / 10000, "Insufficient ETH for fees");
        } else {
            require(IERC20(_token).balanceOf(address(this)) >= (_amount * 9) / 10000, "Insufficient token balance for fees");
        }

        bytes memory params = "";
        LENDING_POOL.flashLoan(
            address(this),
            _token,
            _amount,
            params
        );

        emit FlashLoanExecuted(_token, _amount);
    }

    function withdrawToken(address _token) external onlyOwner {
        if (_token == ETH_ADDRESS) {
            (bool success, ) = msg.sender.call{value: address(this).balance}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20 token = IERC20(_token);
            uint256 balance = token.balanceOf(address(this));
            if (balance > 0) {
                token.safeTransfer(msg.sender, balance);
            }
        }
    }
}
