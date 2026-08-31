---
title: Templating
description: >-
  The two main functionalities that make Plural work are dependency tracking between DevOps tools (Helm and Terraform) and templating.
  This guide serves as a reference for how you can leverage this feature.
---

In [Plural Artifact Structure](/adding-new-application/plural-artifact-structure) we layed out how an artifact can be paremtrized.

The example is a snippet of the `values.yaml.tpl` file for Grafana:

```yaml
grafana:
  admin:
    password:
      { { dedupe . "grafana.grafana.admin.password" (randAlphaNum 14) } }
    user: admin
  ingress:
    tls:
      - hosts:
          - { { .Values.hostname } }
        secretName: grafana-tls
    hosts:
      - { { .Values.hostname } }
```

In the above example, the hostname a for Grafana that is saved in the `context.yaml` will be set in the ingress for Grafana by `{{ .Values.hostname }}`. It also showcases `dedupe`, which is one of the templating functions available in the Plural CLI.

We are using the `dedupe` function so that a new random password for the Grafana admin is not generated if it has already been set. The reason `grafana.grafana.admin.password` is specified for the path, is because the CLI will create a wrapper Helm chart named `grafana` in a user's installation workspace. Please see [this section](https://helm.sh/docs/chart_template_guide/subcharts_and_globals/#overriding-values-from-a-parent-chart) of the Helm docs for an explanation on how to pass values to a subchart.

The next snippet shows a part of the `terraform.tfvars` for the AWS bootstrap terraform module:

```hcl
vpc_name = {{ .Values.vpc_name | quote }}
cluster_name = {{ .Cluster | quote }}
```

Except for the user's application inputs from the `context.yaml` and the aforementioned `dedupe` function, Plural includes a lot of other values and functions that make it possible to simplify otherwise complex application configurations.

### Templating reference

Along with the standard functions available in the Go templating language, the following Plural specific functions can be used.

##### Functions:

| Function        | Input (type)                                             | Returned value             | Description                                                                                                                              |
| --------------- | -------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| fileExists      | Path (string)                                            | Boolean                    | Checks if a file exists                                                                                                                  |
| pathJoin        | Parts (\[]string)                                        | String                     | Joins parts of a path                                                                                                                    |
| repoRoot        | X                                                        | String                     | Returns the path of the installation repository                                                                                          |
| repoName        | X                                                        | String                     | Returns the base path of repoRoot                                                                                                        |
| repoUrl         | X                                                        | String                     | Returns the `remote.origin.url` of the installation repository                                                                           |
| branchName      | X                                                        | String                     | Returns the name of the branch used for the installation repository                                                                      |
| dumpConfig      | X                                                        | String, Error              | Returns the Plural CLI config                                                                                                            |
| dumpAesKey      | X                                                        | String, Error              | Returns the AES keys used for the installation repository                                                                                |
| readFile        | Path (strong)                                            | String                     | Returns the contents of a file as a string                                                                                               |
| readLine        | Prompt (string)                                          | String, Error              | Prompts the user for input and returns the inputted string                                                                               |
| readPassword    | Prompt (string)                                          | String, Error              | Prompts the user for a password input and returns the inputted string                                                                    |
| readLineDefault | Prompt, Default (string)                                 | string, error              | Prompts the user for input and returns the inputted string or the default value if input is empty                                        |
| homeDir         | Parts (\[]string)                                        | string, error              | Returns the path of the user's home directory with the path parts appended to it                                                         |
| knownHosts      | X                                                        | string, error              | Returns the contents of the `.ssh/known_hosts` file in the user's home directory                                                         |
| probe           | Object (interface{}), Path (string)                      | interface{}, error         | Checks if the object exists at the input path                                                                                            |
| dedupe          | Object (interface{}), Path, Value (string)               | string                     | Returns Object if it exists at the input Path, otherwise returns Value as a string                                                       |
| dedupeObj       | Object (interface{}), Path (string), Value (interface{}) | interface{}                | Returns Object if it exists at the input Path, otherwise returns Value as an interface{}. Used for complex data types                    |
| namespace       | Name (string)                                            | string                     | Returns the namespace for an application                                                                                                 |
| secret          | Namespace, Name (string)                                 | map\[string]interface{}    | Returns the content of a Kubernetes secret                                                                                               |
| importValue     | Tool, Path (string)                                      | string                     | Returns the value from another tool at the given path. An example use case is to use a value from the Terraform output in the Helm chart |
| toYaml          | Value (interface{})                                      | string, error              | Formats the input value as YAML                                                                                                          |
| eabCredential   | Cluster, Provider (string)                               | `api.EabCredential`, error | Creates a new set of EAB credentials in the Plural API for when using cert-manager with the Plural DNS                                   |

##### Template values:

