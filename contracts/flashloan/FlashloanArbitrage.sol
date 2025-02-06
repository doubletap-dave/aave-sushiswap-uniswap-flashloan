// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../utils/FlashLoanReceiverBaseV2.sol";
import "../utils/Withdrawable.sol";
import "../interfaces/IUniswapV2Pair.sol";
import "../interfaces/IUniswapV2Router02.sol";
import "../interfaces/IUniswapV2Factory.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract FlashloanV2 is FlashLoanReceiverBaseV2, Withdrawable {

    
    address immutable uniswapRouterAddress;
    address immutable sushiswapRouterAddress;

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

    function pullTokens(address _asset) public onlyOwner {
        IERC20 tokenToPull = IERC20(_asset);
        tokenToPull.approve(msg.sender, address(this).balance);
        tokenToPull.transferFrom(address(this), msg.sender, address(this).balance);
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
        address borrowedAsset = assets[0];
        uint borrowedAmount = amounts[0];
        uint premiumAmount = premiums[0];
        
        // This contract now has the funds requested.
        // Your logic goes here.
        require(msg.sender == address(LENDING_POOL), "Not pool");

        (address swappingPair) = abi.decode(params, (address));

        makeArbitrage(borrowedAsset, borrowedAmount, swappingPair);

        // At the end of your logic above, this contract owes
        // the flashloaned amounts + premiums.
        // Therefore ensure your contract has enough to repay
        // these amounts.
        
        // Approve the LendingPool contract allowance to *pull* the owed amount
        //Use this logic when you have multiple assets
        // for (uint i = 0; i < assets.length; i++) {
        //     uint amountOwing = amounts[i].add(premiums[i]);
        //     IERC20(assets[i]).approve(address(LENDING_POOL), amountOwing);
        // }

        uint amountOwing = borrowedAmount + premiumAmount; 
        IERC20(borrowedAsset).approve(address(LENDING_POOL), amountOwing);        
        return true;
    }

    function startTransaction(address _borrowAsset, uint256 _borrowAmount, address _swappingPair, address _factoryAddress) public onlyOwner{
        // Get pool address and check if it exists
        address poolAddress = IUniswapV2Factory(_factoryAddress).getPair(
            _borrowAsset,
            _swappingPair
        );

        require(poolAddress != address(0), "PairAddress does not exist!");
        bytes memory params = abi.encode(_swappingPair);

        _getFlashloan(_borrowAsset, _borrowAmount, params);
    }

    // Flash multiple assets 
    // function flashloan(address[] memory assets, uint256[] memory amounts) public onlyOwner {
    //     _flashloan(assets, amounts);
    // }

    /*
     *  Flash loan 1,000,000,000,000,000,000 wei (1 ether) worth of `_asset`
     */
    function _getFlashloan(address _asset, uint256 _amount, bytes memory _params) internal {
        address[] memory assets = new address[](1);
        assets[0] = _asset;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = _amount;

        _flashloan(assets, amounts, _params);
    }

    function _flashloan(address[] memory assets, uint256[] memory amounts, bytes memory params) internal {
        // We send the flashloan amount to this contract (receiverAddress) so we can make the arbitrage trade
        address receiverAddress = address(this);
        address onBehalfOf = address(this);
        uint16 referralCode = 0;

        uint256[] memory modes = new uint256[](assets.length);
        // 0 = no debt (flash), 1 = stable, 2 = variable
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

    function makeArbitrage(address _borrowedAsset, uint _borrowedAmount, address _swappingPair) internal returns(uint256){
        // Write a better comparePrice function
        Exchange result = _comparePrice(_borrowedAmount, _borrowedAsset, _swappingPair);
        uint amountFinal;
        if (result == Exchange.UNISWAP) {
            // e.g. sell WETH in uniswap for DAI with high price and buy WETH from sushiswap with lower price
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
        } else if (result == Exchange.SUSHI) {
            // e.g. sell WETH in sushiswap for DAI with high price and buy WETH from uniswap with lower price
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
        } else {
            revert();
        }
        return amountFinal;
    }

    // This compares the prices of the assets on the individual exchanges i.e., Uniswap and Sushiswap
    function _comparePrice(uint256 _amount, address _firstToken, address _secondToken) internal view returns (Exchange) {
        uint256 uniswapPrice = _getPrice(
            uniswapRouterAddress,
            _firstToken, // sell token
            _secondToken, // buy token
            _amount
        );

        uint256 sushiswapPrice = _getPrice(
            sushiswapRouterAddress,
            _firstToken, // sell token
            _secondToken, // buy token
            _amount
        );

        // We try to sell ETH with higher price and buy it back with lower price to make profit
        if (uniswapPrice > sushiswapPrice) {
            require(
                _checkIfArbitrageIsProfitable(
                    _amount,
                    uniswapPrice,
                    sushiswapPrice
                ),
                "Arbitrage not profitable"
            );
            return Exchange.UNISWAP;
        } else if (uniswapPrice < sushiswapPrice) {
            require(
                _checkIfArbitrageIsProfitable(
                    _amount,
                    sushiswapPrice,
                    uniswapPrice
                ),
                "Arbitrage not profitable"
            );
            return Exchange.SUSHI;
        } else {
            return Exchange.NONE;
        }
    }

    function _swapTokens(
        uint256 amountIn,
        address routerAddress,
        address sell_token,
        address buy_token
    ) internal returns (uint256) {
        IERC20(sell_token).approve(routerAddress, amountIn);

        uint256 amountOutMin = (_getPrice(
            routerAddress,
            sell_token,
            buy_token,
            amountIn
        ) * 95) / 100; // Expect to receive at least 95% of the price out.

        address[] memory path = new address[](2);
        path[0] = sell_token;
        path[1] = buy_token;

        uint256 amountReceived = IUniswapV2Router02(routerAddress)
            .swapExactTokensForTokens(
                amountIn,           // Amount of Tokens to sell.
                amountOutMin,       // Minimum tokens expected to receive.
                path,               // Path of the swap.
                address(this),      // Recipient address.
                block.timestamp + 300 // Deadline.
            )[1];
        return amountReceived;
    }

    function _checkIfArbitrageIsProfitable(
        uint256 amountIn,
        uint256 higherPrice,
        uint256 lowerPrice
    ) internal pure returns (bool) {
        // Uniswap & Sushiswap have a 0.3% fee for every exchange,
        // so the gain made must be greater than 2 * 0.3% of the arbitrage amount.
        uint256 difference = ((higherPrice - lowerPrice) * 10**18) / higherPrice;
        uint256 paid_fee = (2 * (amountIn * 3)) / 1000;

        if (difference > paid_fee) {
            return true;
        } else {
            return false;
        }
    }

    function _getPrice(
        address routerAddress,
        address sell_token,
        address buy_token,
        uint256 amount
    ) internal view returns (uint256) {
        address[] memory pairs = new address[](2);
        pairs[0] = sell_token;
        pairs[1] = buy_token;
        uint256 price = IUniswapV2Router02(routerAddress).getAmountsOut(
            amount,
            pairs
        )[1];

        return price;
    }
}
