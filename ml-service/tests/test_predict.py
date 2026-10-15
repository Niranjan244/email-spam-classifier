import pytest
from fastapi.testclient import TestClient
from main import app
from app.model_manager import model_manager

client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def ensure_active_model():
    """Ensure at least one model is active for the test session."""
    if not model_manager.is_active():
        models = model_manager.list_models()
        if models:
            first_version = models[0]["version"]
            model_manager.activate_model(first_version)


def test_predict_one_output_structure():
    text = "Congratulations! You won a $1,000 cash prize. Claim immediately!"
    result = model_manager.predict_one(text)

    # 1. Validate top-level dictionary type and keys
    assert isinstance(result, dict)
    expected_keys = {
        "label",
        "spam_probability",
        "confidence",
        "suspicious_terms",
        "suspicious_phrases",
    }
    assert expected_keys.issubset(result.keys())

    # 2. Validate types and value ranges
    assert result["label"] in ["spam", "ham"]
    assert isinstance(result["spam_probability"], float)
    assert 0.0 <= result["spam_probability"] <= 1.0

    assert isinstance(result["confidence"], float)
    assert 0.5 <= result["confidence"] <= 1.0

    assert isinstance(result["suspicious_terms"], list)
    for term in result["suspicious_terms"]:
        assert isinstance(term, str)

    assert isinstance(result["suspicious_phrases"], list)
    for phrase in result["suspicious_phrases"]:
        assert isinstance(phrase, str)


def test_predict_api_output_structure():
    payload = {
        "text": "Hi Team, please find attached the weekly quarterly review report."
    }
    response = client.post("/predict", json=payload)

    assert response.status_code == 200
    data = response.json()

    assert data.get("success") is True
    assert data.get("message") == "Prediction completed successfully"

    pred_data = data.get("data")
    assert isinstance(pred_data, dict)

    # Validate output structure schema
    expected_fields = [
        "label",
        "spam_probability",
        "confidence",
        "suspicious_terms",
        "suspicious_phrases",
    ]
    for field in expected_fields:
        assert field in pred_data

    assert pred_data["label"] in ["spam", "ham"]
    assert isinstance(pred_data["spam_probability"], float)
    assert isinstance(pred_data["confidence"], float)
    assert isinstance(pred_data["suspicious_terms"], list)
    assert isinstance(pred_data["suspicious_phrases"], list)


def test_predict_api_invalid_empty_input():
    response = client.post("/predict", json={"text": "   "})
    assert response.status_code == 400
    data = response.json()
    assert data.get("success") is False
    assert "cannot be empty" in data.get("message", "")
