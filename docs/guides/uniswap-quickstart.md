Here's a comprehensive guide to getting started with the `uniswap-python` library, which provides a clean interface to interact with Uniswap's decentralized exchange protocols.

---

## Table of Contents

1. [Installation](#installation)
2. [Initializing the Uniswap Class](#initializing-the-uniswap-class)
   - [Environment Variables](#environment-variables)
   - [Gas Pricing](#gas-pricing)
3. [Quoting Prices](#quoting-prices)
   - [`get_price_input()`](#get_price_input)
   - [`get_price_output()`](#get_price_output)
4. [Making Trades](#making-trades)
   - [`make_trade()`](#make_trade)
   - [`make_trade_output()`](#make_trade_output)
5. [Pool Methods (v1 only)](#pool-methods-v1-only)
6. [Liquidity Methods (v1 only)](#liquidity-methods-v1-only)

---

## Installation

You can install the latest release from PyPI or the latest commit directly from GitHub:

```bash
# Install the latest release from PyPI:
pip install uniswap-python

# Or install from GitHub:
pip install git+git://github.com/uniswap-python/uniswap-python.git

# Alternatively, clone the repository and install with poetry:
git clone https://github.com/uniswap-python/uniswap-python.git
cd uniswap-python
poetry install
```

---

## Initializing the Uniswap Class

To perform trades, you need to provide your Ethereum address and private key. If you're only querying data, you can set them to `None`.

The `Uniswap` class accepts several optional parameters, as detailed in the [API Reference](https://uniswap-python.com/api.html).

```python
from uniswap import Uniswap

address = "YOUR ADDRESS"          # Set to None if not making transactions
private_key = "YOUR PRIVATE KEY"  # Set to None if not making transactions
version = 2                       # Specify the Uniswap version to use
provider = "WEB3 PROVIDER URL"    # Can also be set via the 'PROVIDER' environment variable

uniswap = Uniswap(address=address, private_key=private_key, version=version, provider=provider)

# Example token addresses:
eth = "0x0000000000000000000000000000000000000000"
bat = "0x0D8775F648430679A709E98d2b0Cb6250d2887EF"
dai = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
```

### Environment Variables

The library expects the following environment variable to be set:

- `PROVIDER`: HTTP Provider URL for Web3.

You can use an Infura node, as transactions are signed locally and broadcast as raw transactions.

### Gas Pricing

To modify the gas pricing strategy, pass a custom Web3 instance to the Uniswap constructor. Details on configuring Web3 gas strategies can be found in their [documentation](https://web3py.readthedocs.io/en/stable/gas_price.html).

---

## Quoting Prices

**Note:** These methods assume a specific route for the swap, which may not be optimal. See [issue #93](https://github.com/uniswap-python/uniswap-python/issues/93) for details.

There are two functions to retrieve prices for a given token pair:

### `get_price_input()`

Returns the amount of output tokens you receive for a given amount of input tokens.

```python
# Amount of DAI received for 1 ETH (10^18 wei)
uniswap.get_price_input(eth, dai, 10**18)
```

### `get_price_output()`

Returns the amount of input tokens required to obtain a specified amount of output tokens.

```python
# Amount of ETH (in wei) needed to receive 1000 DAI
uniswap.get_price_output(eth, dai, 1_000 * 10**18)
```

**Note:** These methods return prices as integers in the smallest unit of the token. Ensure you know the number of decimals the token uses to interpret prices correctly. See [issue #12](https://github.com/uniswap-python/uniswap-python/issues/12) for details.

Decimals for common tokens:

- ETH, DAI, and BAT: 18 decimals
- WBTC: 8 decimals
- USDC and USDT: 6 decimals

You can look up the number of decimals used by a particular token by checking its contract on Etherscan.

---

## Making Trades

**Note:** The same route assumptions and need for handling decimals apply here as mentioned in the previous section.

**Warning:** Always check the expected price before executing a trade. Ensure you're using a pool with adequate liquidity to avoid significant losses. See [issue #198](https://github.com/uniswap-python/uniswap-python/issues/198) and [issue #208](https://github.com/uniswap-python/uniswap-python/issues/208) for details.

Use the Uniswap version with the most liquidity for your route. If using v3, set the `fee` parameter to use the best pool.

### `make_trade()`

Make a trade by specifying the quantity of the input token you wish to sell.

```python
# Sell 1 ETH for BAT
uniswap.make_trade(eth, bat, 1 * 10**18)

# Sell 1 BAT for ETH
uniswap.make_trade(bat, eth, 1 * 10**18)

# Sell 1 BAT for DAI
uniswap.make_trade(bat, dai, 1 * 10**18)

# Sell 1 ETH for BAT and send BAT to the provided address
uniswap.make_trade(eth, bat, 1 * 10**18, recipient="0x123...")

# Sell 1 DAI for USDC using the 0.05% fee pool (v3 only)
uniswap.make_trade(dai, usdc, 1 * 10**18, fee=500)
```

### `make_trade_output()`

Make a trade by specifying the quantity of the output token you wish to buy.

```python
# Buy ETH with 1 BAT
uniswap.make_trade_output(eth, bat, 1 * 10**18)

# Buy BAT with 