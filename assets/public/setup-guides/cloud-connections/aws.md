# AWS cloud connection setup

Use this guide to fill `Access key ID`, `Secret access key`, optional `Region`, and optional `Assume role ARN`.

## 1) Create read-only IAM access

For broad cloud inventory/read access, start with:
- AWS managed policy `ReadOnlyAccess`

If this connection also needs CloudWatch metrics/logs visibility, include:
- `CloudWatchReadOnlyAccess`
- `CloudWatchLogsReadOnlyAccess`

Use a dedicated IAM user or role for this integration.

## 2) Prefer assume-role for cross-account access

For multi-account setups:
1. Create a role in each target account.
2. Attach read-only policies to that role.
3. Configure trust policy to allow your source principal to `sts:AssumeRole`.
4. Use `ExternalId` in trust conditions to prevent confused-deputy risk.

Then set:
- `Assume role ARN`: role to assume in target account
- `Region`: optional default region

## 3) Fill the cloud connection form

- `Access key ID` and `Secret access key`: source credentials used to call STS or APIs
- `Assume role ARN`: optional but recommended for cross-account boundaries
- `Region`: optional default query region
