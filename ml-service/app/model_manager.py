import glob
import json
import os
import joblib
from app.phrases import detect_suspicious_phrases

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MODELS_DIR = os.path.join(BASE_DIR, "models")


class ModelManager:
    def __init__(self, models_dir: str = MODELS_DIR):
        self.models_dir = models_dir
        self.active_version: str | None = None
        self.active_pipeline = None
        self._auto_load_latest()

    def _auto_load_latest(self) -> None:
        pattern = os.path.join(self.models_dir, "*.joblib")
        joblib_files = glob.glob(pattern)
        if joblib_files:
            for file_path in sorted(joblib_files, reverse=True):
                version = os.path.basename(file_path).replace(".joblib", "")
                try:
                    self.activate_model(version)
                    break
                except Exception:
                    continue

    def activate_model(self, version: str) -> str:
        clean_version = version.replace(".joblib", "").strip()
        model_path = os.path.join(self.models_dir, f"{clean_version}.joblib")

        if not os.path.exists(model_path):
            raise ValueError(f"Model version '{clean_version}' not found")

        try:
            self.active_pipeline = joblib.load(model_path)
            self.active_version = clean_version
            return clean_version
        except Exception:
            raise RuntimeError(
                f"Failed to load model file for version '{clean_version}'"
            )

    def is_active(self) -> bool:
        return self.active_pipeline is not None and self.active_version is not None

    def list_models(self) -> list[dict]:
        pattern = os.path.join(self.models_dir, "*.joblib")
        joblib_files = glob.glob(pattern)
        models = []

        for file_path in sorted(joblib_files, reverse=True):
            filename = os.path.basename(file_path)
            version = filename.replace(".joblib", "")
            meta_path = os.path.join(self.models_dir, f"{version}.json")

            if os.path.exists(meta_path):
                try:
                    with open(meta_path, "r", encoding="utf-8") as f:
                        meta = json.load(f)
                except Exception:
                    meta = {"version": version}
            else:
                meta = {"version": version}

            meta["is_active"] = version == self.active_version
            models.append(meta)

        return models

    def compute_suspicious_terms(self, text: str, top_n: int = 5) -> list[str]:
        if not self.active_pipeline:
            return []

        tfidf = self.active_pipeline.named_steps.get("tfidf")
        clf = self.active_pipeline.named_steps.get("classifier")

        if not tfidf or not clf:
            return []

        try:
            transformed = tfidf.transform([text])
            if transformed.nnz == 0:
                return []

            feature_names = tfidf.get_feature_names_out()
            row = transformed.tocoo()

            classes = list(clf.classes_)
            spam_idx = classes.index("spam") if "spam" in classes else 1
            ham_idx = classes.index("ham") if "ham" in classes else 0

            if hasattr(clf, "coef_"):
                coef = clf.coef_[0] if spam_idx == 1 else -clf.coef_[0]
            elif hasattr(clf, "feature_log_prob_"):
                coef = clf.feature_log_prob_[spam_idx] - clf.feature_log_prob_[ham_idx]
            else:
                return []

            term_scores = []
            for col_idx, tfidf_val in zip(row.col, row.data):
                weight = float(coef[col_idx] * tfidf_val)
                if weight > 0:
                    term_scores.append((feature_names[col_idx], weight))

            term_scores.sort(key=lambda item: item[1], reverse=True)
            return [term for term, _ in term_scores[:top_n]]
        except Exception:
            return []

    def predict_one(self, text: str) -> dict:
        if not self.is_active():
            raise RuntimeError("No active model. Please activate a model version first")

        probabilities = self.active_pipeline.predict_proba([text])[0]
        classes = list(self.active_pipeline.classes_)
        spam_idx = classes.index("spam") if "spam" in classes else 1
        spam_prob = float(probabilities[spam_idx])

        label = "spam" if spam_prob >= 0.5 else "ham"
        confidence = spam_prob if label == "spam" else (1.0 - spam_prob)

        return {
            "label": label,
            "spam_probability": round(spam_prob, 4),
            "confidence": round(confidence, 4),
            "suspicious_terms": self.compute_suspicious_terms(text),
            "suspicious_phrases": detect_suspicious_phrases(text),
        }

    def predict_batch(self, texts: list[str]) -> list[dict]:
        if not self.is_active():
            raise RuntimeError("No active model. Please activate a model version first")

        return [self.predict_one(t) for t in texts]


model_manager = ModelManager()
