# CloudWatch tool setup

Use this guide to fill `Region` and either role-based or key-based auth fields.

## 1) Choose authentication model

Preferred: Assume role
- `Role ARN`
- optional `External ID`
- optional `Role session name`

Alternative: static keys
- `Access key ID`
- `Secret access key`

## 2) Grant read-only IAM permissions

Attach read-only policies to the role/user, typically:
- `CloudWatchReadOnlyAccess`
- `CloudWatchLogsReadOnlyAccess`

If you use cross-account access, configure role trust with `sts:AssumeRole` and an external ID.

## 3) Fill the Workbench tool form

- `Region`: AWS region (for example `us-east-1`)
- Role fields and/or key fields
- `Default log groups`: optional newline-delimited list used for default log queries.
  Log queries fail unless you set this or the query itself selects log groups with `SOURCE`.

Dashboard and alarm lookups do not assume `Role ARN`. They use the access keys when set,
otherwise Console's own AWS identity, so that identity also needs CloudWatch read access
if you want those lookups to work.
