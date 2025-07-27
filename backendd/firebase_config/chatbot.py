from google.generativeai import configure, GenerativeModel
from dotenv import load_dotenv
import os


load_dotenv()
configure(api_key=os.getenv("GEMINI_API_KEY"))
model = GenerativeModel("gemini-2.0-flash")

Chat_History = []

