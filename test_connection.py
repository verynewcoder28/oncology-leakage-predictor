import os
import pandas as pd
import requests
from dotenv import load_dotenv

load_dotenv()

api_key = os.environ["DATAROBOT_API_KEY"]

df = pd.read_csv("scoring_data.csv")
first_row_csv = df.head(1).to_csv(index=False)

url = "https://app.datarobot.com/api/v2/deployments/6a247cf27e20a7c354ac5475/predictions"
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "text/csv; charset=UTF-8",
    "Accept": "text/csv",
}

response = requests.post(url, headers=headers, data=first_row_csv.encode("utf-8"))

print(f"Status code: {response.status_code}")
print(f"Response text:\n{response.text}")
