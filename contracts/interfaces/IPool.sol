// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IPool {
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
    ) external;

    /**
     * @notice Execute a multiple asset flash loan
     * @param receiverAddress The address of the contract receiving the funds
     * @param assets The addresses of the assets being flash-borrowed
     * @param amounts The amounts being flash-borrowed
     * @param modes The modes of the flash loan
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
    ) external;
}