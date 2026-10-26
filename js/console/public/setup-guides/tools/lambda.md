# AWS Lambda tool setup

Use this guide to fill `AWS connection`, `Lambda ARN`, `Description`, and `Input schema (JSON)`.

## 1) Create the AWS cloud connection

Create an AWS cloud connection with the AWS cloud connection setup guide. That guide covers the base identity, optional `Assume role ARN`, and `ReadOnlyAccess` for inventory.

This tool calls [Lambda `Invoke`](https://docs.aws.amazon.com/lambda/latest/dg/lambda-api-permissions-ref.html) and sends the `Lambda ARN` value as `FunctionName`. `ReadOnlyAccess` does not include invoke. Grant [`lambda:InvokeFunction`](https://docs.aws.amazon.com/lambda/latest/dg/lambda-api-permissions-ref.html) on the function to the principal that performs the call: the assumed role when `Assume role ARN` is set, otherwise the access-key user or the default credential chain.

Also set these connection fields:

- `Region`: required. Use `Region`, or the first entry in `regions` when `Region` is empty. Example: `us-east-1`.
- `Access key ID` and `Secret access key`: set both, or leave both empty. Empty uses the default credential chain. Setting only one of them fails.
- `Assume role ARN`: optional.

## 2) Fill the Workbench tool form

- `AWS connection`: the connection from step 1
- `Lambda ARN`: the function name or ARN passed to `FunctionName`. Use a qualified ARN when you need a specific version or alias.
- `Description`: what the function does
- `Input schema (JSON)`: JSON schema for the object sent as the invoke payload

## 3) Approval

`Requires approval` pauses for sign-off before the function is invoked.
