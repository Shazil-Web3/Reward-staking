// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

interface IUniswapV2Router02 {
    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;
}

contract StakingLock is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Tokens & Router ---
    IERC20 public immutable yourToken; // the token users eventually withdraw
    IERC20 public immutable usdt;      // USDT (6 decimals)
    IUniswapV2Router02 public router;  // Uniswap/Pancake router

    // --- Fees / Destinations ---
    address public feeCollector;
    bool    public retainFeesInContract = true; // keep fees here by default
    uint256 public usdtFeesAccrued;            // tracked USDT fees held by this contract

    // --- Lock period constants (1–5 years) ---
    uint256 public constant ONE_YEAR       = 60; // 1 minute for testing (CHANGE BACK TO 365 days FOR PROD)
    uint256 public constant MIN_LOCK       = ONE_YEAR;        // 1 year
    uint256 public constant MAX_LOCK       = ONE_YEAR * 5;    // 5 years
    uint8   public constant MAX_LOCK_YEARS = 5;

    // --- Packages ---
    // Starter:  $50+   (10 referrals)
    // Pro:      $100+  (5 referrals)
    // Elite:    $1000+ (0 referrals)
    // Custom:   any amount >= 50$ mapped into Starter/Pro/Elite by value
    enum Package { Starter, Pro, Elite, Custom }

    struct Tier {
        uint256 minUsd;     // 6-dec USDT units (e.g., 50e6)
        uint16  feeBps;     // 1000 = 10%
        uint32  minLock;    // must be 1 year
        uint32  maxLock;    // must be 5 years
        uint8   referralReq;// direct referrals needed for eligibility
        bool    active;
    }

    // Starter, Pro, Elite are stored here.
    // Custom is derived dynamically from these based on amount.
    mapping(uint8 => Tier) public tiers;

    // --- Locks ---
    struct Lock {
        uint256 amountToken;  // YourToken locked
        uint64  start;
        uint64  end;
        uint8   packageId;    // which package user selected (incl. Custom=3)
        bool    withdrawn;
    }
    mapping(address => Lock[]) public locksOf;

    // --- Referrals ---
    mapping(address => address) public referrerOf;     // user => referrer (immutable once set)
    mapping(address => uint32)  public directReferrals;// referrer => count of new users who purchased once

    // --- Rewards (Merkle epochs) ---
    struct Epoch {
        bytes32 root;         // Merkle root of (account, amount)
        IERC20  payoutToken;  // token distributed (usually YourToken)
        uint256 total;        // total allocation (for reference)
        bool    active;
    }
    uint256 public epochsCount;
    mapping(uint256 => Epoch) public epochs;                 // epochId => epoch
    mapping(uint256 => mapping(address => bool)) public claimed; // epochId => user => claimed?

    // --- VIP Reward Pool ---
    uint256 public vipPoolBalance;  // Track VIP pool separately
    uint256 public vipEpochsCount;
    mapping(uint256 => Epoch) public vipEpochs;                 // VIP epochs
    mapping(uint256 => mapping(address => bool)) public vipClaimed; // VIP claims

    // --- Events ---
    event Locked(address indexed user, uint256 indexed lockId, uint8 packageId, uint256 tokenAmount, uint64 end);
    event Withdrawn(address indexed user, uint256 indexed lockId, uint256 tokenAmount);
    event FeeCollected(address indexed user, uint256 usdAmount);
    event FeesAccrued(uint256 amount);
    event FeesConverted(uint256 usdtIn, uint256 tokenOut);
    event RouterUpdated(address indexed newRouter);
    event FeeCollectorUpdated(address indexed newCollector);
    event RetainFeesUpdated(bool retainInContract);
    event TierUpdated(uint8 indexed packageId, Tier tier);
    event ReferrerSet(address indexed user, address indexed referrer);
    event RewardEpochCreated(uint256 indexed epochId, bytes32 merkleRoot, address payoutToken, uint256 total);
    event RewardClaimed(uint256 indexed epochId, address indexed user, uint256 amount);
    event RewardTokensFunded(address indexed token, uint256 amount);
    event Rescue(address indexed token, uint256 amount);
    event VipPoolFunded(uint256 amount, string source); // source: "claim_fee" or "manual"
    event VipRewardEpochCreated(uint256 indexed epochId, bytes32 merkleRoot, uint256 total);
    event VipRewardClaimed(uint256 indexed epochId, address indexed user, uint256 amount);

    constructor(
        address _yourToken,
        address _usdt,
        address _router,
        address _feeCollector,
        Tier memory starter,
        Tier memory pro,
        Tier memory elite
    ) Ownable(msg.sender) {
        require(
            _yourToken != address(0) &&
            _usdt != address(0) &&
            _router != address(0) &&
            _feeCollector != address(0),
            "zero addr"
        );

        yourToken    = IERC20(_yourToken);
        usdt         = IERC20(_usdt);
        router       = IUniswapV2Router02(_router);
        feeCollector = _feeCollector;

        _checkTier(starter);
        _checkTier(pro);
        _checkTier(elite);

        tiers[uint8(Package.Starter)] = starter;
        tiers[uint8(Package.Pro)]     = pro;
        tiers[uint8(Package.Elite)]   = elite;
    }

    // --- Main entry: pay USDT -> fee -> swap remainder (USDT→YourToken) -> lock YourToken ---
    function buyAndLock(
        uint256 amountUSDT,      // 6-dec units
        uint256 minTokensOut,    // slippage guard (YourToken amount)
        uint256 duration,        // seconds (must be 1,2,3,4,5 years)
        uint8   packageId,       // Starter/Pro/Elite/Custom
        address referrer,        // optional on first purchase
        uint256 deadline         // router deadline
    ) external whenNotPaused nonReentrant {
        require(amountUSDT > 0, "amount=0");
        require(packageId <= uint8(Package.Custom), "bad pkg");

        // Determine effective tier (for Custom this maps by amount)
        Tier memory t = _tierFor(packageId, amountUSDT);
        require(t.active, "tier inactive");
        require(_isValidDuration(duration, t), "bad duration");

        // Pull USDT from user
        usdt.safeTransferFrom(msg.sender, address(this), amountUSDT);

        // Fee (10%)
        uint256 fee = (amountUSDT * t.feeBps) / 10_000;
        if (fee > 0) {
            if (retainFeesInContract) {
                usdtFeesAccrued += fee;
                emit FeesAccrued(fee);
            } else {
                usdt.safeTransfer(feeCollector, fee);
            }
            emit FeeCollected(msg.sender, fee);
        }
        uint256 toSwap = amountUSDT - fee;
        require(toSwap > 0, "nothing to swap");

        // Approve router for USDT
        usdt.forceApprove(address(router), 0);
        usdt.forceApprove(address(router), toSwap);

        // Build direct path: USDT -> YourToken
        address[] memory path = _buildPath(address(usdt), address(yourToken));

        // Measure before/after to compute exact received amount
        uint256 beforeBal = yourToken.balanceOf(address(this));
        router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
            toSwap,
            minTokensOut,
            path,
            address(this),
            deadline
        );
        uint256 received = yourToken.balanceOf(address(this)) - beforeBal;
        require(received >= minTokensOut && received > 0, "insufficient out");

        // Record lock (tokens stay in contract until unlock)
        Lock memory L = Lock({
            amountToken: received,
            start: uint64(block.timestamp),
            end:   uint64(block.timestamp + duration),
            packageId: packageId,
            withdrawn: false
        });
        locksOf[msg.sender].push(L);
        emit Locked(msg.sender, locksOf[msg.sender].length - 1, packageId, received, L.end);

        // Referrer logic (set once; increment direct count on first qualifying purchase)
        _handleReferrer(msg.sender, referrer);
    }

    // --- Withdraw locked tokens after unlock time ---
    function withdraw(uint256 lockId) external nonReentrant {
        require(lockId < locksOf[msg.sender].length, "bad id");
        Lock storage L = locksOf[msg.sender][lockId];
        require(!L.withdrawn, "already");
        require(block.timestamp >= L.end, "locked");

        L.withdrawn = true;
        yourToken.safeTransfer(msg.sender, L.amountToken);
        emit Withdrawn(msg.sender, lockId, L.amountToken);
    }

    // --- Reward funding & Merkle epochs ---
    function fundRewardTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit RewardTokensFunded(token, amount);
    }

    /// @notice Convert accrued USDT fees to yourToken before creating an epoch.
    function convertFeesToPayout(uint256 minOut, uint256 deadline)
        external
        onlyOwner
        whenNotPaused
        nonReentrant
    {
        uint256 usdtBal = usdt.balanceOf(address(this));
        uint256 toConvert = usdtFeesAccrued > usdtBal ? usdtBal : usdtFeesAccrued;
        require(toConvert > 0, "no fees");

        usdt.forceApprove(address(router), 0);
        usdt.forceApprove(address(router), toConvert);

        address[] memory path = _buildPath(address(usdt), address(yourToken));

        uint256 before = yourToken.balanceOf(address(this));
        router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
            toConvert, minOut, path, address(this), deadline
        );
        uint256 got = yourToken.balanceOf(address(this)) - before;

        usdtFeesAccrued = 0;

        emit FeesConverted(toConvert, got);
    }

    /// @notice Create a Merkle epoch after you funded the pool.
    function createRewardEpoch(bytes32 merkleRoot, address payoutToken, uint256 total) external onlyOwner {
        require(merkleRoot != bytes32(0) && payoutToken != address(0) && total > 0, "bad epoch");
        require(IERC20(payoutToken).balanceOf(address(this)) >= total, "insufficient pool");

        epochs[epochsCount] = Epoch({
            root: merkleRoot,
            payoutToken: IERC20(payoutToken),
            total: total,
            active: true
        });
        emit RewardEpochCreated(epochsCount, merkleRoot, payoutToken, total);
        epochsCount++;
    }

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

    /// @notice Admin can manually fund the VIP reward pool
    function fundVipRewardTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        vipPoolBalance += amount;
        emit VipPoolFunded(amount, "manual");
    }

    /// @notice Create a VIP reward epoch for 100+ referral users
    function createVipRewardEpoch(bytes32 merkleRoot, address payoutToken, uint256 total) external onlyOwner {
        require(merkleRoot != bytes32(0) && payoutToken != address(0) && total > 0, "bad epoch");
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

    // --- Views ---
    function getLocks(address user) external view returns (Lock[] memory) {
        return locksOf[user];
    }

    /// @notice Purely informational helper; rewards are enforced off-chain via the Merkle tree.
    function isQualified(address user, uint8 packageId, uint256 amountUsd6) public view returns (bool) {
        uint8 req = _referralsRequired(packageId, amountUsd6);
        return directReferrals[user] >= req;
    }

    // --- Admin / Config ---
    function setRouter(address newRouter) external onlyOwner {
        require(newRouter != address(0), "zero");
        router = IUniswapV2Router02(newRouter);
        emit RouterUpdated(newRouter);
    }

    function setFeeCollector(address newCollector) external onlyOwner {
        require(newCollector != address(0), "zero");
        feeCollector = newCollector;
        emit FeeCollectorUpdated(newCollector);
    }

    function setRetainFeesInContract(bool retain) external onlyOwner {
        retainFeesInContract = retain;
        emit RetainFeesUpdated(retain);
    }

    function setTier(uint8 packageId, Tier calldata t) external onlyOwner {
        require(packageId != uint8(Package.Custom), "custom is dynamic");
        _checkTier(t);
        tiers[packageId] = t;
        emit TierUpdated(packageId, t);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // Rescue non-staked tokens accidentally sent (does not touch users' locked accounting)
    function rescue(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit Rescue(token, amount);
    }

    // --- Internal helpers ---

    // Returns the effective Tier for a given package & amount.
    // For Custom, we compute it dynamically from Starter/Pro/Elite thresholds.
    function _tierFor(uint8 packageId, uint256 amountUsd6) internal view returns (Tier memory t) {
        if (packageId == uint8(Package.Custom)) {
            Tier memory starter = tiers[uint8(Package.Starter)];
            Tier memory pro     = tiers[uint8(Package.Pro)];
            Tier memory elite   = tiers[uint8(Package.Elite)];

            require(starter.active && pro.active && elite.active, "tiers inactive");
            require(amountUsd6 >= starter.minUsd, "custom < min");

            // > elite.minUsd      => Elite (no referrals)
            // >= pro.minUsd       => Pro
            // else (>= starter)   => Starter
            if (amountUsd6 > elite.minUsd) {
                t = elite;
            } else if (amountUsd6 >= pro.minUsd) {
                t = pro;
            } else {
                t = starter;
            }
            return t;
        } else {
            t = tiers[packageId];
            require(t.active, "tier inactive");
            require(amountUsd6 >= t.minUsd, "below min");
            return t;
        }
    }

    // For UI checks only; actual eligibility is enforced off-chain in the Merkle tree.
    function _referralsRequired(uint8 packageId, uint256 amountUsd6) internal view returns (uint8 req) {
        if (packageId == uint8(Package.Custom)) {
            Tier memory t = _tierFor(packageId, amountUsd6);
            return t.referralReq;
        }
        return tiers[packageId].referralReq;
    }

    function _handleReferrer(address user, address ref) internal {
        // set once
        if (referrerOf[user] == address(0) && ref != address(0) && ref != user) {
            referrerOf[user] = ref;
            emit ReferrerSet(user, ref);
        }
        address r = referrerOf[user];
        // increment only on the user's first purchase
        if (r != address(0) && locksOf[user].length == 1) {
            unchecked { directReferrals[r] += 1; }
        }
    }

    // 🔧 This is the version you asked for
    function _buildPath(address tokenIn, address tokenOut)
        internal
        pure
        returns (address[] memory path)
    {
       path = new address[](2);  // ✅ Correct: fixed-size array of length 2// Fixed-length array of size 2 (tokenIn + tokenOut)
        path[0] = tokenIn;
        path[1] = tokenOut;
    }

    function _checkTier(Tier memory t) internal pure {
        // Enforce global rules: 10% fee, lock between 1 and 5 years.
        require(t.feeBps == 1000, "fee must be 10%");
        require(uint256(t.minLock) == MIN_LOCK, "minLock must be 1y");
        require(uint256(t.maxLock) == MAX_LOCK, "maxLock must be 5y");
        require(t.minUsd > 0, "minUsd=0");
        require(t.active, "inactive tier");
    }

    function _isValidDuration(uint256 duration, Tier memory t) internal pure returns (bool) {
        if (duration < t.minLock || duration > t.maxLock) return false;
        if (duration % ONE_YEAR != 0) return false;
        uint256 yearsCount = duration / ONE_YEAR;
        if (yearsCount < 1 || yearsCount > MAX_LOCK_YEARS) return false;
        return true;
    }
}
