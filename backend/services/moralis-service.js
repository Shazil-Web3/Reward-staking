const Moralis = require('moralis').default;
const { ethers } = require('ethers');

class MoralisService {
    constructor() {
        this.isInitialized = false;
        this.depositContractAddress = process.env.DEPOSIT_CONTRACT_ADDRESS;
    }

    async initialize() {
        if (!this.isInitialized) {
            try {
                await Moralis.start({
                    apiKey: process.env.MORALIS_API_KEY
                });
                this.isInitialized = true;
                console.log('✅ Moralis Initialized');
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
            console.log(`🔍 Verifying TX: ${txHash}`);

            // 1. Fetch Transaction
            const chainId = process.env.CHAIN_ID === '56' ? '0x38' : '0x1'; // Default ETH
            
            const response = await Moralis.EvmApi.transaction.getTransaction({
                chain: chainId,
                transactionHash: txHash
            });

            if (!response || !response.raw) {
                return { verified: false, error: 'Transaction not found via Moralis' };
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

            // 4. Decode Input Data
            // We look for the 'deposit' function call
            // deposit(bytes32 orderId, uint256 amount, string referralCode)
            
            let decodedParams = {};
            
            // Try Moralis decoding first
            if (tx.decoded_call && tx.decoded_call.label === 'deposit') {
                tx.decoded_call.params.forEach(p => {
                    decodedParams[p.name] = p.value;
                });
            } else {
                // Fallback to manual decoding using ethers
                try {
                    const iface = new ethers.Interface([
                        "function deposit(bytes32 orderId, uint256 amount, string referralCode)"
                    ]);
                    const decoded = iface.parseTransaction({ data: tx.input });
                    decodedParams = {
                        orderId: decoded.args[0],
                        amount: decoded.args[1].toString(),
                        referralCode: decoded.args[2]
                    };
                } catch (e) {
                    return { verified: false, error: 'Could not decode transaction data' };
                }
            }

            // 5. Verify Order ID
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

// Helper: Convert wei string to number (USDT 6 decimals)
function paramsToNumber(amountStr) {
    if (!amountStr) return 0;
    // Assuming 6 decimals for USDT
    return parseFloat(ethers.formatUnits(amountStr, 6));
}

const moralisService = new MoralisService();
module.exports = moralisService;
