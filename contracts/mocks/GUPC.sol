// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "@openzeppelin/contracts/presets/ERC20PresetFixedSupply.sol";

contract GUPC is ERC20PresetFixedSupply {
    constructor() ERC20PresetFixedSupply("Gup Coin", "GUPC", 11000000 ether, msg.sender) {}
}
