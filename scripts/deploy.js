// npx hardhat --network arbitrum_sepolia run scripts/deploy.js
const OnchainID = require('@onchain-id/solidity');

let totalCost = ethers.BigNumber.from(0);

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

    console.log(`${name} (Proxy) deployed at: ${proxy.address}`);
    console.log(`--> Deployment cost: ${ethers.utils.formatEther(cost)} ETH\n`);
    return proxy.address;
}

async function deployContractNoProxy(name, params) {
    const MyContract = await ethers.getContractFactory(name);
    const contract = await MyContract.deploy(...params);
    await contract.deployed();
    return contract.address;
}

async function main() {
    const TrustedIssuersRegistry = await deployContract("TrustedIssuersRegistry");
    console.log("TrustedIssuersRegistry", TrustedIssuersRegistry);

    const ClaimTopicsRegistry = await deployContract("ClaimTopicsRegistry");
    console.log("ClaimTopicsRegistry", ClaimTopicsRegistry);

    const IdentityRegistryStorage = await deployContract("IdentityRegistryStorage");
    console.log("IdentityRegistryStorage", IdentityRegistryStorage);

    const IdentityRegistryContract = await deployContract("IdentityRegistry", [
        TrustedIssuersRegistry,
        ClaimTopicsRegistry,
        IdentityRegistryStorage
    ]);

    console.log("IdentityRegistryContract", IdentityRegistryContract);

    const ModularCompliance = await deployContract("ModularCompliance");
    console.log("ModularCompliance", ModularCompliance);

    const TokenContract = await deployContract("Token", [
        IdentityRegistryContract,
        ModularCompliance,
        "Sample FUCK ERC3643 Token",
        "FUCK",
        "2",
        "0x0000000000000000000000000000000000000000"
    ]);

    console.log("Final contract Token", TokenContract);
    console.log("Total cost", ethers.utils.formatEther(totalCost));

    // Hay que llamar bindIdentityRegistry para que funcione el storage
    // const IdentityRegistryStorageDeployed = await ethers.getContractAt("IdentityRegistryStorage", "0x07449267683c7EE4b8C520101D399977BbC7c13E");
    // const tx = await IdentityRegistryStorageDeployed.bindIdentityRegistry("0x7bf5289a3Dd60a10f321F145DECf766e03Cb9139");
    // await tx.wait();

    // const [signer] = await ethers.getSigners();
    // const ClaimIssuer = await deployContractNoProxy("ClaimIssuer", [
    //     await signer.getAddress()
    // ]);
    // console.log("ClaimIssuer", ClaimIssuer);
}

async function main2() {
    const [deployer] = await ethers.getSigners();

    const claimTopicsRegistryImplementation = await ethers.deployContract('ClaimTopicsRegistry');
    const trustedIssuersRegistryImplementation = await ethers.deployContract('TrustedIssuersRegistry');
    const identityRegistryStorageImplementation = await ethers.deployContract('IdentityRegistryStorage');
    const identityRegistryImplementation = await ethers.deployContract('IdentityRegistry');
    const modularComplianceImplementation = await ethers.deployContract('ModularCompliance');
    const tokenImplementation = await ethers.deployContract('Token');

    const identityImplementation = await new ethers.ContractFactory(
        OnchainID.contracts.Identity.abi,
        OnchainID.contracts.Identity.bytecode,
        deployer,
    ).deploy(deployer.address, true);

    const identityImplementationAuthority = await new ethers.ContractFactory(
        OnchainID.contracts.ImplementationAuthority.abi,
        OnchainID.contracts.ImplementationAuthority.bytecode,
        deployer,
    ).deploy(identityImplementation.address);

    const identityFactory = await new ethers.ContractFactory(OnchainID.contracts.Factory.abi, OnchainID.contracts.Factory.bytecode, deployer).deploy(
        identityImplementationAuthority.address,
    );

    const trexImplementationAuthority = await ethers.deployContract(
        'TREXImplementationAuthority',
        [true, ethers.constants.AddressZero, ethers.constants.AddressZero],
        deployer,
    );
    const versionStruct = {
        major: 4,
        minor: 0,
        patch: 0,
    };

    const contractsStruct = {
        tokenImplementation: tokenImplementation.address,
        ctrImplementation: claimTopicsRegistryImplementation.address,
        irImplementation: identityRegistryImplementation.address,
        irsImplementation: identityRegistryStorageImplementation.address,
        tirImplementation: trustedIssuersRegistryImplementation.address,
        mcImplementation: modularComplianceImplementation.address,
    };

    await trexImplementationAuthority.connect(deployer).addAndUseTREXVersion(versionStruct, contractsStruct);

    const trexFactory = await ethers.deployContract('TREXFactory', [trexImplementationAuthority.address, identityFactory.address], deployer);
    await identityFactory.connect(deployer).addTokenFactory(trexFactory.address);

    const claimTopicsRegistry = await ethers
        .deployContract('ClaimTopicsRegistryProxy', [trexImplementationAuthority.address], deployer)
        .then(async (proxy) => ethers.getContractAt('ClaimTopicsRegistry', proxy.address));

    const trustedIssuersRegistry = await ethers
        .deployContract('TrustedIssuersRegistryProxy', [trexImplementationAuthority.address], deployer)
        .then(async (proxy) => ethers.getContractAt('TrustedIssuersRegistry', proxy.address));

    const identityRegistryStorage = await ethers
        .deployContract('IdentityRegistryStorageProxy', [trexImplementationAuthority.address], deployer)
        .then(async (proxy) => ethers.getContractAt('IdentityRegistryStorage', proxy.address));

    const defaultCompliance = await ethers.deployContract('DefaultCompliance', deployer);

    const identityRegistry = await ethers
        .deployContract(
            'IdentityRegistryProxy',
            [trexImplementationAuthority.address, trustedIssuersRegistry.address, claimTopicsRegistry.address, identityRegistryStorage.address],
            deployer,
        )
        .then(async (proxy) => ethers.getContractAt('IdentityRegistry', proxy.address));

    //   const tokenOID = await deployIdentityProxy(identityImplementationAuthority.address, tokenIssuer.address, deployer);
    const tokenName = 'TREXDINO';
    const tokenSymbol = 'TREX';
    const tokenDecimals = 0;
    const token = await ethers
        .deployContract(
            'TokenProxy',
            [
                trexImplementationAuthority.address,
                identityRegistry.address,
                defaultCompliance.address,
                tokenName,
                tokenSymbol,
                tokenDecimals,
                // tokenOID.address,
                '0x0000000000000000000000000000000000000000'
            ],
            deployer,
        )
        .then(async (proxy) => ethers.getContractAt('Token', proxy.address));

    // await identityRegistryStorage.connect(deployer).bindIdentityRegistry(identityRegistry.address);
    console.log(token.address)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })