The SushiSwap Price API provides endpoints to retrieve pricing data for various tokens across different blockchain networks. Below is a guide to understanding and using these endpoints.

---

## Overview

The Price API offers functionality to fetch current token prices based on the specified blockchain (`chainId`) and token contract address. This is particularly useful for developers looking to integrate real-time pricing data into their decentralized finance (DeFi) applications.

---

## Endpoints

### 1. Get Prices for a Chain

**Endpoint:**

```
GET https://api.sushi.com/price/v1/{chainId}
```

**Description:**

Retrieves the prices of all tokens available on a specific blockchain network identified by `chainId`.

**Parameters:**

- `chainId` (number, required): The identifier of the blockchain network.

**Example Request:**

```
GET https://api.sushi.com/price/v1/1
```

This request fetches the prices of all tokens on the Ethereum mainnet (`chainId` 1).

**Response:**

The response is a JSON object where each key is a token address, and the corresponding value is the token's price in USD.

```json
{
  "0x6b175474e89094c44da98b954eedeac495271d0f": 1.00,
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": 1.00,
  "0x0000000000000000000000000000000000000000": 2000.00
}
```

*Note: The above addresses correspond to DAI, USDC, and ETH respectively.*

### 2. Get Price for a Specific Token

**Endpoint:**

```
GET https://api.sushi.com/price/v1/{chainId}/{address}
```

**Description:**

Fetches the price of a specific token on a given blockchain network.

**Parameters:**

- `chainId` (number, required): The identifier of the blockchain network.
- `address` (string, required): The contract address of the token.

**Example Request:**

```
GET https://api.sushi.com/price/v1/1/0x6b175474e89094c44da98b954eedeac495271d0f
```

This request retrieves the price of the DAI token on the Ethereum mainnet.

**Response:**

The response is a JSON object containing the token's price in USD.

```json
{
  "price": 1.00
}
```

---

## Additional Information

- **Swagger Documentation:** For a more interactive exploration of the API, refer to the [Swagger documentation](https://app.swaggerhub.com/apis/sushi-labs/sushi/5.0.0).

- **Chain IDs:** Ensure you use the correct `chainId` for the blockchain network you're interested in. For example, Ethereum mainnet is `1`, Binance Smart Chain is `56`, and Polygon (Matic) is `137`.

- **Token Addresses:** Token contract addresses are unique to each blockchain. Ensure you're using the correct address corresponding to the `chainId` specified.

By utilizing these endpoints, developers can seamlessly integrate real-time token pricing into their applications, enhancing the user experience with up-to-date financial data. 