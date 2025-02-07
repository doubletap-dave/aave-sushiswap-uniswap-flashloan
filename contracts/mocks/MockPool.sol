// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

interface IFlashLoanReceiver {
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

/**
 * @title MockPool
 * @notice Mock implementation of Aave V3 Pool for testing
 */
contract MockPool {
    address public constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    event FlashLoan(
        address indexed receiver,
        address indexed asset,
        uint256 amount,
        uint256 premium
    );

    event FlashLoanMultiple(
        address indexed receiver,
        address[] assets,
        uint256[] amounts,
        uint256[] premiums
    );

    /**
     * @notice Execute a simple flash loan
     * @param receiverAddress The address of the contract receiving the funds
     * @param asset The address of the asset being flash-borrowed
     * @param amount The amount being flash-borrowed
     * @param params Arbitrary bytes-encoded params
     * @param referralCode Referral code for the flash loan
     */
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external {
        // Calculate premium (0.09%)
        uint256 premium = (amount * 9) / 10000;

        // Transfer tokens to receiver
        if (asset == ETH_ADDRESS) {
            require(address(this).balance >= amount, "Insufficient ETH liquidity");
            payable(receiverAddress).transfer(amount);
        } else {
            require(
                IERC20(asset).balanceOf(address(this)) >= amount,
                "Insufficient token liquidity"
            );
            IERC20(asset).transfer(receiverAddress, amount);
        }

        // Call executeOperation on receiver
        require(
            IFlashLoanSimpleReceiver(receiverAddress).executeOperation(
                asset,
                amount,
                premium,
                msg.sender,
                params
            ),
            "Flash loan execution failed"
        );

        // Receive tokens back
        if (asset == ETH_ADDRESS) {
            require(
                address(this).balance >= amount + premium,
                "Flash loan repayment failed"
            );
        } else {
            require(
                IERC20(asset).balanceOf(address(this)) >= amount + premium,
                "Flash loan repayment failed"
            );
        }

        emit FlashLoan(receiverAddress, asset, amount, premium);
    }

    /**
     * @notice Execute a multiple asset flash loan
     * @param receiverAddress The address of the contract receiving the funds
     * @param assets The addresses of the assets being flash-borrowed
     * @param amounts The amounts being flash-borrowed
     * @param modes The modes of the flash loan (unused in mock)
     * @param onBehalfOf The address on behalf of which the flash loan is executed
     * @param params Arbitrary bytes-encoded params
     * @param referralCode Referral code for the flash loan
     */
    function flashLoan(
        address receiverAddress,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata modes,
        address onBehalfOf,
        bytes calldata params,
        uint16 referralCode
    ) external {
        require(
            assets.length == amounts.length,
            "Arrays length mismatch"
        );

        // Calculate premiums
        uint256[] memory premiums = new uint256[](assets.length);
        for (uint256 i = 0; i < assets.length; i++) {
            premiums[i] = (amounts[i] * 9) / 10000; // 0.09% fee

            // Transfer tokens to receiver
            if (assets[i] == ETH_ADDRESS) {
                require(
                    address(this).balance >= amounts[i],
                    "Insufficient ETH liquidity"
                );
                payable(receiverAddress).transfer(amounts[i]);
            } else {
                require(
                    IERC20(assets[i]).balanceOf(address(this)) >= amounts[i],
                    "Insufficient token liquidity"
                );
                IERC20(assets[i]).transfer(receiverAddress, amounts[i]);
            }
        }

        // Call executeOperation on receiver
        require(
            IFlashLoanReceiver(receiverAddress).executeOperation(
                assets,
                amounts,
                premiums,
                msg.sender,
                params
            ),
            "Flash loan execution failed"
        );

        // Verify repayment
        for (uint256 i = 0; i < assets.length; i++) {
            if (assets[i] == ETH_ADDRESS) {
                require(
                    address(this).balance >= amounts[i] + premiums[i],
                    "Flash loan repayment failed"
                );
            } else {
                require(
                    IERC20(assets[i]).balanceOf(address(this)) >= amounts[i] + premiums[i],
                    "Flash loan repayment failed"
                );
            }
        }

        emit FlashLoanMultiple(receiverAddress, assets, amounts, premiums);
    }

    // To receive ETH
    receive() external payable {}
}