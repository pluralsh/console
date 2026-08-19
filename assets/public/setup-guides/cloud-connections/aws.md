# AWS cloud connection setup

Use this guide to fill optional `Access key ID` and `Secret access key`, optional `Region`, and optional `Assume role ARN`.

The Cloud Query service uses the AWS default credential chain when access keys are
empty. Prefer workload identity over long-lived access keys.

## 1) Identify the base identity

The base identity is the AWS principal that Cloud Query runs as. It needs permission
to assume the read-only role in the account you want to query.

- **Plural Cloud:** ask Plural for the IAM role ARN to use as the base identity.
- **Self-hosted Console:** bind AWS workload identity (for example, EKS IRSA or EKS
  Pod Identity) to the Cloud Query Kubernetes service account. Its name is
  `<release>-console-cloud-query` in the namespace where Console is installed. For
  the common `console` Helm release, this is `console-cloud-query`.

You can confirm the rendered name before creating the binding:

```sh
kubectl -n <console-namespace> get serviceaccount \
  -l app.kubernetes.io/name=cloud-query
```

For IRSA, the trust policy for the base role must restrict the OIDC subject to:

```text
system:serviceaccount:<console-namespace>:<release>-console-cloud-query
```

## 2) Create the target read-only role

Create this role in every AWS account that Cloud Query should access. Replace
`<base-identity-role-arn>` with the ARN from Plural or the self-hosted workload
identity role ARN.

```terraform
data "aws_iam_policy_document" "plural_cloud_query_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "AWS"
      identifiers = ["<base-identity-role-arn>"]
    }
  }
}

resource "aws_iam_role" "plural_cloud_query_readonly" {
  name               = "plural-cloud-query-readonly"
  assume_role_policy = data.aws_iam_policy_document.plural_cloud_query_trust.json
}

resource "aws_iam_role_policy_attachment" "plural_cloud_query_readonly" {
  role       = aws_iam_role.plural_cloud_query_readonly.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}
```

`ReadOnlyAccess` is the AWS-managed policy used by the target role. Add narrower
service-specific policies instead if you do not want broad inventory access.

## 3) Allow the base identity to assume the target role

Attach the following identity policy to the base identity. Replace
`<target-account-id>` and `<target-role-name>`; use the same role name created
above unless you intentionally chose another one.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::<target-account-id>:role/<target-role-name>"
    }
  ]
}
```

For Terraform-managed self-hosted workload identity, this can be an inline policy
on the existing base role:

```terraform
resource "aws_iam_role_policy" "plural_cloud_query_assume_target" {
  name = "plural-cloud-query-assume-target"
  role = "<base-identity-role-name>"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "sts:AssumeRole"
      Resource = "arn:aws:iam::<target-account-id>:role/<target-role-name>"
    }]
  })
}
```

## 4) Fill the cloud connection form

- `Assume role ARN`: the ARN of `plural-cloud-query-readonly` in the target account.
- `Region`: an optional default query region, such as `us-east-1`.
- `Access key ID` and `Secret access key`: leave empty when using the base identity
  above. Only provide these for a dedicated static-credential base identity.

For a single-account integration, the base identity may receive `ReadOnlyAccess`
directly and `Assume role ARN` can be left empty.
