import pytest
from app.preprocess import preprocess_text


def test_preprocess_text_basic():
    text = "This is a simple test email for classification"
    processed = preprocess_text(text)
    # Stopwords like 'this', 'is', 'a', 'for' should be removed
    assert "this" not in processed.split()
    assert "is" not in processed.split()
    assert "simple" in processed
    assert "test" in processed
    assert "email" in processed


def test_preprocess_text_url_removal():
    text = "Claim your reward now at http://spam-site.com/prize or www.bonus.org!"
    processed = preprocess_text(text)
    assert "http" not in processed
    assert "spam-site" not in processed
    assert "www" not in processed
    assert "reward" in processed


def test_preprocess_text_html_removal():
    text = "<div><p>Urgent <b>account</b> alert!</p></div>"
    processed = preprocess_text(text)
    assert "<" not in processed
    assert ">" not in processed
    assert "div" not in processed
    assert "urgent" in processed
    assert "account" in processed


def test_preprocess_text_digits_and_punctuation():
    text = "Congratulations!!! You won $1,000,000 in cash prizes today (2026)."
    processed = preprocess_text(text)
    assert "$" not in processed
    assert "!" not in processed
    assert "1000000" not in processed
    assert "2026" not in processed
    assert "congratulation" in processed or "congratulations" in processed
    assert "prize" in processed or "cash" in processed


@pytest.mark.parametrize(
    "raw_input,expected",
    [
        ("", ""),
        ("   ", ""),
        (None, ""),
        (12345, ""),
        ([], ""),
    ],
)
def test_preprocess_text_edge_cases(raw_input, expected):
    assert preprocess_text(raw_input) == expected
