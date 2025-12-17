# Smart Contract Changes for VIP Reward Pool

## ⚠️ IMPORTANT: Contract Redeployment Required

These changes require redeploying the staking contract. You cannot update the existing deployed contract unless you have an upgradeable proxy pattern.

## Changes to staking.sol

### 1. Add State Variables

Add after line 72 (after the existing `claimed` mapping):

```solidity
// --- VIP Reward Pool ---
uint256 public vipPoolBalance;  // Track VIP pool separately
uint256 public vipEpochsCount;
mapping(uint256 => Epoch) public vipEpochs;                 // VIP epochs
mapping(uint256 => mapping(address => bool)) public vipClaimed; // VIP claims
```

### 2. Add Events

Add after line 99 (after existing events):

```solidity
event VipPoolFunded(uint256 amount, string source); // source: "claim_fee" or "manual"
event VipRewardEpochCreated(uint256 indexed epochId, bytes32 merkleRoot, uint256 total);
event VipRewardClaimed(uint256 indexed epochId, address indexed user, uint256 amount);
```

### 3. Modify claim() Function

Replace the existing `claim()` function (lines 260-271) with:

```solidity
function claim(uint256 epochId, uint256 amount, bytes32[] calldata proof) external nonReentrant {
    Epoch memory e = epochs[epochId];
    require(e.active, "inactive");
    require(!claimed[epochId][msg.sender], "claimed");

    bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));
    require(MerkleProof.verify(proof, e.root, leaf), "bad proof");

    claimed[epochId][msg.sender] = true;
    
    // Calculate 5% fee for VIP pool
    uint256 vipFee = (amount * 500) / 10_000; // 5% = 500 basis points
    uint256 userAmount = amount - vipFee;
    
    // Update VIP pool balance
    vipPoolBalance += vipFee;
    emit VipPoolFunded(vipFee, "claim_fee");
    
    // Transfer reduced amount to user
    e.payoutToken.safeTransfer(msg.sender, userAmount);
    emit RewardClaimed(epochId, msg.sender, userAmount);
}
```

### 4. Add New VIP Functions

Add these new functions after the existing `claim()` function:

```solidity
/// @notice Admin can manually fund the VIP reward pool
function fundVipRewardTokens(address token, uint256 amount) external onlyOwner {
    IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    vipPoolBalance += amount;
    emit VipPoolFunded(amount, "manual");
}

/// @notice Create a VIP reward epoch for 100+ referral users
function createVipRewardEpoch(bytes32 merkleRoot, address payoutToken, uint256 total) external onlyOwner {
    require(merkleRoot != bytes32(0) && payoutToken != address(0) && total> 0, "bad epoch");
    require(vipPoolBalance >= total, "insufficient VIP pool");
    
    vipEpochs[vipEpochsCount] = Epoch({
        root: merkleRoot,
        payoutToken: IERC20(payoutToken),
        total: total,
        active: true
    });
    
    vipPoolBalance -= total; // Reserve for distribution
    emit VipRewardEpochCreated(vipEpochsCount, merkleRoot, total);
    vipEpochsCount++;
}

/// @notice Users claim their VIP rewards (separate from normal rewards)
function claimVip(uint256 epochId, uint256 amount, bytes32[] calldata proof) external nonReentrant {
    Epoch memory e = vipEpochs[epochId];
    require(e.active, "inactive");
    require(!vipClaimed[epochId][msg.sender], "claimed");
    
    bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));
    require(MerkleProof.verify(proof, e.root, leaf), "bad proof");
    
    vipClaimed[epochId][msg.sender] = true;
    e.payoutToken.safeTransfer(msg.sender, amount);
    emit VipRewardClaimed(epochId, msg.sender, amount);
}

/// @notice Get current VIP pool balance
function getVipPoolBalance() external view returns (uint256) {
    return vipPoolBalance;
}
```

## Summary of Changes

1. **3 new state variables**: `vipPoolBalance`, `vipEpochsCount`, `vipEpochs`, `vipClaimed`
2. **3 new events**: `VipPoolFunded`, `VipRewardEpochCreated`, `VipRewardClaimed`
3. **Modified `claim()`**: Now deducts 5% fee and adds to VIP pool
4. **4 new functions**: `fundVipRewardTokens()`, `createVipRewardEpoch()`, `claimVip()`, `getVipPoolBalance()`

## Testing After Deployment

After redeploying the contract:

1. Update `.env` with new `CONTRACT_ADDRESS`
2. Test normal reward claim - verify 5% goes to VIP pool
3. Test manual VIP pool funding
4. Test VIP epoch creation with 100+ referral users
5. Test VIP reward claiming

## Deployment Checklist

- [ ] Add the state variables
- [ ] Add the events
- [ ] Modify the claim() function
- [ ] Add the new VIP functions
- [ ] Compile the contract
- [ ] Deploy to testnet first
- [ ] Test all functions
- [ ] Deploy to mainnet
- [ ] Update CONTRACT_ADDRESS in .env
- [ ] Verify contract on block explorer
