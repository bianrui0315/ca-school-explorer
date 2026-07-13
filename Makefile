.PHONY: install lint typecheck test check web-install web-check worker-check full-check db-up db-down db-migrate db-roles data-fetch data-inspect data-ingest data-publish

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

worker-check:
	npm run worker:dry-run

full-check: check web-check

db-up:
	docker compose up -d database

db-down:
	docker compose down

db-migrate:
	python -m ca_school_explorer db-migrate

db-roles:
	python -m ca_school_explorer db-install-roles

data-fetch:
	python -m ca_school_explorer fetch-dataset

data-inspect:
	python -m ca_school_explorer inspect-dataset

data-ingest:
	python -m ca_school_explorer ingest-dataset

data-publish:
	.venv/bin/python -m ca_school_explorer publish-public-data --release 0.2.1
