// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockRouter
 * @notice A simplified router for TESTNET ONLY that simulates token swaps
 * @dev This bypasses real DEX logic and just transfers tokens directly
 *      DO NOT USE ON MAINNET - This is for testing purposes only
 */
contract MockRouter {
    // Event to track swaps (matches real router interface)
    event Swap(address indexed user, uint256 amountIn, uint256 amountOut);

    /**
     * @notice Mock swap function compatible with PancakeSwap/Uniswap interface
     * @dev Simply transfers the output token to the recipient
     *      The conversion rate is hardcoded: 1 USDT (6 decimals) = 1,000,000 YourToken (18 decimals)
     */
    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external {
        require(deadline >= block.timestamp, "Expired");
        require(path.length >= 2, "Invalid path");
        
        IERC20 tokenIn = IERC20(path[0]);
        IERC20 tokenOut = IERC20(path[path.length - 1]);
        
        // Transfer input token FROM user TO this router
        tokenIn.transferFrom(msg.sender, address(this), amountIn);
        
        // Calculate output: 1 USDT (6 decimals) = 1,000,000 tokens (18 decimals)
        // So multiply by 10^12 to convert decimals, then apply 1:1000000 ratio
        uint256 amountOut = amountIn * 10**12;
        
        require(amountOut >= amountOutMin, "Insufficient output");
        
        // Transfer output token FROM router TO recipient
        tokenOut.transfer(to, amountOut);
        
        emit Swap(msg.sender, amountIn, amountOut);
    }
    
    /**
     * @notice Fund this router with your reward tokens
     * @dev Call this after deployment to give the router tokens to distribute
     */
    function fundRouter(address token, uint256 amount) external {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
    }
    
    /**
     * @notice Emergency withdrawal (admin only for testing)
     */
    function withdrawTokens(address token, uint256 amount, address to) external {
        IERC20(token).transfer(to, amount);
    }
}
