import pandas as pd

df = pd.read_csv("scoring_data.csv")

# Score each row by how many high-risk criteria it meets, weighted by strength
df["_risk_score"] = (
    (df["previous_noshow_count"] > 5).astype(int) * 3   # strongest predictor
    + (df["has_active_insurance_authorisation"] == 0).astype(int) * 2
    + (df["distance_from_hospital_km"] > 30).astype(int) * 1
)

# Break ties by raw noshow count descending, then distance descending
top10 = (
    df.sort_values(
        ["_risk_score", "previous_noshow_count", "distance_from_hospital_km"],
        ascending=[False, False, False]
    )
    .head(10)
)

print(f"{'Rank':<5} {'Row Index':<10} {'Patient ID':<14} {'No-Shows':<10} "
      f"{'Ins Auth':<10} {'Distance km':<13} {'Risk Score'}")
print("─" * 75)
for rank, (idx, row) in enumerate(top10.iterrows(), start=1):
    print(f"{rank:<5} {idx:<10} {row['patient_id']:<14} "
          f"{int(row['previous_noshow_count']):<10} "
          f"{int(row['has_active_insurance_authorisation']):<10} "
          f"{row['distance_from_hospital_km']:<13} "
          f"{int(row['_risk_score'])}")
