// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/ILendingPoolV2.sol";
import "../interfaces/IFlashLoanReceiverV2.sol";

contract MockLendingPool is ILendingPoolV2 {
    function flashLoan(
        address receiverAddress,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata modes,
        address onBehalfOf,
        bytes calldata params,
        uint16 referralCode
    ) external override {
        // Mock implementation - call executeOperation on the receiver
        uint256[] memory premiums = new uint256[](assets.length);
        for (uint i = 0; i < assets.length; i++) {
            premiums[i] = 0; // No premium for testing
        }
        
        IFlashLoanReceiverV2(receiverAddress).executeOperation(
            assets,
            amounts,
            premiums,
            msg.sender,
            params
        );
    }

    function deposit(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external override {}

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external override returns (uint256) {
        return 0;
    }

    function borrow(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        uint16 referralCode,
        address onBehalfOf
    ) external override {}

    function repay(
        address asset,
        uint256 amount,
        uint256 rateMode,
        address onBehalfOf
    ) external override returns (uint256) {
        return 0;
    }

    function swapBorrowRateMode(address asset, uint256 rateMode) external override {}

    function rebalanceStableBorrowRate(address asset, address user) external override {}

    function setUserUseReserveAsCollateral(address asset, bool useAsCollateral) external override {}

    function liquidationCall(
        address collateralAsset,
        address debtAsset,
        address user,
        uint256 debtToCover,
        bool receiveAToken
    ) external override {}

    function getReservesList() external view override returns (address[] memory) {
        address[] memory reserves = new address[](0);
        return reserves;
    }

    function getReserveData(address asset) external view override returns (DataTypes.ReserveData memory) {
        return DataTypes.ReserveData({
            configuration: DataTypes.ReserveConfigurationMap(0),
            liquidityIndex: 0,
            variableBorrowIndex: 0,
            currentLiquidityRate: 0,
            currentVariableBorrowRate: 0,
            currentStableBorrowRate: 0,
            lastUpdateTimestamp: 0,
            aTokenAddress: address(0),
            stableDebtTokenAddress: address(0),
            variableDebtTokenAddress: address(0),
            interestRateStrategyAddress: address(0),
            id: 0
        });
    }

    function getUserAccountData(address user)
        external
        view
        override
        returns (
            uint256 totalCollateralETH,
            uint256 totalDebtETH,
            uint256 availableBorrowsETH,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        )
    {
        return (0, 0, 0, 0, 0, 0);
    }

    function initReserve(
        address asset,
        address aTokenAddress,
        address stableDebtAddress,
        address variableDebtAddress,
        address interestRateStrategyAddress
    ) external override {}

    function setReserveInterestRateStrategyAddress(address asset, address rateStrategyAddress)
        external
        override
    {}

    function setConfiguration(address asset, uint256 configuration) external override {}

    function getConfiguration(address asset)
        external
        view
        override
        returns (DataTypes.ReserveConfigurationMap memory)
    {
        return DataTypes.ReserveConfigurationMap(0);
    }

    function getUserConfiguration(address user)
        external
        view
        override
        returns (DataTypes.UserConfigurationMap memory)
    {
        return DataTypes.UserConfigurationMap(0);
    }

    function getReserveNormalizedIncome(address asset) external view override returns (uint256) {
        return 0;
    }

    function getReserveNormalizedVariableDebt(address asset) external view override returns (uint256) {
        return 0;
    }

    function getAddressesProvider() external view override returns (ILendingPoolAddressesProviderV2) {
        return ILendingPoolAddressesProviderV2(address(0));
    }

    function setPause(bool val) external override {}

    function paused() external view override returns (bool) {
        return false;
    }

    function finalizeTransfer(
        address asset,
        address from,
        address to,
        uint256 amount,
        uint256 balanceFromBefore,
        uint256 balanceToBefore
    ) external override {}

    function getUserReserveData(address asset, address user)
        external
        view
        override
        returns (
            uint256 currentATokenBalance,
            uint256 currentStableDebt,
            uint256 currentVariableDebt,
            uint256 principalStableDebt,
            uint256 scaledVariableDebt,
            uint256 stableBorrowRate,
            uint256 liquidityRate,
            uint40 stableRateLastUpdated,
            bool usageAsCollateralEnabled
        )
    {
        return (0, 0, 0, 0, 0, 0, 0, 0, false);
    }

    function getReserveTokensAddresses(address asset)
        external
        view
        override
        returns (
            address aTokenAddress,
            address stableDebtTokenAddress,
            address variableDebtTokenAddress
        )
    {
        return (address(0), address(0), address(0));
    }
}
