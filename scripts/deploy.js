// npx hardhat --network arbitrum_sepolia run scripts/deploy.js
const OnchainID = require('@onchain-id/solidity');

let totalCost = ethers.BigNumber.from(0);

log = (...params) => {
    console.log(`${params[0]}: "${params[1]}",`)
}

async function deployIdentityProxy(implementationAuthority, managementKey, signer) {
  const identity = await new ethers.ContractFactory(OnchainID.contracts.IdentityProxy.abi, OnchainID.contracts.IdentityProxy.bytecode, signer).deploy(
    implementationAuthority,
    managementKey,
  );

  await identity.deployed()

  return ethers.getContractAt('Identity', identity.address, signer);
}

async function deployContract(name, params) {
    const MyContract = await ethers.getContractFactory(name);
    const proxy = await upgrades.deployProxy(MyContract, params, {
        unsafeAllow: ['delegatecall'],
        initializer: 'init'
    });
    await proxy.deployed();
    const tx = await proxy.deployTransaction.wait();
    const cost = tx.gasUsed.mul(tx.effectiveGasPrice);
    totalCost = totalCost.add(cost);

    log(`${name} (Proxy) deployed at: ${proxy.address}`);
    log(`--> Deployment cost: ${ethers.utils.formatEther(cost)} ETH\n`);
    return proxy.address;
}

async function deployContractNoProxy(name, params = []) {
    const [deployer, claimIssuer, tokenIssuer] = await ethers.getSigners();

    const MyContract = await ethers.getContractFactory(name, deployer);
    const contract = await MyContract.deploy(...params);
    await contract.deployed();
    const tx = await contract.deployTransaction.wait();
    const cost = tx.gasUsed.mul(tx.effectiveGasPrice);
    totalCost = totalCost.add(cost);
    // log(`--> Deployment cost: ${ethers.utils.formatEther(cost)} ETH\n`);
    return contract.address;
}

async function main() {
    // const DeployERC3643 = await deployContractNoProxy("DeployerContract");
    // const DeployERC3643Deployed = await ethers.getContractAt("DeployerContract", DeployERC3643);
    // const tx2 = await DeployERC3643Deployed.deployAll();
    // const res = await DeployERC3643Deployed.getContracts();
    // console.log(res)

    const [deployer, claimIssuer, tokenIssuer] = await ethers.getSigners();

    const TrustedIssuersRegistry = await deployContractNoProxy("TrustedIssuersRegistry");
    log("TrustedIssuersRegistry", TrustedIssuersRegistry);

    const ClaimTopicsRegistry = await deployContractNoProxy("ClaimTopicsRegistry");
    log("ClaimTopicsRegistry", ClaimTopicsRegistry);

    const IdentityRegistryStorage = await deployContractNoProxy("IdentityRegistryStorage");
    log("IdentityRegistryStorage", IdentityRegistryStorage);

    const IdentityRegistryContract = await deployContractNoProxy("IdentityRegistry", [
        TrustedIssuersRegistry,
        ClaimTopicsRegistry,
        IdentityRegistryStorage
    ]);

    log("IdentityRegistryContract", IdentityRegistryContract);

    const ModularCompliance = await deployContractNoProxy("ModularCompliance");
    log("ModularCompliance", ModularCompliance);

    const identityImplementation = await new ethers.ContractFactory(
        OnchainID.contracts.Identity.abi,
        OnchainID.contracts.Identity.bytecode,
        deployer,
      ).deploy(deployer.address, true);

    await identityImplementation.deployed();
    
    const identityImplementationAuthority = await new ethers.ContractFactory(
        OnchainID.contracts.ImplementationAuthority.abi,
        OnchainID.contracts.ImplementationAuthority.bytecode,
        deployer,
    ).deploy(identityImplementation.address);

    await identityImplementationAuthority.deployed();

    // console.log(identityImplementationAuthority.address, tokenIssuer.address)

    const tokenOID = await deployIdentityProxy(identityImplementationAuthority.address, tokenIssuer.address, deployer);
    
    const TokenContract = await deployContractNoProxy("Token", [
        IdentityRegistryContract,
        ModularCompliance,
        "Sample FUCK ERC3643 Token",
        "FUCK",
        "2",
        tokenOID.address,
        // [
        //     "0x7265736572766564000000000000000000000000000000000000000000000000",
        //     "0x6973737565640000000000000000000000000000000000000000000000000000",
        //     "0x6c6f636b65640000000000000000000000000000000000000000000000000000"
        // ]
    ]);

    log("Token", TokenContract);

    // Hay que llamar bindIdentityRegistry para que funcione el storage
    const IdentityRegistryStorageDeployed = await ethers.getContractAt("IdentityRegistryStorage", IdentityRegistryStorage);
    const tx = await IdentityRegistryStorageDeployed.bindIdentityRegistry(IdentityRegistryContract);
    await tx.wait();

    /*const ClaimIssuer = await deployContractNoProxy("ClaimIssuer", [
        await claimIssuer.getAddress()
    ]);
    log("ClaimIssuer", ClaimIssuer);*/

    log('IdentityImplementation', identityImplementation.address);
    log('IdentityImplementationAuthority', identityImplementationAuthority.address)
    // log('TokenOID', tokenOID.address);

    /*const claimTopics = [ethers.utils.id('1')];

    const TrustedIssuersRegistryDeployed = await ethers.getContractAt("TrustedIssuersRegistry", TrustedIssuersRegistry);
    const tx2 = await TrustedIssuersRegistryDeployed.addTrustedIssuer(ClaimIssuer, claimTopics);
    await tx2.wait();*/

    log("Total cost", ethers.utils.formatEther(totalCost));
}

