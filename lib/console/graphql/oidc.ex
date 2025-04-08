defmodule Console.GraphQl.OIDC do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.OAuth

  object :oauth_response do
    field :redirect_to, non_null(:string)
  end

  object :consent_request do
    field :requested_scope, list_of(:string)
    field :skip,            :boolean
  end

  object :login_request do
    field :requested_scope, list_of(:string)
    field :subject,         :string
  end

  object :oidc_step_response do
    field :login,      :login_request
    field :consent,    :consent_request
  end

  object :oidc_queries do
    field :oidc_login, :oidc_step_response do
      arg :challenge, non_null(:string)

      resolve &OAuth.resolve_oidc_login/2
    end

    field :oidc_consent, :oidc_step_response do
      arg :challenge, non_null(:string)

      resolve &OAuth.resolve_oidc_consent/2
    end
  end

  object :oidc_mutations do
    field :accept_login, :oauth_response do
      middleware Authenticated
      arg :challenge, non_null(:string)

      safe_resolve &OAuth.accept_login/2
    end

    field :oauth_consent, :oauth_response do
      middleware Authenticated
      arg :challenge, non_null(:string)
      arg :scopes, list_of(:string)

      safe_resolve &OAuth.accept_consent/2
    end
  end
end
