const Moralis = require('moralis').default;
const { ethers } = require('ethers');
const { USDT_DECIMALS } = require('../config/constants');


class MoralisService {
    constructor() {
        this.isInitialized = false;
        // Check multiple env vars to find the address
        this.depositContractAddress = process.env.DEPOSIT_CONTRACT_ADDRESS || 
                                      process.env.STAKING_CONTRACT_ADDRESS || 
                                      process.env.NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS;
    }

    async initialize() {
        if (!this.isInitialized) {
            try {
                console.log('📡 Initializing Moralis Service...');
                await Moralis.start({
                    apiKey: process.env.MORALIS_API_KEY
                });
                this.isInitialized = true;
                console.log('✅ Moralis Initialized Successfully');
                console.log('🔗 Monitoring Chain ID:', process.env.CHAIN_ID || "1 (Mainnet)");
            } catch (error) {
                console.error('❌ Moralis Initialization Failed:', error.message);
                // Don't kill process, allows retry
            }
        }
    }

    /**
     * Verifies a transaction hash maps to a valid deposit
     * @param {string} txHash - Transaction hash submitted by user
     * @param {string} expectedOrderId - Order ID expected for this transaction
     * @returns {Object} verification result
     */
    async verifyDepositTransaction(txHash, expectedOrderId) {
        if (!this.isInitialized) await this.initialize();

        try {
            console.log(`\n🔎 [Moralis] Verifying Transaction: ${txHash}`);
            console.log(`📋 [Moralis] Expected Order ID: ${expectedOrderId}`);

            // 1. Fetch Transaction with Retry Logic (Handling Indexing Lag)
            const chainId = process.env.CHAIN_ID === '56' ? '0x38' : '0xaa36a7'; // Default Seoplio/ETH
            console.log(`🌐 [Moralis] Fetching from Chain: ${chainId}`);
            
            let response = null;
            let retries = 5;
            
            while (retries > 0) {
                try {
                    response = await Moralis.EvmApi.transaction.getTransaction({
                        chain: chainId,
                        transactionHash: txHash
                    });
                    if (response && response.raw) break; // Found it!
                } catch (e) {
                    // Ignore 404/not found errors during retry attempts
                    console.log(`⏳ TX not indexed yet. Retrying in 2s... (${retries} left)`);
                }
                
                retries--;
                if (retries > 0) await new Promise(r => setTimeout(r, 2000)); // Wait 2s
            }

            if (!response || !response.raw) {
                return { verified: false, error: 'Transaction not found via Moralis after retries (Indexing lag?)' };
            }

            const tx = response.raw;

            // 2. Verify Success
            if (tx.receipt_status !== '1') {
                return { verified: false, error: 'Transaction failed on blockchain' };
            }

            // 3. Verify Target Contract
            if (tx.to_address.toLowerCase() !== this.depositContractAddress.toLowerCase()) {
                return { verified: false, error: 'Transaction sent to wrong contract' };
            }

            // 5. Decode Input Data
            // We look for 'deposit' or 'depositUSDT'
            
            let decodedParams = {};
            
            // Try Moralis decoding first
            if (tx.decoded_call && (tx.decoded_call.label === 'deposit' || tx.decoded_call.label === 'depositUSDT')) {
                tx.decoded_call.params.forEach(p => {
                    decodedParams[p.name] = p.value;
                });
            } else {
                // Fallback to manual decoding using ethers
                try {
                    const iface = new ethers.Interface([
                        "function deposit(bytes32 orderId, uint256 amount, string referralCode)",
                        "function depositUSDT(bytes32 orderId, uint256 usdtAmount, uint256 cctAmount, uint256 lockDurationSeconds, string referralCode)"
                    ]);
                    const decoded = iface.parseTransaction({ data: tx.input });
                    
                    if (decoded) {
                         // Normalize fields to what we expect
                         decodedParams = {
                            orderId: decoded.args[0],
                            amount: decoded.name === 'depositUSDT' ? decoded.args[1].toString() : decoded.args[1].toString(), // usdtAmount is 2nd arg
                            referralCode: decoded.name === 'depositUSDT' ? decoded.args[4] : decoded.args[2]
                         };
                    }
                } catch (e) {
                    console.error("Decoding Error details:", e);
                    return { verified: false, error: 'Could not decode transaction data' };
                }
            }

            // 6. Verify Order ID
            if (decodedParams.orderId !== expectedOrderId) {
                return { verified: false, error: `Order ID mismatch. Expected ${expectedOrderId}, got ${decodedParams.orderId}` };
            }

            // Success!
            return {
                verified: true,
                userAddress: tx.from_address,
                amount: paramsToNumber(decodedParams.amount), // Convert details
                rawAmount: decodedParams.amount,
                referralCode: decodedParams.referralCode,
                blockNumber: tx.block_number,
                blockTimestamp: tx.block_timestamp
            };

        } catch (error) {
            console.error('Moralis Verification Error:', error);
            return { verified: false, error: error.message };
        }
    }
}

// Helper: Convert wei string to number
function paramsToNumber(amountStr) {
    if (!amountStr) return 0;
    // BSC (Chain 56) uses 18 decimals for USDT. ETH uses 6.
    const decimals = process.env.CHAIN_ID === '56' ? 18 : USDT_DECIMALS;
    return parseFloat(ethers.formatUnits(amountStr, decimals));
}

const moralisService = new MoralisService();
module.exports = moralisService;
