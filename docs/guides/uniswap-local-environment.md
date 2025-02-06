Here's the content from the Uniswap V3 guide on setting up your local environment, converted into Markdown:

---

# Set Up Your Local Environment

One of the most common questions we get asked is what development toolset to use to build on-chain integrations with Uniswap. There’s no right answer to this question but for this guide we’ll recommend a common one: `Node.js`, `NPM`, and `Hardhat`.

At the end of this guide, you’ll have a development environment set up that you can use to build the rest of the examples in the Guides section of the docs, or start your own integration project!

To get you started as quickly as possible, we have provided the `Quick Start` section below where you can clone some boilerplate and get building. To start from scratch and learn the underlying concepts, jump to the `Start from Scratch` section.

## Quick Start

The Uniswap boilerplate repo provides a basic Hardhat environment with required imports already pre-loaded for you. You can simply clone it and install the dependencies:

```bash
git clone https://github.com/Uniswap/uniswap-first-contract-example
cd uniswap-first-contract-example
npm install
```

Then hop to the `Local Node with a Mainnet Fork` to complete your setup and start developing.

## Start from Scratch

In the following sections, we’ll walk through the steps to create the same environment setup as the boilerplate from scratch and learn the underlying concepts.

### Set Up Dependencies

Node is one of the most common JavaScript runtimes. For our purposes, it will provide scripting we can use to compile and test our contracts. If you haven’t already, install NodeJS and its package manager NPM. Once those dependencies are set up, we can initialize our project:

```bash
npm init
```

Hardhat is an Ethereum development toolset that provides a number of powerful features including Solidity compilation, testing, and deployment, all in a single convenient wrapper. We’ll use NPM to add Hardhat to our project:

```bash
npm add --save-dev hardhat
```

With Hardhat installed, we can invoke it to scaffold our development environment. When you first run Hardhat, you’ll have the option of starting with a templated JavaScript or TypeScript project or an empty project. Since Hardhat relies heavily on folder structure, we recommend starting with either of the templated options. Initialize Hardhat and follow the prompts to make your selection and answer yes to the follow-up prompts:

```bash
npx hardhat init
```

Once the Hardhat initialization completes, take a look around at what got set up. The folder structure should be intuitive: `./contracts` is where you’ll write your Solidity contracts, `./test` is where you’ll write your tests, and `./scripts` is where you can write scripts to perform actions like deploying. Out of the box, Hardhat is configured to use this folder structure, so don’t change it unless you know what you’re doing!

Next, we’ll use NPM to add the Uniswap V3 contracts, which will allow us to seamlessly integrate with the protocol in our new contracts:

```bash
npm add @uniswap/v3-periphery @uniswap/v3-core
```

The Uniswap V3 contracts were written using a past version of the Solidity compiler. Since we’re building integrations on V3, we have to tell Hardhat to use the correct compiler to build these files. Go to the `./hardhat.config.js` file and change the Solidity version to “0.7.6”:

```javascript
// ...
module.exports = {
  solidity: "0.7.6",
};
```

That’s it! You should now have a functional development environment to start building on-chain Uniswap integrations. Let’s run a quick test to confirm everything is set up properly.

### Compile a Basic Contract

To confirm that our environment is configured correctly, we’ll attempt to compile a basic Swap contract. Create a new file, `./contracts/Swap.sol`, and paste the following code into it (a detailed guide to this contract can be found here):

```solidity
// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;
pragma abicoder v2;

import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';

contract SimpleSwap {
    ISwapRouter public immutable swapRouter;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address public constant WETH9 = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    uint24 public constant feeTier = 3000;

    constructor(ISwapRouter _swapRouter) {
        swapRouter = _swapRouter;
    }

    function swapWETHForDAI(uint256 amountIn) external returns (uint256 amountOut) {
        // Transfer the specified amount of WETH9 to this contract.
        TransferHelper.safeTransferFrom(WETH9, msg.sender, address(this), amountIn);
        // Approve the router to spend WETH9.
        TransferHelper.safeApprove(WETH9, address(swapRouter), amountIn);
        // Note: To use this example, you should explicitly set slippage limits, omitting for simplicity
        uint256 minOut = /* Calculate min output */ 0;
        uint160 priceLimit = /* Calculate price limit */ 0;
        // Create the params that will be used to execute the swap
        ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: WETH9,
                tokenOut: DAI,
                fee: feeTier,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: priceLimit
            });
        // The call to `exactInputSingle` executes the swap.
        amountOut = swapRouter.exactInputSingle(params);
    }
}
```

To compile all the contracts in the `./contracts` folder, we’ll use the Hardhat compile command:

```bash
npx hardhat compile
```

If the environment is compiled correctly, you should see the message:

```
Compiled { x } Solidity files successfully
```

## Local Node with a Mainnet Fork

When building and testing integrations with on-chain protocols, developers often hit a problem: the liquidity on the live chain is critical to thoroughly testing their code, but testing against a live network like Mainnet can be extremely expensive.

See the SDK getting started guide for a full example on how to use forks.

With your local node up and running, you can use the `--network localhost` flag in tests to point the Hardhat testing suite to that local node:

```bash
npx hardhat test --network localhost
```

## Next Steps

With your environment set up, you’re ready to start building. Jump over to the guides section to learn about the Uniswap functions you can integrate with. Remember to add all contracts (.sol files) to the `./contracts` folder and their subsequent tests to the `./tests` folder. You can then test them against your local forked 