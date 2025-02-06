Here's the content from the SushiSwap SDK installation guide, converted into Markdown:

---

# SushiSwap SDK Installation Guide

You can install the SushiSwap SDK using your preferred package manager, via a `<script>` tag, or by building from source.

## Package Manager Installation

Install the required packages using your package manager of choice:

**Using pnpm:**

```bash
pnpm add sushi viem
```

**Using npm:**

```bash
npm install sushi viem
```

**Using yarn:**

```bash
yarn add sushi viem
```

**Using bun:**

```bash
bun add sushi viem
```

## CDN Installation

If you're not using a package manager, you can include the SushiSwap SDK via an ESM-compatible CDN, such as [esm.sh](https://esm.sh). Add the following `<script type="module">` tag to the bottom of your HTML file:

```html
<script type="module">
  import { getSwap, ChainId } from 'https://esm.sh/sushi';

  const swap = await getSwap({
    chainId: ChainId.ETHEREUM,
    tokenIn: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    tokenOut: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2',
    amount: 1000000000000000000n,
    maxSlippage: 0.005,
  });

  console.log(swap);
</script>
```

---

For the filename, I suggest: `sushiswap-sdk-installation.md`. 