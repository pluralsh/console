defmodule Console.OpenAPI.CD.HelmRepository do
  use Console.OpenAPI.Base
  alias Console.Schema.HelmRepository

  defschema List, "A list of helm repositories", %{
    type: :object,
    description: "A list of helm repositories",
    properties: %{
      data: array_of(HelmRepository)
    }
  }

  defschema %{
    type: :object,
    title: "HelmRepository",
    description: "A helm repository",
    properties: timestamps(%{
      id: string(),
      url: string(description: "The url of the helm repository"),
      provider: ecto_enum(HelmRepository.Provider),
      health: ecto_enum(Console.Schema.GitRepository.Health),
      pulled_at: datetime(description: "The last successful pull timestamp"),
      error: string(description: "The error message for the helm repository's last pull attempt"),
    })
  }
end

defmodule Console.OpenAPI.CD.HelmRepositoryInput do
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "HelmRepositoryInput",
    description: "Input for upserting a helm repository",
    properties: %{
      provider: ecto_enum(Console.Schema.HelmRepository.Provider),
      url: string(description: "The url of the helm repository"),
      auth: %{
        type: :object,
        description: "Authentication configuration for the helm repository",
        properties: %{
          basic: %{
            type: :object,
            description: "Basic auth credentials",
            properties: %{
              username: string(description: "The username for basic auth"),
              password: string(description: "The password for basic auth")
            }
          },
          bearer: %{
            type: :object,
            description: "Bearer token auth",
            properties: %{
              token: string(description: "The bearer token")
            }
          },
          aws: %{
            type: :object,
            description: "AWS credentials for ECR",
            properties: %{
              access_key: string(description: "AWS access key ID"),
              secret_access_key: string(description: "AWS secret access key"),
              assume_role_arn: string(description: "ARN of the role to assume")
            }
          },
          gcp: %{
            type: :object,
            description: "GCP credentials for GCR/Artifact Registry",
            properties: %{
              application_credentials: string(description: "GCP service account JSON credentials")
            }
          },
          azure: %{
            type: :object,
            description: "Azure credentials for ACR",
            properties: %{
              client_id: string(description: "Azure client ID"),
              client_secret: string(description: "Azure client secret"),
              tenant_id: string(description: "Azure tenant ID"),
              subscription_id: string(description: "Azure subscription ID")
            }
          }
        }
      }
    }
  }
end
