import re
import string
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

for resource in ["stopwords", "wordnet"]:
    try:
        nltk.data.find(f"corpora/{resource}")
    except LookupError:
        nltk.download(resource, quiet=True)

STOPWORDS = set(stopwords.words("english"))
lemmatizer = WordNetLemmatizer()


def preprocess_text(text: str) -> str:
    if not isinstance(text, str):
        return ""

    lowered = text.lower()
    no_urls = re.sub(r"https?://\S+|www\.\S+", "", lowered)
    no_html = re.sub(r"<.*?>", "", no_urls)
    no_punct = no_html.translate(str.maketrans("", "", string.punctuation))
    no_digits = re.sub(r"\d+", "", no_punct)

    tokens = no_digits.split()
    lemmatized_tokens = [
        lemmatizer.lemmatize(token)
        for token in tokens
        if token not in STOPWORDS and len(token) > 1
    ]

    return " ".join(lemmatized_tokens)
