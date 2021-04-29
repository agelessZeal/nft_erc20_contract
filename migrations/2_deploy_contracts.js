const {
  deployProxy,
  silenceWarnings,
} = require("@openzeppelin/truffle-upgrades");

const GuptaNFT = artifacts.require("GuptaNFT");
const GUPC = artifacts.require("GUPC");

const ETH_FEE = web3.utils.toWei("0.01");
const GUPC_FEE = web3.utils.toWei("0.005");

const FEE_RECIPIENT = "0x2402aa453F593fF39f443B177c84413b7Eb7971D";

const APP_URL = "https://lalala.gup/";

module.exports = async function (deployer, network, accounts) {
  if (network === "test") return;

  silenceWarnings();

  // DEPLOY PROXY GUPC ERC20
  await deployer.deploy(GUPC);
  const gupcToken = await GUPC.deployed();

  // DEPLOY PROXY GUPTANFT ERC1155
  const guptaNFT = await deployProxy(
    GuptaNFT,
    [gupcToken.address, FEE_RECIPIENT, ETH_FEE, GUPC_FEE],
    { deployer, unsafeAllowCustomTypes: true }
  );

  await guptaNFT.setContractURI(APP_URL);

  console.log("Deployed Gupta", guptaNFT.address);

  console.log("Granting Burner Role to Accounts 0");
  await guptaNFT.grantRole(web3.utils.sha3("BURNER_ROLE"), accounts[0]);
};
