import logging
from logging.handlers import RotatingFileHandler
import os

LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)

loggerr = logging.getLogger("business_logger")
loggerr.setLevel(logging.INFO)

handler = RotatingFileHandler(
    filename=os.path.join(LOG_DIR, "all_logs.log"),
    maxBytes=1 * 1024 * 1024,  # 1MB
    backupCount=5
)
formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
handler.setFormatter(formatter)

loggerr.addHandler(handler)
