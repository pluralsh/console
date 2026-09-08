# Compatibility scraper tests

From `utils/compatibility`, install test dependencies into a virtual environment:

```sh
python -m pip install -r requirements-test.txt
python -m unittest discover -s tests -v
```

The tests use small offline fixtures derived from the linked official sources.
They do not contact Kubernetes clusters or invoke paid APIs. They cover release
selection, version ranges, malformed source data, and preservation of existing
compatibility files on parsing failure.

Live generation is separate from this test suite. Run a selected scraper from
`utils/compatibility` with Helm available when it includes chart versions; unset
`EXA_API_KEY` and `OPENAI_API_KEY` to disable optional paid summarization.
