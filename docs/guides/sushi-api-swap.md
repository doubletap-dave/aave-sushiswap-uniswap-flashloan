The SushiSwap Swap API enables developers to generate the necessary call data for executing swap transactions programmatically. This facilitates seamless integration of swap functionalities into decentralized applications (dApps).

---

## Overview

The Swap API provides endpoints to create swap call data, which can be used to execute token swaps on the SushiSwap protocol. This is particularly useful for developers looking to integrate swap functionalities into their applications without delving deep into the underlying smart contract interactions.

---

## Swagger Documentation

For a comprehensive and interactive exploration of the API endpoints, refer to the [Swagger documentation](https://app.swaggerhub.com/apis/sushi-labs/sushi/5.0.0).

---

## Example Usage

Below is an example of how to use the Swap API in a JavaScript environment:

```javascript
import { createPublicClient, createWalletClient, http, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';
import { type SwapResponse } from 'sushi/api';

// Initialize the public client for the mainnet
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

const chainId = 1; // Ethereum mainnet

const SWAP_API_URL = new URL('https://api.sushi.com/swap/v5/' + chainId);

// Define the input and output tokens
const inputCurrency = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'; // ETH
const outputCurrency = '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2'; // SUSHI

// Specify the amount to swap (in wei)
const amount = 1000000000000000; // 0.001 ETH

// Set the maximum slippage tolerance
const maxSlippage = 0.005; // 0.5%

// Define the recipient address
const to = '0x...'; // Replace with your own address

// Configure the URL search parameters
const { searchParams } = SWAP_API_URL;
searchParams.set('tokenIn', inputCurrency);
searchParams.set('tokenOut', outputCurrency);
searchParams.set('amount', amount.toString());
searchParams.set('maxSlippage', maxSlippage.toString());
searchParams.set('to', to);
searchParams.set('includeTransaction', 'true');

// Make the API call
console.log(SWAP_API_URL.toString());
const res = await fetch(SWAP_API_URL.toString());
const data = await res.json() as SwapResponse;
console.log(data);

// If the swap status is 'Success'
if (data.status === 'Success') {
  const { tx } = data;

  // Simulate a call to the blockchain for the swap
  const callResult = await publicClient.call({
    account: tx.from,
    data: tx.data,
    to: tx.to,
    value: tx.value,
  });
  // Returns the simulated amount out
  console.log('Output: ', callResult);

  // Send a transaction
  const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex;
  const walletClient = createWalletClient({
    chain: mainnet,
    transport: http(),
  });
  const hash = await walletClient.sendTransaction({
    account: privateKeyToAccount(PRIVATE_KEY),
    data: tx.data,
    to: tx.to,
    value: tx.value,
  });
  console.log('Tx: ', hash);
}
```

**Explanation:**

1. **Client Initialization:**
   - A public client is created to interact with the Ethereum mainnet.

2. **API URL Configuration:**
   - The Swap API URL is constructed using the specified `chainId`.

3. **Token and Amount Specification:**
   - The input and output tokens are defined by their contract addresses.
   - The amount to be swapped is specified in wei.

4. **Slippage and Recipient Settings:**
   - The maximum slippage tolerance is set to 0.5%.
   - The recipient address is specified.

5. **API Call:**
   - The search parameters are appended to the API URL.
   - A fetch request is made to the API to retrieve the swap data.

6. **Transaction Simulation and Execution:**
   - If the API response indicates success, the transaction data is used to simulate the swap on the blockchain.
   - Upon successful simulation, the transaction is signed and sent using the wallet client.

**Note:** Ensure that you replace placeholders like `'0x...'` and `'YOUR_PRIVATE_KEY'` with actual values. Additionally, handle private keys securely and never expose them in your code.

---

By leveraging the SushiSwap Swap API, developers can efficiently integrate token swap functionalities into their applications, enhancing the DeFi experience for users. 