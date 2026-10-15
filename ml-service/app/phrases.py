from app.config import SUSPICIOUS_PHRASES


def detect_suspicious_phrases(text: str) -> list[str]:
    if not isinstance(text, str):
        return []

    lowered_text = text.lower()
    return [phrase for phrase in SUSPICIOUS_PHRASES if phrase in lowered_text]
