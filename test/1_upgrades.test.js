const {
  deployProxy,
  upgradeProxy,
  silenceWarnings,
} = require("@openzeppelin/truffle-upgrades");

const GuptaNFT = artifacts.require("GuptaNFT");
const GuptaNFTV2 = artifacts.require("GuptaNFTV2");
const GUPC = artifacts.require("GUPC");

const ETH_FEE = web3.utils.toWei("0.02");
const GUPC_FEE = web3.utils.toWei("0.03");

contract("Upgradeability", ([admin, alice, bob, feeRecipient]) => {
  let gupc, gupta;

  silenceWarnings();

  describe("Deployment", function () {
    it("should be able to deploy GUPC ERC20", async function () {
      gupc = await GUPC.new();
    });

    it("should be able to deploy Gupta proxy ERC1155", async function () {
      gupta = await deployProxy(
        GuptaNFT,
        [gupc.address, feeRecipient, ETH_FEE, GUPC_FEE],
        { admin, unsafeAllowCustomTypes: true }
      );
    });
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
  });

  describe("Upgrade", function () {
    it("should upgrade contract to V2 by admin", async function () {
      gupta = await upgradeProxy(gupta.address, GuptaNFTV2, {
        admin,
        unsafeAllowCustomTypes: true,
      });
    });

    it("should return correct ETH fee after upgrade", async function () {
      const ethFee = await gupta.ethFee();
      assert.equal(ethFee, ETH_FEE);
    });

    it("should return correct GUPC fee after upgrade", async function () {
      const gupcFee = await gupta.gupcFee();
      assert.equal(gupcFee, GUPC_FEE);
    });
  });
});
