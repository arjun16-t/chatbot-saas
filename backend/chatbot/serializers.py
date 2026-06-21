import re
from rest_framework import serializers
from .models import UnansweredQuery

RULES = [
    (r"ignore\s+(all\s+)?previous\s+instructions", 5),
    (r"disregard\s+(your\s+)?instructions", 5),
    (r"system\s+prompt", 7),
    (r"hidden\s+prompt", 7),
    (r"developer\s+message", 6),
    (r"reveal\s+.*prompt", 8),
    (r"show\s+.*instructions", 6),
    (r"act\s+as\s+", 2),
    (r"jailbreak", 8),
    (r"bypass\s+safety", 8),
]

def injection_score(text: str) -> tuple[int, list]:
    text = text.lower()
    score = 0
    reasons = []

    for pattern, weight in RULES:
        if re.search(pattern, text):
            score += weight
            reasons.append(pattern)

    # Extra heuristics
    if len(re.findall(r"(ignore|disregard|forget)", text)) > 1:
        score += 3

    if "```" in text:  # prompt-like formatting
        score += 1

    if len(text) > 3000:
        score += 1

    return score, reasons

class QuerySerializer(serializers.Serializer):
    question = serializers.CharField(
        write_only=True,
        allow_blank=False,
    )

    def validate_question(self, value):
        score, reasons = injection_score(value)

        if score >= 10:
            raise serializers.ValidationError(f'Question contains suspicious instructions: {reasons}')
        
        return value

class UnansweredQuerySerializer(serializers.ModelSerializer):
    class Meta:
        model = UnansweredQuery
        fields = ['query', 'is_resolved']
        read_only_fields = ['is_resolved']