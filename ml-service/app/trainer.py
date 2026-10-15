from datetime import datetime
import json
import os
import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

from app.preprocess import preprocess_text

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MODELS_DIR = os.path.join(BASE_DIR, "models")


def train_model(
    file_path: str,
    test_size: float = 0.2,
    algorithm: str = "logistic_regression",
) -> dict:
    resolved_path = (
        file_path if os.path.isabs(file_path) else os.path.join(BASE_DIR, file_path)
    )

    if not os.path.exists(resolved_path):
        raise ValueError(f"File not found at: {file_path}")

    if not (0.0 < test_size < 1.0):
        raise ValueError("test_size must be a float between 0.0 and 1.0")

    allowed_algorithms = ["logistic_regression", "naive_bayes"]
    if algorithm not in allowed_algorithms:
        raise ValueError(f"Algorithm must be one of: {', '.join(allowed_algorithms)}")

    try:
        df = pd.read_csv(resolved_path)
    except Exception:
        raise ValueError("Failed to parse CSV file")

    required_columns = {"text", "label"}
    if not required_columns.issubset(df.columns):
        raise ValueError("Columns 'text' and 'label' must exist in the CSV file")

    if df[["text", "label"]].isnull().any().any():
        raise ValueError(
            "CSV contains empty rows or missing values in 'text' or 'label'"
        )

    df["text"] = df["text"].astype(str)
    df["label"] = df["label"].astype(str).str.strip().str.lower()

    if (df["text"].str.strip() == "").any():
        raise ValueError("CSV contains empty text entries")

    labels_present = set(df["label"].unique())
    if not labels_present.issubset({"spam", "ham"}):
        raise ValueError("Label values must only be 'spam' or 'ham'")

    if labels_present != {"spam", "ham"}:
        raise ValueError("Both 'spam' and 'ham' classes must be present in dataset")

    x_train, x_test, y_train, y_test = train_test_split(
        df["text"],
        df["label"],
        test_size=test_size,
        stratify=df["label"],
        random_state=42,
    )

    if algorithm == "naive_bayes":
        classifier = MultinomialNB(alpha=0.1)
    else:
        classifier = LogisticRegression(max_iter=1000, random_state=42)

    pipeline = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    preprocessor=preprocess_text,
                    ngram_range=(1, 2),
                    max_features=5000,
                ),
            ),
            ("classifier", classifier),
        ]
    )

    pipeline.fit(x_train, y_train)

    y_pred = pipeline.predict(x_test)
    accuracy = float(accuracy_score(y_test, y_pred))
    precision = float(precision_score(y_test, y_pred, pos_label="spam"))
    recall = float(recall_score(y_test, y_pred, pos_label="spam"))
    f1 = float(f1_score(y_test, y_pred, pos_label="spam"))
    cm = confusion_matrix(y_test, y_pred, labels=["ham", "spam"]).tolist()

    version = datetime.now().strftime("%Y%m%d_%H%M%S")
    os.makedirs(MODELS_DIR, exist_ok=True)
    model_file = os.path.join(MODELS_DIR, f"{version}.joblib")
    meta_file = os.path.join(MODELS_DIR, f"{version}.json")

    joblib.dump(pipeline, model_file)

    metrics = {
        "version": version,
        "algorithm": algorithm,
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "confusion_matrix": cm,
        "train_size": len(x_train),
        "test_size": len(x_test),
        "created_at": datetime.now().isoformat(),
    }

    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    return metrics
