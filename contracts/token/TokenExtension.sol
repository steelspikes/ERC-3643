// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.17;

import './Token.sol';

contract TokenExtension is Token {
    constructor(
        address _identityRegistry,
        address _compliance,
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        address _onchainID,
        bytes32[] memory defaultPartitions
    ) Token(_identityRegistry, _compliance, _name, _symbol, _decimals, _onchainID) {
        _defaultPartitions = defaultPartitions;
    }

    /**
     * @dev Issue tokens from a specific partition.
     * @param toPartition Name of the partition.
     * @param operator The address performing the issuance.
     * @param to Token recipient.
     * @param value Number of tokens to issue.
     * @param data Information attached to the issuance.
     */
    function _mintByPartition(bytes32 toPartition, address operator, address to, uint256 value, bytes memory data) internal {
        _mint(to, value);
        _addTokenToPartition(to, toPartition, value);
        // emit IssuedByPartition(toPartition, operator, to, value, data, '');
    }

    /**
     * @dev Add a token to a specific partition.
     * @param to Token recipient.
     * @param partition Name of the partition.
     * @param value Number of tokens to transfer.
     */
    function _addTokenToPartition(address to, bytes32 partition, uint256 value) internal {
        if (value != 0) {
            if (_indexOfPartitionsOf[to][partition] == 0) {
                _partitionsOf[to].push(partition);
                _indexOfPartitionsOf[to][partition] = _partitionsOf[to].length;
            }
            // _balanceOfByPartition[to][partition] = _balanceOfByPartition[to][partition].add(value);
            _balanceOfByPartition[to][partition] = _balanceOfByPartition[to][partition] + value;

            if (_indexOfTotalPartitions[partition] == 0) {
                _totalPartitions.push(partition);
                _indexOfTotalPartitions[partition] = _totalPartitions.length;
            }
            // _totalSupplyByPartition[partition] = _totalSupplyByPartition[partition].add(value);
            _totalSupplyByPartition[partition] = _totalSupplyByPartition[partition] + value;
        }
    }

    /**
     * @dev Issue tokens from a specific partition.
     * @param partition Name of the partition.
     * @param _to Address for which we want to issue tokens.
     * @param _amount Number of tokens issued.
     * @param data Information attached to the issuance, by the issuer.
     */
    function mintByPartition(bytes32 partition, address _to, uint256 _amount, bytes calldata data) external onlyAgent {
        // Quitado override
        require(_tokenIdentityRegistry.isVerified(_to), "Identity is not verified.");
        require(_tokenCompliance.canTransfer(address(0), _to, _amount), "Compliance not followed");

        _mintByPartition(partition, msg.sender, _to, _amount, data);
    }

    /************************************** Token Information ***************************************/
    /**
     * @dev Get balance of a tokenholder for a specific partition.
     * @param partition Name of the partition.
     * @param tokenHolder Address for which the balance is returned.
     * @return Amount of token of partition 'partition' held by 'tokenHolder' in the token contract.
     */
    function balanceOfByPartition(bytes32 partition, address tokenHolder) external view returns (uint256) {
        return _balanceOfByPartition[tokenHolder][partition];
    }

    /** Overrided functions form ERC 3643 */

    /**
     *  @dev See {IToken-mint}.
     */
    function mint(address _to, uint256 _amount) public override onlyAgent {
        require(_tokenIdentityRegistry.isVerified(_to), "Identity is not verified.");
        require(_tokenCompliance.canTransfer(address(0), _to, _amount), "Compliance not followed");
        _mintByPartition(_defaultPartitions[0], msg.sender, _to, _amount, "");
        _tokenCompliance.created(_to, _amount);
    }

    /**
     * @dev Transfer token for a specified address.
     * @param _to The address to transfer to.
     * @param _amount The value to be transferred.
     * @return A boolean that indicates if the operation was successful.
     */
    function transfer(address _to, uint256 _amount) public override returns (bool) {
        require(!_frozen[_to] && !_frozen[msg.sender], "wallet is frozen");
        require(_amount <= balanceOf(msg.sender) - (_frozenTokens[msg.sender]), "Insufficient Balance");
        if (_tokenIdentityRegistry.isVerified(_to) && _tokenCompliance.canTransfer(msg.sender, _to, _amount)) {
            _transferByDefaultPartitions(msg.sender, msg.sender, _to, _amount, "");
            _tokenCompliance.transferred(msg.sender, _to, _amount);
            return true;
        }
        revert("Transfer not possible");
    }

    /**
     * @dev Transfer tokens from default partitions.
     * Function used for ERC20 retrocompatibility.
     * @param operator The address performing the transfer.
     * @param from Token holder.
     * @param to Token recipient.
     * @param value Number of tokens to transfer.
     * @param data Information attached to the transfer, and intended for the token holder ('from') [CAN CONTAIN THE DESTINATION PARTITION].
     */
    function _transferByDefaultPartitions(
        address operator,
        address from,
        address to,
        uint256 value,
        bytes memory data
    )
        internal
    {
        require(_defaultPartitions.length != 0, "55"); // // 0x55	funds locked (lockup period)

        uint256 _remainingValue = value;
        uint256 _localBalance;

        for (uint i = 0; i < _defaultPartitions.length; i++) {
        _localBalance = _balanceOfByPartition[from][_defaultPartitions[i]];
        if(_remainingValue <= _localBalance) {
            _transferByPartition(_defaultPartitions[i], operator, from, to, _remainingValue, data, "");
            _remainingValue = 0;
            break;
        } else if (_localBalance != 0) {
            _transferByPartition(_defaultPartitions[i], operator, from, to, _localBalance, data, "");
            _remainingValue = _remainingValue - _localBalance;
        }
        }

        require(_remainingValue == 0, "52"); // 0x52	insufficient balance
    }

    /**
     * @dev Transfer tokens from a specific partition.
     * @param fromPartition Partition of the tokens to transfer.
     * @param operator The address performing the transfer.
     * @param from Token holder.
     * @param to Token recipient.
     * @param value Number of tokens to transfer.
     * @param data Information attached to the transfer. [CAN CONTAIN THE DESTINATION PARTITION]
     * @param operatorData Information attached to the transfer, by the operator (if any).
     * @return Destination partition.
     */
    function _transferByPartition(
        bytes32 fromPartition,
        address operator,
        address from,
        address to,
        uint256 value,
        bytes memory data,
        bytes memory operatorData
    )
        internal
        returns (bytes32)
    {
        require(_balanceOfByPartition[from][fromPartition] >= value, "52"); // 0x52	insufficient balance

        bytes32 toPartition = fromPartition;

        // if(operatorData.length != 0 && data.length >= 64) { // Se ocupa si queremos especificar a que particiones vamos a mandar tokens
        //     toPartition = _getDestinationPartition(fromPartition, data);
        // }

        _removeTokenFromPartition(from, fromPartition, value);
        _transfer(from, to, value);
        _addTokenToPartition(to, toPartition, value);

        // emit TransferByPartition(fromPartition, operator, from, to, value, data, operatorData);

        // if(toPartition != fromPartition) {
        //     emit ChangedPartition(fromPartition, toPartition, value);
        // }

        return toPartition;
    }

    /**
     * @dev Remove a token from a specific partition.
     * @param from Token holder.
     * @param partition Name of the partition.
     * @param value Number of tokens to transfer.
     */
    function _removeTokenFromPartition(address from, bytes32 partition, uint256 value) internal {
        _balanceOfByPartition[from][partition] = _balanceOfByPartition[from][partition] - value; // _balanceOfByPartition[from][partition].sub(value)
        _totalSupplyByPartition[partition] = _totalSupplyByPartition[partition] - value; // _totalSupplyByPartition[partition].sub(value)

        // If the total supply is zero, finds and deletes the partition.
        if(_totalSupplyByPartition[partition] == 0) {
        uint256 index1 = _indexOfTotalPartitions[partition];
        require(index1 > 0, "50"); // 0x50	transfer failure

        // move the last item into the index being vacated
        bytes32 lastValue = _totalPartitions[_totalPartitions.length - 1];
        _totalPartitions[index1 - 1] = lastValue; // adjust for 1-based indexing
        _indexOfTotalPartitions[lastValue] = index1;

        //_totalPartitions.length -= 1;
        _totalPartitions.pop();
        _indexOfTotalPartitions[partition] = 0;
        }

        // If the balance of the TokenHolder's partition is zero, finds and deletes the partition.
        if(_balanceOfByPartition[from][partition] == 0) {
        uint256 index2 = _indexOfPartitionsOf[from][partition];
        require(index2 > 0, "50"); // 0x50	transfer failure

        // move the last item into the index being vacated
        bytes32 lastValue = _partitionsOf[from][_partitionsOf[from].length - 1];
        _partitionsOf[from][index2 - 1] = lastValue;  // adjust for 1-based indexing
        _indexOfPartitionsOf[from][lastValue] = index2;

        //_partitionsOf[from].length -= 1;
        _partitionsOf[from].pop();
        _indexOfPartitionsOf[from][partition] = 0;
        }
    }

    /**
     * @dev Transfer tokens from a specific partition.
     * @param partition Name of the partition.
     * @param to Token recipient.
     * @param value Number of tokens to transfer.
     * @param data Information attached to the transfer, by the token holder.
     * @return Destination partition.
     */
    function transferByPartition(
        bytes32 partition,
        address to,
        uint256 value,
        bytes calldata data
    )
        external
        returns (bytes32)
    {
        return _transferByPartition(partition, msg.sender, msg.sender, to, value, data, "");
    }

    bytes32[] internal _defaultPartitions;

    // List of partitions.
    bytes32[] internal _totalPartitions;

    // Mapping from partition to their index.
    mapping(bytes32 => uint256) internal _indexOfTotalPartitions;

    // Mapping from partition to global balance of corresponding partition.
    mapping(bytes32 => uint256) internal _totalSupplyByPartition;

    // Mapping from tokenHolder to their partitions.
    mapping(address => bytes32[]) internal _partitionsOf;

    // Mapping from (tokenHolder, partition) to their index.
    mapping(address => mapping(bytes32 => uint256)) internal _indexOfPartitionsOf;

    // Mapping from (tokenHolder, partition) to balance of corresponding partition.
    mapping(address => mapping(bytes32 => uint256)) internal _balanceOfByPartition;
}
