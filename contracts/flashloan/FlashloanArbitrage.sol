// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../utils/FlashLoanReceiverBaseV2.sol";
import "../utils/Withdrawable.sol";
import "../interfaces/IUniswapV2Pair.sol";
import "../interfaces/IUniswapV2Router02.sol";
import "../interfaces/IUniswapV2Factory.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract FlashloanArbitrage is FlashLoanReceiverBaseV2, Withdrawable {
    address immutable uniswapRouterAddress;
    address immutable sushiswapRouterAddress;
    uint256 private minimumProfitThreshold;
    bool private simulateFailure;

    receive() external payable {}

    event ArbitrageExecuted(
        address indexed token0,
        address indexed token1,
        uint256 profit
    );

    constructor(
        address _addressProvider, 
        address _uniswapRouterAddress,
        address _sushiswapRouterAddress
    ) FlashLoanReceiverBaseV2(_addressProvider) Ownable(msg.sender) {
        uniswapRouterAddress = _uniswapRouterAddress;
        sushiswapRouterAddress = _sushiswapRouterAddress;
    }

    enum Exchange {
        UNISWAP,
        SUSHI,
        NONE
    }

    function flashloan(address _asset, uint256 _amount) external onlyOwner {
        require(_amount > 0, "Amount must be greater than 0");
        address[] memory assets = new address[](1);
        assets[0] = _asset;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = _amount;
        bytes memory params = "";
        _flashloan(assets, amounts, params);
    }

    function executeArbitrage(
        address token0,
        address token1,
        uint256 amount
    ) external onlyOwner {
        require(amount > 0, "Invalid parameters");
        require(token0 != address(0) && token1 != address(0), "Invalid token addresses");
        
        bytes memory params = abi.encode(token1);
        _getFlashloan(token0, amount, params);
    }

    function executeMultiDexArbitrage(
        address baseToken,
        address[] calldata pairs,
        uint256 amount,
        uint256[] calldata prices
    ) external onlyOwner {
        require(pairs.length > 0 && prices.length == pairs.length, "Invalid parameters");
        require(amount > minimumProfitThreshold, "Amount below threshold");
        
        bytes memory params = abi.encode(pairs[0]);
        _getFlashloan(baseToken, amount, params);
    }

    function executeComplexArbitrage(
        address[] calldata path,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(path.length > 1 && amounts.length == path.length, "Invalid parameters");
        require(amounts[0] > minimumProfitThreshold, "Amount below threshold");
        
        bytes memory params = abi.encode(path[1]);
        _getFlashloan(path[0], amounts[0], params);
    }

    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address /* initiator */,
        bytes calldata params
    )
        external
        override
        returns (bool)
    {
        require(msg.sender == address(LENDING_POOL), "Caller must be lending pool");
        require(assets.length > 0 && amounts.length == assets.length, "Invalid parameters");

        if (simulateFailure) {
            revert("Arbitrage execution failed");
        }

        address borrowedAsset = assets[0];
        uint256 borrowedAmount = amounts[0];
        uint256 premiumAmount = premiums[0];

        try IERC20(borrowedAsset).approve(address(LENDING_POOL), 0) {} catch {}
        IERC20(borrowedAsset).approve(address(LENDING_POOL), borrowedAmount + premiumAmount);

        if (params.length > 0) {
            address swappingPair = abi.decode(params, (address));
            try this.makeArbitrage(borrowedAsset, borrowedAmount, swappingPair) returns (uint256 amountOut) {
                if (amountOut > borrowedAmount + premiumAmount) {
                    emit ArbitrageExecuted(borrowedAsset, swappingPair, amountOut - (borrowedAmount + premiumAmount));
                }
            } catch {
                // If arbitrage fails, we still need to repay the loan
            }
        }

        return true;
    }

    function calculateArbitrageProfitEstimate(
        address token0,
 
        address token1,
        uint256 amount
 
    ) external view returns (uint256) {
        if (amount == 0 || token0 == address(0) || token1 == address(0)) return 0;
        
        uint256 uniswapPrice = _getPrice(uniswapRouterAddress, token0, token1, amount);
        uint256 sushiswapPrice = _getPrice(sushiswapRouterAddress, token0, token1, amount);
        if (uniswapPrice > 0 && sushiswapPrice > 0) {
            return _checkProfit(amount, uniswapPrice > sushiswapPrice ? uniswapPrice : sushiswapPrice, uniswapPrice > sushiswapPrice ? sushiswapPrice : uniswapPrice);
        }
        return 0;
    }

    function setMinimumProfitThreshold(uint256 threshold) external onlyOwner {
        minimumProfitThreshold = threshold;
    }

    function setSimulateFailure(bool shouldFail) external onlyOwner {
        simulateFailure = shouldFail;
    }

    function _getFlashloan(address _asset, uint256 _amount, bytes memory _params) internal {
        address[] memory assets = new address[](1);
        assets[0] = _asset;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = _amount;
        _flashloan(assets, amounts, _params);
    }

    function _flashloan(address[] memory assets, uint256[] memory amounts, bytes memory params) internal {
        address receiverAddress = address(this);
        address onBehalfOf = address(this);
        uint16 referralCode = 0;

        uint256[] memory modes = new uint256[](assets.length);
        for (uint256 i = 0; i < assets.length; i++) {
            modes[i] = 0;
        }

        LENDING_POOL.flashLoan(
            receiverAddress,
            assets,
            amounts,
            modes,
            onBehalfOf,
            params,
            referralCode
        );
    }

    function makeArbitrage(address _borrowedAsset, uint256 _borrowedAmount, address _swappingPair) external returns(uint256) {
        Exchange result = _comparePrice(_borrowedAmount, _borrowedAsset, _swappingPair);
        if (result == Exchange.NONE) {
            revert("No profitable arbitrage opportunity");
        }

        uint256 amountFinal;
        if (result == Exchange.UNISWAP) {
            uint256 amountOut = _swapTokens(
                _borrowedAmount,
                uniswapRouterAddress,
                _borrowedAsset,
                _swappingPair
            );

            amountFinal = _swapTokens(
                amountOut,
                sushiswapRouterAddress,
                _swappingPair,
                _borrowedAsset
            );
        } else {
            uint256 amountOut = _swapTokens(
                _borrowedAmount,
                sushiswapRouterAddress,
                _borrowedAsset,
                _swappingPair
            );
            
            amountFinal = _swapTokens(
                amountOut,
                uniswapRouterAddress,
                _swappingPair,
                _borrowedAsset
            );
        }
        require(amountFinal > _borrowedAmount, "Insufficient profit");
        return amountFinal;
    }

    function _comparePrice(uint256 _amount, address _firstToken, address _secondToken) internal view returns (Exchange) {
        uint256 uniswapPrice = _getPrice(uniswapRouterAddress, _firstToken, _secondToken, _amount);
        uint256 sushiswapPrice = _getPrice(sushiswapRouterAddress, _firstToken, _secondToken, _amount);

        if (uniswapPrice > sushiswapPrice) {
            if (_checkIfArbitrageIsProfitable(_amount, uniswapPrice, sushiswapPrice)) {
                return Exchange.UNISWAP;
            }
        } else if (sushiswapPrice > uniswapPrice) {
            if (_checkIfArbitrageIsProfitable(_amount, sushiswapPrice, uniswapPrice)) {
                return Exchange.SUSHI;
            }
        }
        return Exchange.NONE;
    }

    function _checkProfit(uint256 amount, uint256 highPrice, uint256 lowPrice) internal pure returns (uint256) {
        return ((highPrice - lowPrice) * amount) / highPrice;
    }

    function _checkIfArbitrageIsProfitable(
        uint256 amountIn,
        uint256 higherPrice,
        uint256 lowerPrice
    ) internal view returns (bool) {
        uint256 difference = ((higherPrice - lowerPrice) * 1e18) / higherPrice;
        uint256 fee = (2 * (amountIn * 3)) / 1000; // 0.3% fee per swap
        return difference > fee && difference > minimumProfitThreshold;
    }

    function _swapTokens(
        uint256 amountIn,
        address routerAddress,
        address sellToken,
        address buyToken
    ) internal returns (uint256) {
        try IERC20(sellToken).approve(routerAddress, 0) {} catch {}
        IERC20(sellToken).approve(routerAddress, amountIn);

        uint256 amountOutMin = (_getPrice(
            routerAddress,
            sellToken,
            buyToken,
            amountIn
        ) * 95) / 100;

        address[] memory path = new address[](2);
        path[0] = sellToken;
        path[1] = buyToken;

        return IUniswapV2Router02(routerAddress)
            .swapExactTokensForTokens(
                amountIn,
                amountOutMin,
                path,
                address(this),
                block.timestamp + 300
            )[1];
    }

    function _getPrice(
        address routerAddress,
        address sellToken,
        address buyToken,
        uint256 amount
    ) internal view returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = sellToken;
        path[1] = buyToken;
        
        try IUniswapV2Router02(routerAddress).getAmountsOut(amount, path) returns (uint256[] memory amounts) {
            if (amounts.length >= 2) {
                return amounts[1];
            }
 
        } catch {
            return 0;
        }
        return 0;
    }
}
