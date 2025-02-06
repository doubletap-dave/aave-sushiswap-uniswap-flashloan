// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.0;

import {IFlashLoanReceiverV2} from "../interfaces/IFlashLoanReceiverV2.sol";
import {ILendingPoolAddressesProviderV2} from "../interfaces/ILendingPoolAddressesProviderV2.sol";
import {ILendingPoolV2} from "../interfaces/ILendingPoolV2.sol";

abstract contract FlashLoanReceiverBaseV2 is IFlashLoanReceiverV2 {
    ILendingPoolAddressesProviderV2 public immutable override ADDRESSES_PROVIDER;
    ILendingPoolV2 public immutable override LENDING_POOL;

    constructor(address provider) {
        ADDRESSES_PROVIDER = ILendingPoolAddressesProviderV2(provider);
        LENDING_POOL = ILendingPoolV2(ILendingPoolAddressesProviderV2(provider).getLendingPool());
    }
}
