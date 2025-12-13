#!/usr/bin/env node

/**
 * Admin CLI tool for managing reward epochs
 * 
 * Usage:
 *   node admin-cli.js generate <amount>
 * 
 * Example:
 *   node admin-cli.js generate 1000   // Generate epoch with 1000 tokens
 */

require('dotenv').config();
const { ethers } = require('ethers');
const { generateEpoch } = require('./reward-calculator');

const command = process.argv[2];
const amount = process.argv[3];

async function main() {
    if (command === 'generate') {
        if (!amount) {
            console.error('❌ Usage: node admin-cli.js generate <amount>');
            console.error('   Example: node admin-cli.js generate 1000');
            process.exit(1);
        }

        const amountInWei = ethers.parseEther(amount);
        
        console.log(`\n═══════════════════════════════════════════`);
        console.log(`  REWARD EPOCH GENERATOR`);
        console.log(`═══════════════════════════════════════════\n`);

        const result = await generateEpoch(amountInWei.toString());

        console.log(`\n═══════════════════════════════════════════`);
        console.log(`  EPOCH CREATED SUCCESSFULLY`);
        console.log(`═══════════════════════════════════════════`);
        console.log(`\n📋 Next Steps:`);
        console.log(`   1. Copy the Merkle Root: ${result.root}`);
        console.log(`   2. Call contract.createRewardEpoch():`);
        console.log(`      - merkleRoot: "${result.root}"`);
        console.log(`      - payoutToken: <YourTokenAddress>`);
        console.log(`      - total: "${amountInWei.toString()}"`);
        console.log(`\n   3. Users can now claim via frontend!\n`);

    } else {
        console.log(`\n📖 Admin CLI - Available Commands:\n`);
        console.log(`   generate <amount>  - Generate new reward epoch`);
        console.log(`\nExample:`);
        console.log(`   node admin-cli.js generate 1000\n`);
    }
}

main().catch(err => {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
});
