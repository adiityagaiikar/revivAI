import pandas as pd
import numpy as np

print("Stitching real CDC NHANES data tables together...")

# 1. Load demographic and examination data matching by unique Patient ID (SEQN)
demo_df = pd.read_csv("demographic.csv", usecols=['SEQN', 'RIDAGEYR'])
exam_df = pd.read_csv("examination.csv", usecols=['SEQN', 'BMXWT'])

# 2. Merge tables
merged_df = pd.merge(demo_df, exam_df, on='SEQN', how='inner').dropna()

# 3. Standardize column names
merged_df = merged_df.rename(columns={
    'RIDAGEYR': 'age',
    'BMXWT': 'weight'
})
print(f"Loaded {len(merged_df)} real patient profiles.")

# 4. Synthesize matching clinical range baselines
np.random.seed(42)
num_patients = len(merged_df)
merged_df['baseline_mobility'] = np.random.uniform(20.0, 100.0, num_patients)
merged_df['peak_angle'] = np.random.uniform(45.0, 140.0, num_patients)

# 5. Create target risk based on real age/weight distributions
risk_scores = (
    (merged_df['age'] * 0.4)
    + (merged_df['weight'] * 0.3)
    - (merged_df['baseline_mobility'] * 0.5)
    - (merged_df['peak_angle'] * 0.2)
)
risk_scores = np.interp(
    risk_scores,
    (risk_scores.min(), risk_scores.max()),
    (5.0, 95.0)
)
merged_df['target_risk'] = np.clip(
    risk_scores + np.random.normal(0, 5, num_patients),
    0.0,
    100.0
)

# 6. Save clean dataset
final_df = merged_df[['age', 'weight', 'baseline_mobility', 'peak_angle', 'target_risk']]
final_df.to_csv("risk_dataset_real.csv", index=False)
print("✅ Saved risk_dataset_real.csv successfully!")
