"""
Prompt Library Module for Flare AI DeFAI

This module provides a centralized management system for AI prompts used throughout
the Flare AI DeFAI application. It handles the organization, storage, and retrieval
of various prompt templates used for different operations like token transactions,
account generation, and user interactions.

The module implements a PromptLibrary class that maintains a collection of Prompt
objects, each representing a specific type of interaction or operation template.
Prompts are categorized for easy management and retrieval.

Example:
    ```python
    library = PromptLibrary()
    token_send_prompt = library.get_prompt("token_send")
    account_prompts = library.get_prompts_by_category("account")
    ```
"""

import structlog

from flare_ai_defai.prompts.schemas import (
    Prompt,
    SemanticRouterResponse,
    TokenSendResponse,
    TokenSwapResponse,
    WalletConnectResponse,
)
from flare_ai_defai.prompts.templates import (
    CONNECT_WALLET,
    CONVERSATIONAL,
    GENERATE_ACCOUNT,
    REMOTE_ATTESTATION,
    SEMANTIC_ROUTER,
    TOKEN_SEND,
    TOKEN_SWAP,
    TX_CONFIRMATION,
    WALLET_CONNECTED,
    WALLET_CONNECTION_INSTRUCTIONS,
    WALLET_REQUIRED,
)

logger = structlog.get_logger(__name__)


class PromptLibrary:
    """
    Library for managing and retrieving prompt templates.

    This class provides a centralized repository for all prompt templates used
    in the application. It allows for easy retrieval of prompts by name or category,
    and ensures consistent prompt formatting across the application.

    Attributes:
        prompts (dict[str, Prompt]): Dictionary of prompt templates indexed by name
        logger (BoundLogger): Structured logger for the prompt library
    """

    def __init__(self) -> None:
        """
        Initialize the prompt library with default prompts.

        Creates a new PromptLibrary instance and populates it with a set of
        default prompt templates for various operations.
        """
        self.prompts: dict[str, Prompt] = {}
        self.logger = logger.bind(module="prompt_library")
        self._initialize_default_prompts()

    def get_prompt(self, name: str) -> Prompt:
        """
        Get a prompt template by name.

        Args:
            name: Name of the prompt to retrieve

        Returns:
            Prompt: The requested prompt template

        Raises:
            KeyError: If the prompt name is not found in the library
        """
        if name not in self.prompts:
            msg = f"Prompt '{name}' not found"
            raise KeyError(msg)
        return self.prompts[name]

    def get_prompts_by_category(self, category: str) -> list[Prompt]:
        """
        Get all prompts in a specific category.

        Args:
            category: Category to filter prompts by

        Returns:
            list[Prompt]: List of prompts in the specified category
        """
        return [p for p in self.prompts.values() if p.category == category]

    def _initialize_default_prompts(self) -> None:
        """
        Initialize the library with a set of default prompts.

        Creates and adds the following default prompts:
        - semantic_router: For routing user queries
        - token_send: For token transfer operations
        - token_swap: For token swap operations
        - connect_wallet: For wallet connection
        - conversational: For general user interactions
        - request_attestation: For remote attestation requests
        - tx_confirmation: For transaction confirmation

        This method is called automatically during instance initialization.
        """
        default_prompts = [
            Prompt(
                name="semantic_router",
                description="Route user query based on user input",
                template=SEMANTIC_ROUTER,
                required_inputs=["user_input"],
                response_mime_type="text/x.enum",
                response_schema=SemanticRouterResponse,
                category="router",
            ),
            Prompt(
                name="token_send",
                description="Extract token send parameters from user input",
                template=TOKEN_SEND,
                required_inputs=["user_input"],
                response_mime_type="application/json",
                response_schema=TokenSendResponse,
                category="defai",
            ),
            Prompt(
                name="token_swap",
                description="Extract token swap parameters from user input",
                template=TOKEN_SWAP,
                required_inputs=["user_input"],
                response_schema=TokenSwapResponse,
                response_mime_type="application/json",
                category="defai",
            ),
            Prompt(
                name="connect_wallet",
                description="Extract wallet address from user input",
                template=CONNECT_WALLET,
                required_inputs=["user_input"],
                response_schema=WalletConnectResponse,
                response_mime_type="application/json",
                category="wallet",
            ),
            Prompt(
                name="wallet_connected",
                description="Generate response for successful wallet connection",
                template=WALLET_CONNECTED,
                required_inputs=["address"],
                response_schema=None,
                response_mime_type="text/plain",
                category="wallet",
            ),
            Prompt(
                name="wallet_connection_instructions",
                description="Generate instructions for connecting a wallet",
                template=WALLET_CONNECTION_INSTRUCTIONS,
                required_inputs=[],
                response_schema=None,
                response_mime_type="text/plain",
                category="wallet",
            ),
            Prompt(
                name="wallet_required",
                description="Generate message explaining wallet requirement",
                template=WALLET_REQUIRED,
                required_inputs=[],
                response_schema=None,
                response_mime_type="text/plain",
                category="wallet",
            ),
            Prompt(
                name="generate_account",
                description="Generate response for account creation",
                template=GENERATE_ACCOUNT,
                required_inputs=["address"],
                response_schema=None,
                response_mime_type="text/plain",
                category="account",
            ),
            Prompt(
                name="request_attestation",
                description="Generate attestation request",
                template=REMOTE_ATTESTATION,
                required_inputs=[],
                response_schema=None,
                response_mime_type="text/plain",
                category="attestation",
            ),
            Prompt(
                name="tx_confirmation",
                description="Generate transaction confirmation",
                template=TX_CONFIRMATION,
                required_inputs=["tx_hash", "block_explorer"],
                response_schema=None,
                response_mime_type="text/plain",
                category="defai",
            ),
            Prompt(
                name="follow_up_token_send",
                description="Generate follow-up for token send",
                template=(
                    "I need more information to process your token transfer. "
                    "Please specify the recipient address and the amount you want to send."
                ),
                required_inputs=[],
                response_schema=None,
                response_mime_type="text/plain",
                category="defai",
            ),
            Prompt(
                name="conversational",
                description="Generate conversational response",
                template=CONVERSATIONAL,
                required_inputs=["user_input"],
                response_schema=None,
                response_mime_type="text/plain",
                category="conversation",
            ),
        ]

        for prompt in default_prompts:
            self.prompts[prompt.name] = prompt
            self.logger.debug("added_prompt", name=prompt.name, category=prompt.category)

    def add_prompt(self, prompt: Prompt) -> None:
        """
        Add a new prompt to the library.

        Args:
            prompt (Prompt): The prompt object to add to the library.

        Logs:
            Debug log entry when prompt is successfully added.

        Example:
            ```python
            custom_prompt = Prompt(name="custom", template="...", category="misc")
            library.add_prompt(custom_prompt)
            ```
        """
        self.prompts[prompt.name] = prompt
        logger.debug("prompt_added", name=prompt.name, category=prompt.category)

    def list_categories(self) -> list[str]:
        """
        List all available prompt categories.

        Returns:
            list[str]: A list of unique category names used in the library.

        Example:
            ```python
            categories = library.list_categories()
            print("Available categories:", categories)
            ```
        """
        return list(
            {prompt.category for prompt in self.prompts.values() if prompt.category is not None}
        )
