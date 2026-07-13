# OpenSearch tool setup

Use this guide to fill `Host`, `Index`, `AWS region`, and either pod identity / IRSA or static AWS credentials.

## 1) Confirm the endpoint and index

Use the Amazon OpenSearch Service domain endpoint as `Host`, for example:
- `https://search-domain.us-east-1.es.amazonaws.com`

Set `Index` to the log index or index pattern the tool should search, for example:
- `logs-*`
- `plrl-logs-*`

The tool signs requests with AWS SigV4 and queries:
- `POST /{index}/_search`

## 2) Choose authentication model

Preferred: pod identity / IRSA
- Enable `Use pod identity / IRSA`.
- Ensure the Console runtime has AWS credentials available through EKS Pod Identity, IRSA, instance metadata, or another default AWS credential source.
- Fill `AWS region` if it cannot be inferred from the runtime credentials.

Alternative: static keys
- Leave `Use pod identity / IRSA` disabled.
- Fill both `Access key ID` and `Secret access key`.
- Fill `AWS region`.

Optional cross-account access:
- Fill `Assume role ARN` with a role the base credentials can assume before signing OpenSearch requests.

## 3) Grant read-only OpenSearch access

Grant the selected IAM role or user permission to search the target domain and index. At minimum, allow the signed search request:
- `es:ESHttpPost` on the target index path, such as `arn:aws:es:us-east-1:123456789012:domain/my-domain/logs-*/_search`

Many deployments also allow:
- `es:ESHttpGet` for read-only HTTP access
- `es:DescribeDomain` if your access model or diagnostics need domain metadata

For domains using fine-grained access control, also map the IAM principal to an OpenSearch role with index-level read/search privileges for the same index pattern. See AWS documentation for [OpenSearch Service access control](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ac.html) and [fine-grained access control](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/fgac.html).

## 4) Fill the Workbench tool form

- `Host`: OpenSearch domain endpoint
- `Index`: index name or pattern
- `AWS region`: domain region, for example `us-east-1`
- `Assume role ARN`: optional role to assume before signing
- `Use pod identity / IRSA`: enabled for runtime credentials, disabled for static keys
- `Access key ID` / `Secret access key`: required only when pod identity / IRSA is disabled
