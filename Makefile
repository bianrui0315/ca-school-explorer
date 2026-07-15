.PHONY: install lint typecheck test check web-install web-check worker-check full-check db-up db-down db-migrate db-roles data-fetch data-inspect data-ingest data-publish

PYTHON ?= .venv/bin/python

install:
	$(PYTHON) -m pip install -e ".[dev]"

lint:
	$(PYTHON) -m ruff check .
	$(PYTHON) -m ruff format --check .

typecheck:
	$(PYTHON) -m mypy src

test:
	$(PYTHON) -m pytest

check: lint typecheck test
	$(PYTHON) -m ca_school_explorer validate-sources

web-install:
	npm install

web-check:
	npm run web:lint
	npm run web:test
	npm run web:build

worker-check:
	npm run worker:dry-run

full-check: check web-check

db-up:
	docker compose up -d database

db-down:
	docker compose down

db-migrate:
	$(PYTHON) -m ca_school_explorer db-migrate

db-roles:
	$(PYTHON) -m ca_school_explorer db-install-roles

data-fetch:
	$(PYTHON) -m ca_school_explorer fetch-dataset

data-inspect:
	$(PYTHON) -m ca_school_explorer inspect-dataset

data-ingest:
	$(PYTHON) -m ca_school_explorer ingest-dataset

data-publish:
	$(PYTHON) -m ca_school_explorer publish-public-data --release 0.4.2
