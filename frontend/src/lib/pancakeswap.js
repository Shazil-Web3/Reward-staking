// PancakeSwap V2 Router (Legacy)
export const PANCAKE_ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E';

// PancakeSwap V3 QuoterV2 (Modern)
export const PANCAKE_QUOTER_V3 = '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997';

export const USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';
export const WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
export const CCT_ADDRESS = '0xFFB619311dE851DFD6edce338dFCef6021dc80C5';

// V2 ABI
export const PANCAKE_ROUTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
      { "internalType": "address[]", "name": "path", "type": "address[]" }
    ],
    "name": "getAmountsOut",
    "outputs": [
      { "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// V3 Quoter ABI
export const QUOTER_V3_ABI = [
  {
    "inputs": [
      {
        "components": [
          { "internalType": "address", "name": "tokenIn", "type": "address" },
          { "internalType": "address", "name": "tokenOut", "type": "address" },
          { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
          { "internalType": "uint24", "name": "fee", "type": "uint24" },
          { "internalType": "uint160", "name": "sqrtPriceLimitX96", "type": "uint160" }
        ],
        "internalType": "struct IQuoterV2.QuoteExactInputSingleParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "quoteExactInputSingle",
    "outputs": [
      { "internalType": "uint256", "name": "amountOut", "type": "uint256" },
      { "internalType": "uint160", "name": "sqrtPriceX96After", "type": "uint160" },
      { "internalType": "uint32", "name": "initializedTicksCrossed", "type": "uint32" },
      { "internalType": "uint256", "name": "gasEstimate", "type": "uint256" }
    ],
    "stateMutability": "nonpayable", // Quoter functions are often non-view but static called
    "type": "function"
  }
];
