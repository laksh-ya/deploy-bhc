"""
agent.py — LangChain conversational agent for the BHC AI assistant
==================================================================

This wires together three pieces:

1. The LLM  — Google Gemini (``gemini-2.0-flash``) via ``langchain-google-genai``.
2. The tools — every database tool defined in ``firebase_config/tools.py``
   (CRUD helpers + semantic search over the Qdrant vector store).
3. Memory   — a conversation buffer so the agent keeps context across turns.

The agent uses the ZERO_SHOT_REACT_DESCRIPTION strategy: on each query it reasons
about which tool to call, calls it, then we run a second "presentation" pass that
turns the raw tool output into a clean, user-facing answer.

Public surface:
    run_agent(user_input, messages)            -> str   (single, non-streaming reply)
    run_agent_streaming(user_input, messages)  -> str   (used by POST /api/v1/chat)
"""

import os

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import initialize_agent
from langchain.agents.agent_types import AgentType
from langchain.memory import ConversationBufferMemory

from firebase_config.tools import all_tools
from firebase_config.llama_index_configs import global_settings  # noqa: F401  (triggers embedding config)

# ---------------------------------------------------------------------------
# LLM, memory, and agent are initialised once at import time and reused.
# ---------------------------------------------------------------------------
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    temperature=0,
    google_api_key=GOOGLE_API_KEY,
)

memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)

agent = initialize_agent(
    tools=all_tools,
    llm=llm,
    agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
    memory=memory,
    verbose=True,
)


def run_agent(user_input: str, messages: list) -> str:
    """Run the agent and return its raw final answer (non-streaming)."""
    inputs = {"input": user_input, "chat_history": messages}
    return agent.invoke(inputs)["output"]


def run_agent_streaming(user_input: str, messages: list):
    """Run the agent, then reformat its output into a polished, user-facing reply.

    The agent first decides which tool to call and produces raw structured data.
    We then send that raw data through a second Gemini pass with a strict
    presentation prompt so the end user only ever sees clean, summarised prose.
    """
    inputs = {"input": user_input, "chat_history": messages}
    result = agent.invoke(inputs)
    tool_output = result["output"]

    # Stringify so any return type (list, dict, str) can be summarised.
    data_to_format = str(tool_output)

    prompt = f"""
## ROLE AND GOAL
You are 'Balaji AI', an expert business analyst and assistant for Balaji Health Care, a medical equipment business. Your primary goal is to convert raw, structured data from internal software tools into clear, professional, and actionable insights for the user. You must be concise, accurate, and helpful.

## CONTEXT
The user, an employee, has asked a question. A software tool has returned the following raw data to answer it. The user should never see the raw data, only your final, well-formatted response.

## TASK
Analyze the raw data below. Synthesize the key information and present it as a helpful, natural language answer that directly addresses the user's original query (which you haven't seen).



## FORMATTING RULES
- Use markdown for structure (e.g., lists with `*`, bolding with `**`).
- **For lists, ALWAYS put a space after the asterisk (e.g., `* List item`).**
- **Use double newlines (`\n\n`) to create separate paragraphs for better spacing.**
- Use bold (`**`) selectively for emphasis on **final summary totals**, **main entity names**, and final **status words**.
- Do **not** bold every single number, ID, or label.


## IMPORTANT RULES TO FOLLOW
- **If the data is empty or shows no results (e.g., `[]`, `{{}}`, `None`):** Respond with a friendly, clear message like, "I couldn't find any records matching your request."
- **If the data is a simple confirmation message (e.g., 'Task completed successfully'):** Relay it professionally, for example: "The task has been completed successfully."
- **If the data is clearly an error message:** Translate it into a user-friendly message. For example, if the data is `'Error: Client not found'`, respond with "I'm sorry, I couldn't find a client with that information. Please double-check the details and try again."
- **NEVER** just repeat the raw data. Your job is to interpret and summarize it.
- **NEVER** invent information. If a detail isn't in the provided data, you don't know it.

## RAW DATA FROM TOOL:
---
{data_to_format}
---
"""

    final_response = llm.invoke(prompt)
    return final_response.content if hasattr(final_response, "content") else final_response
