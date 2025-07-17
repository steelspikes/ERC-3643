import '@xyrusworx/hardhat-solidity-json';
import '@nomicfoundation/hardhat-toolbox';
import { HardhatUserConfig } from 'hardhat/config';
import '@openzeppelin/hardhat-upgrades';
import 'solidity-coverage';
import '@nomiclabs/hardhat-solhint';
import '@primitivefi/hardhat-dodoc';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  gasReporter: {
    enabled: true,
  },
  dodoc: {
    runOnCompile: false,
    debugMode: true,
    outputDir: "./docgen",
    freshOutput: true,
  },
  networks: {
    sepolia: {
      url: "https://sepolia.infura.io/v3/20c775c8744f44fca476ef196da08681",
      accounts: [`0x12d88b0f111981b2ae76ead7081a5361bf836b0971dc87170778bce4fdf1cff0`], //Admin
      // accounts: [`0x816ced96d6d3efc94a29cfcbe945e747f53c40c0532502009d2d2a6748a44efa`], //Claim Issuer
      timeout: 2000000,           // 200 segundos timeout
    },
    localhost: {
      url: "http://localhost:8545",
      accounts: [`0x12d88b0f111981b2ae76ead7081a5361bf836b0971dc87170778bce4fdf1cff0`], //Admin
      // accounts: [`0x816ced96d6d3efc94a29cfcbe945e747f53c40c0532502009d2d2a6748a44efa`], //Claim Issuer
      timeout: 2000000,           // 200 segundos timeout
    }
  },
};

export default config;
