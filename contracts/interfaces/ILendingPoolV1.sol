// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ILendingPoolV1 {
    function flashLoan(
        address _receiver,
        address _reserve,
        uint256 _amount,
        bytes calldata _params
    ) external;

    function deposit(
        address _reserve,
        uint256 _amount,
        uint16 _referralCode
    ) external payable;

    function redeemUnderlying(
        address _reserve,
        address _user,
        uint256 _amount
    ) external;
}