// async function main2() {
//     const [deployer] = await ethers.getSigners();

//     const claimTopicsRegistryImplementation = await ethers.deployContract('ClaimTopicsRegistry');
//     const trustedIssuersRegistryImplementation = await ethers.deployContract('TrustedIssuersRegistry');
//     const identityRegistryStorageImplementation = await ethers.deployContract('IdentityRegistryStorage');
//     const identityRegistryImplementation = await ethers.deployContract('IdentityRegistry');
//     const modularComplianceImplementation = await ethers.deployContract('ModularCompliance');
//     const tokenImplementation = await ethers.deployContract('Token');

//     const identityImplementation = await new ethers.ContractFactory(
//         OnchainID.contracts.Identity.abi,
//         OnchainID.contracts.Identity.bytecode,
//         deployer,
//     ).deploy(deployer.address, true);

//     const identityImplementationAuthority = await new ethers.ContractFactory(
//         OnchainID.contracts.ImplementationAuthority.abi,
//         OnchainID.contracts.ImplementationAuthority.bytecode,
//         deployer,
//     ).deploy(identityImplementation.address);

//     const identityFactory = await new ethers.ContractFactory(OnchainID.contracts.Factory.abi, OnchainID.contracts.Factory.bytecode, deployer).deploy(
//         identityImplementationAuthority.address,
//     );

//     const trexImplementationAuthority = await ethers.deployContract(
//         'TREXImplementationAuthority',
//         [true, ethers.constants.AddressZero, ethers.constants.AddressZero],
//         deployer,
//     );
//     const versionStruct = {
//         major: 4,
//         minor: 0,
//         patch: 0,
//     };

//     const contractsStruct = {
//         tokenImplementation: tokenImplementation.address,
//         ctrImplementation: claimTopicsRegistryImplementation.address,
//         irImplementation: identityRegistryImplementation.address,
//         irsImplementation: identityRegistryStorageImplementation.address,
//         tirImplementation: trustedIssuersRegistryImplementation.address,
//         mcImplementation: modularComplianceImplementation.address,
//     };

//     await trexImplementationAuthority.connect(deployer).addAndUseTREXVersion(versionStruct, contractsStruct);

//     const trexFactory = await ethers.deployContract('TREXFactory', [trexImplementationAuthority.address, identityFactory.address], deployer);
//     await identityFactory.connect(deployer).addTokenFactory(trexFactory.address);

//     const claimTopicsRegistry = await ethers
//         .deployContract('ClaimTopicsRegistryProxy', [trexImplementationAuthority.address], deployer)
//         .then(async (proxy) => ethers.getContractAt('ClaimTopicsRegistry', proxy.address));

//     const trustedIssuersRegistry = await ethers
//         .deployContract('TrustedIssuersRegistryProxy', [trexImplementationAuthority.address], deployer)
//         .then(async (proxy) => ethers.getContractAt('TrustedIssuersRegistry', proxy.address));

//     const identityRegistryStorage = await ethers
//         .deployContract('IdentityRegistryStorageProxy', [trexImplementationAuthority.address], deployer)
//         .then(async (proxy) => ethers.getContractAt('IdentityRegistryStorage', proxy.address));

//     const defaultCompliance = await ethers.deployContract('DefaultCompliance', deployer);

//     const identityRegistry = await ethers
//         .deployContract(
//             'IdentityRegistryProxy',
//             [trexImplementationAuthority.address, trustedIssuersRegistry.address, claimTopicsRegistry.address, identityRegistryStorage.address],
//             deployer,
//         )
//         .then(async (proxy) => ethers.getContractAt('IdentityRegistry', proxy.address));

//     //   const tokenOID = await deployIdentityProxy(identityImplementationAuthority.address, tokenIssuer.address, deployer);
//     const tokenName = 'TREXDINO';
//     const tokenSymbol = 'TREX';
//     const tokenDecimals = 0;
//     const token = await ethers
//         .deployContract(
//             'TokenProxy',
//             [
//                 trexImplementationAuthority.address,
//                 identityRegistry.address,
//                 defaultCompliance.address,
//                 tokenName,
//                 tokenSymbol,
//                 tokenDecimals,
//                 // tokenOID.address,
//                 '0x0000000000000000000000000000000000000000'
//             ],
//             deployer,
//         )
//         .then(async (proxy) => ethers.getContractAt('Token', proxy.address));

//     // await identityRegistryStorage.connect(deployer).bindIdentityRegistry(identityRegistry.address);
//     log(token.address)
// }

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })