The `uniswap-python` library offers a comprehensive API to interact with Uniswap's smart contracts across various versions. Below is an overview of its primary classes and methods:

---

## Table of Contents

1. [Uniswap Class](#uniswap-class)
   - [Initialization](#initialization)
   - [Price Quotation Methods](#price-quotation-methods)
   - [Trading Methods](#trading-methods)
   - [Balance Inquiry Methods](#balance-inquiry-methods)
   - [Liquidity Management Methods](#liquidity-management-methods)
   - [Utility Methods](#utility-methods)
2. [Token Classes](#token-classes)
   - [BaseToken](#basetoken)
   - [ERC20Token](#erc20token)
3. [Exceptions](#exceptions)
   - [InvalidToken](#invalidtoken)
   - [InsufficientBalance](#insufficientbalance)

---

## Uniswap Class

The `Uniswap` class serves as a wrapper around Uniswap's contracts, facilitating interactions such as price retrieval, trading, and liquidity management.

### Initialization

```python
class uniswap.Uniswap(
    address: Optional[Union[Address, ChecksumAddress, str]],
    private_key: Optional[str],
    provider: Optional[str] = None,
    web3: Optional[Web3] = None,
    version: int = 1,
    default_slippage: float = 0.01,
    use_estimate_gas: bool = True,
    factory_contract_addr: Optional[str] = None,
    router_contract_addr: Optional[str] = None,
    enable_caching: bool = False
)
```

**Parameters:**

- `address` (Optional[Union[Address, ChecksumAddress, str]]): The public Ethereum address to be used.
- `private_key` (Optional[str]): The private key corresponding to the Ethereum address.
- `provider` (Optional[str], default=None): A Web3 provider URI. If not provided, it defaults to the `PROVIDER` environment variable or the `web3` instance if set.
- `web3` (Optional[Web3], default=None): A custom Web3 instance.
- `version` (int, default=1): Specifies the Uniswap contract version to interact with.
- `default_slippage` (float, default=0.01): The default slippage tolerance for trades (e.g., 0.01 represents 1%).
- `use_estimate_gas` (bool, default=True): Determines whether to estimate gas usage for transactions.
- `factory_contract_addr` (Optional[str], default=None): Overrides the default factory contract address if provided.
- `router_contract_addr` (Optional[str], default=None): Overrides the default router contract address for Uniswap v2 if provided.
- `enable_caching` (bool, default=False): Enables caching of RPC method calls to improve performance.

### Price Quotation Methods

- `get_price_input(token0, token1, qty, fee=None, route=None) -> int`: Given a quantity (`qty`) of `token0`, returns the maximum output amount of `token1`.

- `get_price_output(token0, token1, qty, fee=None, route=None) -> int`: Returns the minimum amount of `token0` required to obtain a specified quantity (`qty`) of `token1`.

### Trading Methods

- `make_trade(input_token, output_token, qty, recipient=None, fee=None, slippage=None, fee_on_transfer=False) -> HexBytes`: Executes a trade by specifying the quantity (`qty`) of the input token.

- `make_trade_output(input_token, output_token, qty, recipient=None, fee=None, slippage=None) -> HexBytes`: Executes a trade by specifying the desired quantity (`qty`) of the output token.

### Balance Inquiry Methods

- `get_eth_balance() -> Wei`: Retrieves the ETH balance of the configured address.

- `get_token_balance(token) -> int`: Retrieves the balance of a specified ERC20 token for the configured address.

- `get_ex_eth_balance(token) -> int`: Retrieves the ETH balance within a specific exchange contract. (Applicable to Uniswap v1)

- `get_ex_token_balance(token) -> int`: Retrieves the token balance within a specific exchange contract. (Applicable to Uniswap v1)

### Liquidity Management Methods

- `add_liquidity(token, max_eth, min_liquidity=1) -> HexBytes`: Adds liquidity to a token-ETH pool. (Applicable to Uniswap v1)

- `remove_liquidity(token, max_token) -> HexBytes`: Removes liquidity from a token-ETH pool. (Applicable to Uniswap v1)

- `mint_liquidity(pool, amount_0, amount_1, tick_lower, tick_upper, deadline=18446744073709551616) -> TxReceipt`: Adds liquidity to a specified pool and mints a position NFT. (Applicable to Uniswap v3)

- `close_position(tokenId, amount0Min=0, amount1Min=0, deadline=None) -> TxReceipt`: Removes all liquidity from a position associated with a given `tokenId`, collects fees, and burns the token. (Applicable to Uniswap v3)

### Utility Methods

- `get_tvl_in_pool(pool) -> Tuple[float, float]`: Calculates the Total Value Locked (TVL) in a specified pool by iterating through each tick. (Note: The output may differ from the Uniswap v3 subgraph API.)

- `approve(token, max_approval=None) -> None`: Grants the exchange or router contract maximum approval to spend a specified token.

- `multicall(encoded_functions, output_types) -> List[Any]`: Executes multiple contract calls in a single request using Uniswap's Multicall2 contract.

- `get_token(address, abi_name='erc20') -> ERC20Token`: Retrieves metadata (e.g., name, symbol, decimals) from an ERC20 token contract at the specified address. 