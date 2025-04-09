defmodule Console.GraphQl.Deployments.OAuth do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.{Deployments}

  @desc "Supported OIDC-compatible Auth Providers"
  enum :oidc_provider_type do
    value :plural
    value :console
  end

  @desc "Supported methods for fetching an OIDC auth token"
  enum :oidc_auth_method do
    value :post
    value :basic
  end

  @desc "Configuration settings for creating a new OIDC provider client"
  input_object :oidc_provider_attributes do
    field :name,          non_null(:string)
    field :auth_method,   :oidc_auth_method
    field :description,   :string
    field :bindings,      list_of(:policy_binding_attributes),
      description: "users and groups able to utilize this provider"
    field :redirect_uris, list_of(:string), description: "the redirect uris oidc is whitelisted to use"
  end

  @desc "A representation of a created OIDC provider client"
  object :oidc_provider do
    field :id,            non_null(:id)
    field :name,          non_null(:string)
    field :description,   :string
    field :auth_method,   :oidc_auth_method
    field :redirect_uris, list_of(:string), description: "the redirect uris oidc is whitelisted to use"
    field :client_id,     non_null(:string), description: "the generated client ID used in configuring OAuth clients"
    field :client_secret, non_null(:string), description: "the generated client secret, used in configuring an OAuth client"
  end

  object :oauth_mutations do
    field :create_oidc_provider, :oidc_provider do
      middleware Authenticated
      middleware AdminRequired
      arg :type,       non_null(:oidc_provider_type)
      arg :attributes, non_null(:oidc_provider_attributes)

      resolve &Deployments.create_oidc_provider/2
    end

    field :update_oidc_provider, :oidc_provider do
      middleware Authenticated
      middleware AdminRequired
      arg :type,       non_null(:oidc_provider_type)
      arg :id,         non_null(:id)
      arg :attributes, non_null(:oidc_provider_attributes)

      resolve &Deployments.update_oidc_provider/2
    end

    field :delete_oidc_provider, :oidc_provider do
      middleware Authenticated
      middleware AdminRequired
      arg :type,       non_null(:oidc_provider_type)
      arg :id,         non_null(:id)

      resolve &Deployments.delete_oidc_provider/2
    end
  end
end
