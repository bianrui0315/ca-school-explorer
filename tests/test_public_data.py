import json
from datetime import UTC, datetime
from decimal import Decimal

from ca_school_explorer.public_data import (
    _demographics,
    _grade_span,
    _latest_all_student_observations,
    _observation,
    _peer_context,
    enrich_public_index_evidence,
)


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


def test_peer_context_publishes_matching_fields_without_outcomes() -> None:
    assert _peer_context(
        {
            "demographics": {
                "English Learner": {"count": "42", "percent": "8.4"},
                "Students with Disabilities": {"count": "63", "percent": "12.6"},
                "Socioeconomically Disadvantaged": {
                    "count": "201",
                    "percent": "40.2",
                },
            }
        }
    ) == {
        "englishLearnerPercent": 8.4,
        "studentsWithDisabilitiesPercent": 12.6,
        "socioeconomicallyDisadvantagedPercent": 40.2,
    }


def test_compact_observation_preserves_suppression_and_provenance() -> None:
    encoded = _observation(
        (2024, "metric", "subgroup", None, None, Decimal("12"), "suppressed", 7),
        {"metric": 2},
        {"subgroup": 4},
    )

    assert encoded == [2024, 2, 4, None, None, 12, 2, 7]


def test_latest_evidence_selects_latest_all_student_observation() -> None:
    observations = [
        [2023, 2, 0, 15, None, 90, 0, 4],
        [2024, 2, 0, 18, None, 100, 0, 7],
        [2024, 2, 3, 12, None, 30, 0, 8],
    ]

    assert _latest_all_student_observations(observations, 0) == [[2024, 2, 18, 100, 0, 7]]


def test_enrich_public_index_evidence_backfills_existing_bundle(tmp_path) -> None:
    root = tmp_path / "data"
    (root / "schools-index").mkdir(parents=True)
    (root / "schools").mkdir()
    (root / "manifest.json").write_text(
        json.dumps(
            {
                "schemaVersion": 1,
                "schoolIndexFiles": ["schools-index/00.json"],
                "subgroups": [{"id": "all"}, {"id": "english_learners"}],
            }
        ),
        encoding="utf-8",
    )
    (root / "schools-index" / "00.json").write_text(
        json.dumps(
            {
                "schemaVersion": 1,
                "schools": [{"id": "1", "name": "Test School", "shard": "01-0"}],
            }
        ),
        encoding="utf-8",
    )
    (root / "schools" / "01-0.json").write_text(
        json.dumps(
            {
                "schemaVersion": 1,
                "schools": {
                    "1": {
                        "observations": [
                            [2023, 0, 0, 10, None, 50, 0, 3],
                            [2024, 0, 0, 20, None, 60, 0, 4],
                        ]
                    }
                },
            }
        ),
        encoding="utf-8",
    )

    assert (
        enrich_public_index_evidence(
            root,
            release="0.3.1",
            generated_at=datetime(2026, 7, 14, 12, tzinfo=UTC),
        )
        == 1
    )
    index = json.loads((root / "schools-index" / "00.json").read_text())
    manifest = json.loads((root / "manifest.json").read_text())
    assert index["schools"][0]["latestObservations"] == [[2024, 0, 20, 60, 0, 4]]
    assert manifest["latestObservationEncoding"] == [
        "year",
        "metricIndex",
        "value",
        "denominator",
        "reliabilityCode",
        "sourceSnapshotId",
    ]
    assert manifest["release"] == "0.3.1"
    assert manifest["generatedAt"] == "2026-07-14T12:00:00Z"
