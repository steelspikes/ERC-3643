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
      // accounts: [`0x12d88b0f111981b2ae76ead7081a5361bf836b0971dc87170778bce4fdf1cff0`, '0x816ced96d6d3efc94a29cfcbe945e747f53c40c0532502009d2d2a6748a44efa', '6b6be707ec26f37e87c94b98aff0e69f32da9292872a7b86305bed3b15e913e5'], //Admin / Claim / Token issuer
      // accounts: [`0x816ced96d6d3efc94a29cfcbe945e747f53c40c0532502009d2d2a6748a44efa`], //Claim Issuer
      accounts: ['0x9c3195e840fb9f0e9c8249c34a1630863b34ade1c176727c196551dfd93604c8', '0xf6a28cdbbc56f562495fe2ac2060e53049a0dc983036d3516e92371b4230ab0f', '0xc85f42d0ec6f38552cc3809cf3de971603779ebddde1c0fec44ba7985054a937'],
      timeout: 2000000,           // 200 segundos timeout
    },
    localhost: {
      url: "http://localhost:8545",
      accounts: [`79ce924a93f7e952973dd08b21481d5a0b263576ec939ff39986bb1c97dae440`, '6768a56cc9191ae232bfbb4b83b4bce65b0ccc3c84dd60db9d78ef927ca772b7', 'ca2a026aff810885e8121821f6ecf047b891b18a9f77efe43d3dd0aabc017b9e'], //Admin / Claim / Token issuer
      // accounts: [`0x816ced96d6d3efc94a29cfcbe945e747f53c40c0532502009d2d2a6748a44efa`], //Claim Issuer
      // accounts: ['0x9c3195e840fb9f0e9c8249c34a1630863b34ade1c176727c196551dfd93604c8', '0xf6a28cdbbc56f562495fe2ac2060e53049a0dc983036d3516e92371b4230ab0f', '0xc85f42d0ec6f38552cc3809cf3de971603779ebddde1c0fec44ba7985054a937'],
      timeout: 2000000,           // 200 segundos timeout
      gas: 6000000,
        gasPrice: 20000000000 // 20 gwei en wei
    }
  },
};

export default config;
