.PHONY: install lint typecheck test check

install:
	python -m pip install -e ".[dev]"

lint:
	python -m ruff check .
	python -m ruff format --check .

typecheck:
	python -m mypy src

test:
	python -m pytest

check: lint typecheck test
	python -m ca_school_explorer validate-sources
