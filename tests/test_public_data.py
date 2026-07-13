from decimal import Decimal

from ca_school_explorer.public_data import _demographics, _grade_span, _observation


def test_public_profile_helpers_normalize_browser_values() -> None:
    assert _grade_span("KG", "05") == "K\u20135"
    assert _demographics(
        {
            "demographics": {
                "English Learner": {"count": "42", "percent": "8.4"},
                "Invalid": {"count": "not-a-number", "percent": "1"},
            }
        }
    ) == {"English Learner": {"count": 42, "percent": 8.4}}


def test_compact_observation_preserves_suppression_and_provenance() -> None:
    encoded = _observation(
        (2024, "metric", "subgroup", None, None, Decimal("12"), "suppressed", 7),
        {"metric": 2},
        {"subgroup": 4},
    )

    assert encoded == [2024, 2, 4, None, None, 12, 2, 7]
