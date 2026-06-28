import torch
import torch.nn as nn
import torch.optim as optim
import pandas as pd

# ---------------------------------------------------------------------------
# RiskANN — upgraded with BatchNorm + Dropout for high-precision regression.
# This definition MUST match the one in main.py exactly so the saved
# risk_model.pth is drop-in compatible with the FastAPI endpoint.
# ---------------------------------------------------------------------------

class RiskANN(nn.Module):
    """
    MLP that takes 4 clinical features and outputs a re-injury risk
    percentage (0–100).

    Upgrades vs v1:
    - nn.BatchNorm1d after each Linear layer: internally normalises the
      wildly different input scales (age ~20–80, weight ~30–200) so the
      network never needs an external scaler saved to disk.
    - nn.Dropout(0.2) after each activation: prevents overfitting on the
      ~9 k CDC training records.
    """

    def __init__(self, input_features: int = 4):
        super(RiskANN, self).__init__()
        self.network = nn.Sequential(
            nn.Linear(input_features, 16),
            nn.BatchNorm1d(16),
            nn.ReLU(),
            nn.Dropout(0.2),

            nn.Linear(16, 8),
            nn.BatchNorm1d(8),
            nn.ReLU(),
            nn.Dropout(0.2),

            nn.Linear(8, 1),
            nn.Sigmoid(),           # outputs 0.0–1.0 probability
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.network(x) * 100  # scale to percentage (0–100)


# ---------------------------------------------------------------------------
# 1. Load the real CDC dataset
# ---------------------------------------------------------------------------

data = pd.read_csv("risk_dataset_real.csv")
X = torch.tensor(
    data[["age", "weight", "baseline_mobility", "peak_angle"]].values,
    dtype=torch.float32,
)
y = torch.tensor(data[["target_risk"]].values, dtype=torch.float32)

print(f"Training RiskANN on {len(data)} real CDC patient records...")

# ---------------------------------------------------------------------------
# 2. Model, loss, optimizer, scheduler
# ---------------------------------------------------------------------------

model = RiskANN()

criterion_mse = nn.MSELoss()
criterion_mae = nn.L1Loss()   # human-readable: "off by ±N risk points"

optimizer = optim.Adam(
    model.parameters(),
    lr=0.01,
    weight_decay=1e-4,          # L2 regularisation
)

scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
    optimizer,
    mode="min",
    factor=0.5,
    patience=50,                # halve LR after 50 epochs of no improvement
)

# ---------------------------------------------------------------------------
# 3. Training loop — 1 000 epochs, print MSE + MAE every 100
# ---------------------------------------------------------------------------

EPOCHS = 1000

for epoch in range(EPOCHS):
    # --- forward pass (training mode: BatchNorm + Dropout active) ----------
    model.train()
    optimizer.zero_grad()

    predictions = model(X)
    loss_mse = criterion_mse(predictions, y)
    loss_mse.backward()
    optimizer.step()

    # --- scheduler step on training loss -----------------------------------
    scheduler.step(loss_mse.detach())

    # --- logging every 100 epochs ------------------------------------------
    if (epoch + 1) % 100 == 0:
        model.eval()
        with torch.no_grad():
            preds_eval = model(X)
            mae = criterion_mae(preds_eval, y).item()
            mse = criterion_mse(preds_eval, y).item()
        current_lr = optimizer.param_groups[0]["lr"]
        print(
            f"Epoch {epoch+1:>4}/{EPOCHS} | "
            f"MSE Loss: {mse:.2f} | "
            f"MAE: ±{mae:.2f} risk pts | "
            f"LR: {current_lr:.6f}"
        )

# ---------------------------------------------------------------------------
# 4. Save the trained weights
# ---------------------------------------------------------------------------

torch.save(model.state_dict(), "risk_model.pth")
print("\n✅ Saved high-precision weights to risk_model.pth!")
