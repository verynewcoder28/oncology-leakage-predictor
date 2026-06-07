import os
import io
import pandas as pd
import requests
from dotenv import load_dotenv

load_dotenv()

api_key = os.environ["DATAROBOT_API_KEY"]

#URL = "https://app.datarobot.com/api/v2/deployments/6a247cf27e20a7c354ac5475/predictions"
URL = "https://app.datarobot.com/api/v2/deployments/6a250f0a89ec1ac9379b97f8/predictions"
HEADERS = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "text/csv; charset=UTF-8",
    "Accept": "text/csv",
}

df = pd.read_csv("scoring_data.csv")

SELECTED = [
    (157, "HIGH RISK PROFILE"),
    (16,  "MEDIUM RISK PROFILE"),
    (110, "LOW RISK PROFILE"),
]

high_risk_count = 0

for i, (row_idx, profile_label) in enumerate(SELECTED, start=1):
    row = df.iloc[row_idx]
    row_csv = row.to_frame().T.to_csv(index=False)
    response = requests.post(URL, headers=HEADERS, data=row_csv.encode("utf-8"))
    response.raise_for_status()

    result = pd.read_csv(io.StringIO(response.text))
    probability = result["missed_pathway_milestone_1_PREDICTION"].iloc[0]
    risk_label = "High Risk" if probability > 0.3 else "Low Risk"

    if probability > 0.3:
        high_risk_count += 1

    print(f"{'─' * 50}")
    print(f"Prediction {i} of 3  ·  {profile_label}")
    print(f"{'─' * 50}")
    print(f"  Patient ID          : {row['patient_id']}")
    print(f"  Leakage Probability : {probability * 100:.1f}%")
    print(f"  Risk Classification : {risk_label}")
    print(f"  ── Key Features ──────────────────────────────")
    print(f"  Previous No-Shows   : {int(row['previous_noshow_count'])}")
    print(f"  Insurance Auth      : {'Yes' if int(row['has_active_insurance_authorisation']) == 1 else 'No'}")
    print(f"  Distance (km)       : {row['distance_from_hospital_km']}")
    print(f"  Cancer Type         : {row['cancer_type']}")
    print(f"  ECOG Status         : {int(row['ecog_performance_status'])}")
    print()

print(f"{'═' * 50}")
print(f"Summary: {high_risk_count} of 3 patients flagged High Risk")
print(f"{'═' * 50}")
