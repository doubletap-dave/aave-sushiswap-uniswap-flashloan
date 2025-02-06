Here's the content from the SushiSwap SDK Swap guide, converted into Markdown:

---

# SushiSwap SDK: Swap Guide

To perform a token swap using the SushiSwap SDK, follow these steps:

1. **Import Necessary Modules:**

   ```javascript
   import { getSwap, ChainId } from 'sushi';
   import { createPublicClient, createWalletClient, http, type Hex } from 'viem';
   import { privateKeyToAccount } from 'viem/accounts';
   import { mainnet } from 'viem/chains';
   ```

2. **Initialize the Public Client:**

   ```javascript
   const publicClient = createPublicClient({
     chain: mainnet,
     transport: http(),
   });
   ```

3. **Fetch Swap Data:**

   ```javascript
   const data = await getSwap({
     chainId: ChainId.ETHEREUM, // Ethereum chain ID
     tokenIn: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH token address
     tokenOut: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2', // SUSHI token address
     to: '0x...', // Replace with your own address
     amount: 1000000000000000000n, // 1 ETH in wei
     maxSlippage: 0.005, // 0.5% max slippage
     includeTransaction: true, // Include transaction details in response
   });
   console.log(data);
   ```

4. **Simulate the Swap:**

   If the swap status is `'Success'`:

   ```javascript
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
     console.log('Output:', callResult);
   }
   ```

5. **Send the Transaction:**

   ```javascript
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
   console.log('Transaction Hash:', hash);
   ```

**Note:** Replace `'0x...'` with your actual wallet address and ensure that `PRIVATE_KEY` is set in your environment variables.