// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/ILendingPoolAddressesProviderV2.sol";

contract MockLendingPoolAddressesProvider is ILendingPoolAddressesProviderV2 {
    address private _lendingPool;
    string private _marketId;

    constructor(address lendingPool) {
        _lendingPool = lendingPool;
        _marketId = "MOCK_MARKET";
    }

    function getMarketId() external view override returns (string memory) {
        return _marketId;
    }

    function setMarketId(string calldata marketId) external override {
        _marketId = marketId;
    }

    function setAddress(bytes32 id, address newAddress) external override {
    }

    function setAddressAsProxy(bytes32 id, address impl) external override {
    }

    function getAddress(bytes32 id) external view override returns (address) {
        return address(0);
    }

    function getLendingPool() external view override returns (address) {
        return _lendingPool;
    }

    function setLendingPoolImpl(address pool) external override {
        _lendingPool = pool;
    }

    function getLendingPoolConfigurator() external view override returns (address) {
        return address(0);
    }

    function setLendingPoolConfiguratorImpl(address configurator) external override {
    }

    function getLendingPoolCollateralManager() external view override returns (address) {
        return address(0);
    }

    function setLendingPoolCollateralManager(address manager) external override {
    }

    function getPoolAdmin() external view override returns (address) {
        return address(0);
    }

    function setPoolAdmin(address admin) external override {
    }

    function getEmergencyAdmin() external view override returns (address) {
        return address(0);
    }

    function setEmergencyAdmin(address admin) external override {
    }

    function getPriceOracle() external view override returns (address) {
        return address(0);
    }

    function setPriceOracle(address priceOracle) external override {
    }

    function getLendingRateOracle() external view override returns (address) {
        return address(0);
    }

    function setLendingRateOracle(address lendingRateOracle) external override {
    }
}
