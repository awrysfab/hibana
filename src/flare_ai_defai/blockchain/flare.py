"""
Flare Network Provider Module

This module provides a FlareProvider class for interacting with the Flare Network.
It handles wallet connection, transaction queuing, and blockchain interactions.
"""

from dataclasses import dataclass

import structlog
from eth_typing import ChecksumAddress
from web3 import Web3
from web3.middleware import geth_poa_middleware
from web3.types import TxParams


@dataclass
class TxQueueElement:
    """
    Represents a transaction in the queue with its associated message.

    Attributes:
        msg (str): Description or context of the transaction
        tx (TxParams): Transaction parameters
    """

    msg: str
    tx: TxParams


logger = structlog.get_logger(__name__)


class FlareProvider:
    """
    Manages interactions with the Flare Network including wallet
    operations and transactions.

    Attributes:
        address (ChecksumAddress | None): The connected wallet's checksum address
        tx_queue (list[TxQueueElement]): Queue of pending transactions
        w3 (Web3): Web3 instance for blockchain interactions
        logger (BoundLogger): Structured logger for the provider
    """

    def __init__(self, web3_provider_url: str) -> None:
        """
        Initialize the Flare Provider.

        Args:
            web3_provider_url (str): URL of the Web3 provider endpoint
        """
        self.address: ChecksumAddress | None = None
        self.tx_queue: list[TxQueueElement] = []
        self.w3 = Web3(Web3.HTTPProvider(web3_provider_url))

        # Add POA middleware for Flare network if available
        if geth_poa_middleware:
            self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)

        self.logger = logger.bind(router="flare_provider")

    def reset(self) -> None:
        """
        Reset the provider state by clearing wallet connection and transaction queue.
        """
        self.address = None
        self.tx_queue = []
        self.logger.debug("reset", address=self.address, tx_queue=self.tx_queue)

    def add_tx_to_queue(self, msg: str, tx: TxParams) -> None:
        """
        Add a transaction to the queue with an associated message.

        Args:
            msg (str): Description of the transaction
            tx (TxParams): Transaction parameters
        """
        tx_queue_element = TxQueueElement(msg=msg, tx=tx)
        self.tx_queue.append(tx_queue_element)
        self.logger.debug("add_tx_to_queue", tx_queue=self.tx_queue)

    def send_tx_in_queue(self) -> str:
        """
        Send the most recent transaction in the queue.

        For wallet extensions, this method returns the transaction data that should be
        sent to the wallet extension for signing and sending.

        Returns:
            str: Transaction hash or transaction data for wallet extension

        Raises:
            ValueError: If no transaction is found in the queue
        """
        if self.tx_queue:
            tx_data = self.tx_queue[-1].tx

            # For wallet extensions, we need to return the transaction data
            # The actual transaction will be signed and sent by the wallet extension
            # in the frontend

            # Format transaction for display - include hex value to preserve precision
            to_address = tx_data["to"]
            value_wei = tx_data["value"]
            value_hex = hex(value_wei)

            tx_hash = f"tx_data:{to_address}:{value_hex}:{value_wei}"
            self.logger.debug("prepared_tx_data", tx_data=tx_data)

            # Remove the transaction from the queue
            self.tx_queue.pop()

            return tx_hash
        msg = "Unable to find confirmed tx"
        raise ValueError(msg)

    def connect_wallet(self, wallet_address: str) -> ChecksumAddress:
        """
        Connect to a wallet using its address.

        Args:
            wallet_address (str): The wallet address to connect to

        Returns:
            ChecksumAddress: The checksum address of the connected wallet
        """
        self.address = self.w3.to_checksum_address(wallet_address)
        self.logger.debug("connect_wallet", address=self.address)
        return self.address

    def check_balance(self) -> float:
        """
        Check the balance of the current wallet.

        Returns:
            float: Wallet balance in FLR

        Raises:
            ValueError: If wallet is not connected
        """
        if not self.address:
            msg = "Wallet not connected"
            raise ValueError(msg)
        balance_wei = self.w3.eth.get_balance(self.address)
        self.logger.debug("check_balance", balance_wei=balance_wei)
        return float(self.w3.from_wei(balance_wei, "ether"))

    def create_send_flr_tx(self, to_address: str, amount: float) -> TxParams:
        """
        Create a transaction to send FLR tokens.

        Args:
            to_address (str): Recipient address
            amount (float): Amount of FLR to send

        Returns:
            TxParams: Transaction parameters for sending FLR

        Raises:
            ValueError: If wallet is not connected
        """
        if not self.address:
            msg = "Wallet not connected"
            raise ValueError(msg)
        tx: TxParams = {
            "from": self.address,
            "nonce": self.w3.eth.get_transaction_count(self.address),
            "to": self.w3.to_checksum_address(to_address),
            "value": self.w3.to_wei(amount, unit="ether"),
            "gas": 21000,
            "maxFeePerGas": self.w3.eth.gas_price,
            "maxPriorityFeePerGas": self.w3.eth.max_priority_fee,
            "chainId": self.w3.eth.chain_id,
            "type": 2,
        }
        return tx
