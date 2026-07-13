.PHONY: install lint typecheck test check web-install web-check full-check

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

web-install:
	npm install

web-check:
	npm run web:lint
	npm run web:test
	npm run web:build

full-check: check web-check
