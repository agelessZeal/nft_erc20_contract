const { deployProxy } = require("@openzeppelin/truffle-upgrades");
const {
  // BN, // Big Number support
  constants, // Common constants, like the zero address and largest integers
  // expectEvent, // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
  time,
} = require("@openzeppelin/test-helpers");

const GuptaNFT = artifacts.require("GuptaNFT");
const GUPC = artifacts.require("GUPC");

const ETH_FEE = web3.utils.toWei("0.02");
const GUPC_FEE = web3.utils.toWei("0.01");

const IPFS_HASH1 = "Qmbd1guB9bi3hKEYGGvQJYNvDUpCeuW3y4J7ydJtHfYMF6";
const IPFS_HASH2 = "QmTo5Vo3q2xF7Q4vCqkEN3iEuowVyo8rJtBXXQJw5rnXMB";

contract("Gupta Token", ([admin, alice, bob, feeRecipient, ...users]) => {
  let gupc, gupta;

  before(async function () {
    gupc = await GUPC.new();

    // DEPLOY PROXY FORGE ERC1155
    gupta = await deployProxy(
      GuptaNFT,
      [gupc.address, feeRecipient, ETH_FEE, GUPC_FEE],
      { admin, unsafeAllowCustomTypes: true }
    );

    // Fund users with GUPC tokens
    await gupc.mint(alice, web3.utils.toWei("1000"));
    await gupc.mint(bob, web3.utils.toWei("1000"));
  });

  describe("Initial Values", function () {
    it("should return correct ETH fee", async function () {
      const ethFee = await gupta.ethFee();
      assert.equal(ethFee, ETH_FEE);
    });

    it("should return correct GUPC fee", async function () {
      const gupcFee = await gupta.gupcFee();
      assert.equal(gupcFee, GUPC_FEE);
    });

    it("should return correct current token Id", async function () {
      const currentTokenId = await gupta.currentTokenId();
      assert.equal(currentTokenId, 0);
    });

    it("should return correct current fee recipient", async function () {
      const _feeRecipient = await gupta.feeRecipient();
      assert.equal(_feeRecipient, feeRecipient);
    });

    it("should return correct current gupc token address", async function () {
      const gupcAddress = await gupta.gupc();
      assert.equal(gupcAddress, gupc.address);
    });
  });

  describe("Minting Tokens", function () {
    it("reverts when buying tokens without sending ETH in tx", async function () {
      const currentTime = await time.latest();

      await expectRevert(
        gupta.buyWithETH(50, gupc.address, 2, currentTime + 10, IPFS_HASH1, {
          from: alice,
        }),
        "Not enough ETH sent"
      );
    });

    it("should buy 50 tokens using ETH", async function () {
      const currentTime = await time.latest();

      await gupta.buyWithETH(50, gupc.address, 2, currentTime + 10, IPFS_HASH1, {
        from: alice,
        value: 50 * ETH_FEE,
      });

      const aliceBalance = await gupta.balanceOf(alice, 0);
      assert.equal(aliceBalance, 50);
    });

    it("reverts when buying tokens without without approving GUPC first", async function () {
      const currentTime = await time.latest();

      await expectRevert(
        gupta.buyWithGUPC(50, gupc.address, 2, currentTime + 10, IPFS_HASH1, {
          from: bob,
        }),
        "ERC20: transfer amount exceeds allowance"
      );
    });

    it("should buy 50 tokens using GUPC", async function () {
      const currentTime = await time.latest();

      await gupc.approve(gupta.address, String(50 * GUPC_FEE), { from: bob });

      await gupta.buyWithGUPC(
        50,
        constants.ZERO_ADDRESS,
        0,
        Number(currentTime) + 10,
        IPFS_HASH2,
        {
          from: bob,
        }
      );

      const bobBalance = await gupta.balanceOf(bob, 1);
      assert.equal(bobBalance, 50);
    });

    it("should be able to transfer bought tokens to other users", async function () {
      for (let i = 0; i < 3; i++) {
        await gupta.safeTransferFrom(alice, users[i], 0, 1, "0x", {
          from: alice,
        });

        let tokenBalance = await gupta.balanceOf(users[i], 0);
        assert.equal(tokenBalance, 1);
      }

      for (let i = 0; i < 3; i++) {
        await gupta.safeTransferFrom(bob, users[i], 1, 1, "0x", {
          from: bob,
        });

        let tokenBalance = await gupta.balanceOf(users[i], 1);
        assert.equal(tokenBalance, 1);
      }
    });
  });

  describe("Burning Tokens", function () {
    it("newly minted tokens should not be burnable", async function () {
      const canBurn = await gupta.canBurn(0, alice);
      assert(!canBurn);
    });

    it("should not be able to burn if user meets min balance", async function () {
      // Fund users with min balance (2 GUPC)
      for (let i = 0; i < 3; i++) {
        await gupc.mint(users[i], web3.utils.toWei("2"));
      }

      for (let i = 0; i < 3; i++) {
        const canBurn = await gupta.canBurn(0, users[i]); // users do not have GUPC tokens yet
        assert(!canBurn);
      }
    });

    it("only burner role should be able to burn a token when GUPC min balance conditions is met", async function () {
      await expectRevert(
        gupta.burnToken(0, users[0], { from: alice }),
        "Can't burn token yet"
      );

      await gupc.transfer(alice, web3.utils.toWei("2"), { from: users[0] });

      await expectRevert(
        gupta.burnToken(0, users[0], { from: alice }),
        "Must have burner role"
      );

      // Add burner role
      await gupta.grantRole(web3.utils.sha3("BURNER_ROLE"), admin, {
        from: admin,
      });

      // Burn token
      await gupta.burnToken(0, users[0], { from: admin });
    });

    it("should be able to burn tokens in batch when it expires", async function () {
      await expectRevert(
        gupta.burnToken(1, users[0], { from: admin }),
        "Can't burn token yet"
      );

      await time.increase(time.duration.seconds(10));
      await time.advanceBlock(1);

      // Burn token
      await gupta.burnTokenBatch(
        Array(3).fill(1),
        [users[0], users[1], users[2]],
        { from: admin }
      );
    });
  });
});
