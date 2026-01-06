// Debugging Script - Check Stake Details
// Run this in browser console on the dashboard page

// This will help us see exactly what's in your stake
console.log("=== STAKE DEBUG INFO ===");
console.log("Contract Stakes:", contractStakes);
console.log("Contract CCT Balance:", contractCctBalance);
console.log("Current Timestamp:", Math.floor(Date.now() / 1000));

if (contractStakes && contractStakes.length > 0) {
  contractStakes.forEach((stake, index) => {
    console.log(`\nStake ${index}:`);
    console.log("  CCT Amount:", stake.cctAmount?.toString());
    console.log("  Unlock Time:", stake.unlockTime?.toString());
    console.log("  Unlock Time (Date):", new Date(Number(stake.unlockTime) * 1000));
    console.log("  Withdrawn:", stake.withdrawn);
    console.log("  Created At:", new Date(Number(stake.createdAt) * 1000));
    
    const now = Math.floor(Date.now() / 1000);
    const unlockTimestamp = Number(stake.unlockTime);
    console.log("  Is Unlocked?", now >= unlockTimestamp);
    console.log("  Time Until Unlock:", unlockTimestamp - now, "seconds");
  });
}
