---
title: Module Library
---

We have a number of helper Terraform modules and Helm charts to encapsulate some of the common tasks in applications available at [pluralsh/module-library](https://github.com/pluralsh/module-library). Some of the more common use cases here are:

- Creating object storage buckets and generating credentials for them. This covers S3, GCS, and Minio for cases where applications don't support Azure Blob Store.&#x20;
- Creating a Postgres database with all the supporting Plural artifacts
  - Runbook for scaling
  - Dashboards
  - Prometheus rules
