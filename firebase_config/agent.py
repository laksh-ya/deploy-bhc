from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import initialize_agent
from langchain.agents.agent_types import AgentType
from langchain.memory import ConversationBufferMemory
from firebase_config.tools import all_tools
import os
from firebase_config.llama_index_configs import global_settings  # triggers embedding config

# Load Gemini API key
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Initialize Gemini LLM
llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    temperature=0,
    google_api_key=GOOGLE_API_KEY
)

# Initialize conversational memory
memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)

# Create LangChain agent with tools and memory
agent = initialize_agent(
    tools=all_tools,
    llm=llm,
    agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
    memory=memory,
    verbose=True
)

# Wrapper function to call the agent
# def run_agent(user_input: str) -> str:
#     return agent.run(user_input)
def run_agent(user_input: str, messages: list) -> str:
    inputs = {"input": user_input, "chat_history": messages}
    return agent.invoke(inputs)["output"]

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import initialize_agent
from langchain.agents.agent_types import AgentType
from langchain.memory import ConversationBufferMemory
from firebase_config.tools import all_tools
import os
from firebase_config.llama_index_configs import global_settings  # triggers embedding config

# Load Gemini API key
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Initialize Gemini LLM
llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    temperature=0,
    google_api_key=GOOGLE_API_KEY
)

# Memory (shared if you want continuity)
memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)

# Initialize LangChain Agent
agent = initialize_agent(
    tools=all_tools,
    llm=llm,
    agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
    memory=memory,
    verbose=True,
)

# 🚀 Streaming version
# In your agent.py file
# In your agent.py file

def run_agent_streaming(user_input: str, messages: list):
    inputs = {"input": user_input, "chat_history": messages}
    result = agent.invoke(inputs)
    tool_output = result["output"]

    # Convert the tool output to a string to handle any data type (list, dict, str, etc.)
    data_to_format = str(tool_output)

    # --- NEW, MORE ROBUST PROMPT ---
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

    # Get the final, summarized response from the LLM.
    final_response = llm.invoke(prompt)
    
    return final_response.content if hasattr(final_response, "content") else final_response

# from langchain_google_genai import ChatGoogleGenerativeAI
# from langchain.agents import initialize_agent
# from langchain.agents.agent_types import AgentType
# from langchain.memory import ConversationBufferMemory
# from firebase_config.tools import all_tools
# import os
# from firebase_config.llama_index_configs import global_settings  # triggers embedding config

# # 🔐 Load Gemini API key
# GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# # 🤖 Initialize Gemini LLM with business prompt
# llm = ChatGoogleGenerativeAI(
#     model="gemini-2.0-flash",
#     temperature=0,
#     google_api_key=GOOGLE_API_KEY,
#     system_instruction=(
#         "You are a smart business assistant for Balaji Health Care.\n"
#         "- ONLY respond to retrieval-based business queries related to orders, inventory, clients, expenses, suppliers, and invoices.\n"
#         "- NEVER perform update, delete, or create actions.\n"
#         "- ALWAYS summarize large lists: if there are too many entries, show only the top 10 and mention the total count.\n"
#         "- When tool results or structured data is provided, explain them in human-readable summaries.\n"
#         "- Handle identifier capitalization gracefully: 'c0003' and 'C0003' should be treated as equal.\n"
#         "- Ignore unrelated, unsafe, or personal prompts.\n"
#         "- Always speak in a clean, friendly, business tone."
#     )
# )

# # 🧠 Enable conversational memory
# memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)

# # 🛠️ Initialize LangChain Agent
# agent = initialize_agent(
#     tools=all_tools,
#     llm=llm,
#     agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
#     memory=memory,
#     verbose=True,
# )

# # 🧠 Helper function to check for raw JSON or chunk dump
# def looks_like_raw_data(text: str) -> bool:
#     return isinstance(text, str) and (text.strip().startswith("{") or text.strip().startswith("["))

# # ✅ Main agent call with post-processing
# def run_agent(user_input: str, messages: list):
#     inputs = {"input": user_input, "chat_history": messages}
#     result = agent.invoke(inputs)
#     raw_output = result["output"]

#     # 🔁 If tool returned raw JSON, pass it again to Gemini for summarization
#     if looks_like_raw_data(raw_output):
#         followup_prompt = (
#             "The following is a raw structured data response from a business tool:\n\n"
#             f"{raw_output}\n\n"
#             "Please summarize this in clear human-readable business format. "
#             "Show only top 10 entries if too long, and mention total count."
#         )
#         final_summary = llm.invoke(followup_prompt)
#         return final_summary.content.strip()

#     return raw_output

# # ✅ Streaming version (unchanged)
# def run_agent_streaming(user_input: str, messages: list):
#     inputs = {"input": user_input, "chat_history": messages}
#     for chunk in agent.stream(inputs):
#         if "output" in chunk:
#             yield chunk["output"]