| Path                          | Description                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| .Values                       | The (recipe) values a user inputted for the given application                                                                                                                                                                                                                                                                                                                                                                         |
| .Configuration                | Allows for getting values from other applications stored in the `context.yaml` file. For example, to use the hostname configured for Grafana in another application `{{ .Configuration.grafana.hostname }}` can be used.                                                                                                                                                                                                              |
| .License                      | The License for this application installation                                                                                                                                                                                                                                                                                                                                                                                         |
| .Config                       | The Plural CLI configuration object. Please see below for a detailed explanation                                                                                                                                                                                                                                                                                                                                                      |
| .OIDC                         | The OIDC configuration object for an application. Please see below for a detailed explanation                                                                                                                                                                                                                                                                                                                                         |
| .Region                       | The cloud region configured for the workspace of the installation                                                                                                                                                                                                                                                                                                                                                                     |
| .Project                      | The cloud project configured for the workspace of the installation                                                                                                                                                                                                                                                                                                                                                                    |
| .Cluster                      | The name of the cluster configured for the workspace of the installation                                                                                                                                                                                                                                                                                                                                                              |
| .Provider                     | The name of the cloud provider configured for the workspace of the installation                                                                                                                                                                                                                                                                                                                                                       |
| .Context                      | The context map of the Plural cloud provider config for the workspace of the installation                                                                                                                                                                                                                                                                                                                                             |
| .SMTP                         | The SMTP configuration of the workspace. Please see below for a detailed explanation                                                                                                                                                                                                                                                                                                                                                  |
| .Applications.HelmValues      | Function that can be used to get the Helm values from another application. This differs from `.Configuration` as this can access all Helm values for an application, not only those stored in the `context.yaml`. For example, to use the generated Grafana admin password in another application you can do `{{ $grafanaValues := .Applications.HelmValues "grafana" }}` then `{{ $grafanaValues.grafana.grafana.admin.password }}`. |
| .Applications.TerraformValues | Function that can be used to get the Terraform outputs from another application. Usage is similar to `.Applications.HelmValues`. For example, to get the Terraform outputs of the bootstrap application you can use `{{ $bootstrapOutputs := .Applications.TerraformValues "bootstrap" }}`                                                                                                                                            |
| .Acme.KeyId                   | The ACME key ID for to the application when using Plural DNS                                                                                                                                                                                                                                                                                                                                                                          |
| .Acme.Secret                  | The ACME secret for to the application when using Plural DNS                                                                                                                                                                                                                                                                                                                                                                          |

##### `.Config` values:

| Path                    | Description                                                     |
| ----------------------- | --------------------------------------------------------------- |
| .Config.Email           | The user email address of the current CLI user                  |
| .Config.Token           | The Plural token of the current CLI user                        |
| .Config.NamespacePrefix | The prefix to add to namespaces created for Plural applications |
| .Config.Endpoint        | The Plural endpoint the CLI will use                            |
| .Config.LockProfile     |                                                                 |
| .Config.ReportErrors    | If CLI errors should be reported back to Plural                 |
| .COnfig.metadata.Name   | Name of the CLI config that is currently being used             |

##### `.OIDC` values:

| Path                                      | Description                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| .OIDC.Id                                  | The ID of the OIDC provider for the application                                                        |
| .OIDC.ClientId                            | The Client ID for the OIDC provider of the application                                                 |
| .OIDC.ClientSecret                        | The Client Secret for the OIDC provider of the application                                             |
| .OIDC.RedirectUris                        | List of redirect URIs for the OIDC provider of the application                                         |
| .OIDC.Bindings                            | List of bindings for the OIDC provider of the application. Please see below for a detailed explanation |
| .OIDC.Configuration.Issuer                | The Issuer of the OIDC provider for the application                                                    |
| .OIDC.Configuration.AuthorizationEndpoint | The Authorization endpoint of the OIDC provider for the application                                    |
| .OIDC.Configuration.TokenEndpoint         | The Token endpoint of the OIDC provider for the application                                            |
| .OIDC.Configuration.JwksUri               | The JWKS URI of the OIDC provider for the application                                                  |
| .OIDC.Configuration.UserinfoEndpoint      | The endpoint exposing user info of the OIDC provider for the application                               |

##### `.OIDC.Bindings` values:

| Path                      | Description                                                           |
| ------------------------- | --------------------------------------------------------------------- |
| .OIDC.Bindings.User.Id    | The ID of the user that's bound to the application's OIDC provider    |
| .OIDC.Bindings.User.Email | The Email of the user that's bound to the application's OIDC provider |
| .OIDC.Bindings.User.Name  | The Name of the user that's bound to the application's OIDC provider  |
| .OIDC.Bindings.Group.Id   | The ID of the group that's bound to the application's OIDC provider   |
| .OIDC.Bindings.Group.Name | The Name of the group that's bound to the application's OIDC provider |

##### `.SMTP` values:

| Path           | Description                                   |
| -------------- | --------------------------------------------- |
| .SMTP.Service  |                                               |
| .SMTP.Server   | The SMTP server configured for the workspace  |
| .SMTP.Port     | The SMTP port configured for the workspace    |
| .SMTP.Sender   | The SMTP sender to use for the application    |
| .SMTP.User     | The username used to login to the SMTP server |
| .SMTP.Password | The password used to login to the SMTP server |
