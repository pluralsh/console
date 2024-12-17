defmodule Console.GraphQl.Deployments.Settings do
  use Console.GraphQl.Schema.Base
  alias Console.Deployments.Settings
  alias Console.GraphQl.Resolvers.{Deployments}
  alias Console.Schema.DeploymentSettings

  ecto_enum :ai_provider, DeploymentSettings.AIProvider
  ecto_enum :log_driver, DeploymentSettings.LogDriver

  input_object :project_attributes do
    field :name,          non_null(:string)
    field :description,   :string
    field :read_bindings, list_of(:policy_binding_attributes)
    field :write_bindings,list_of(:policy_binding_attributes)
  end

  input_object :deployment_settings_attributes do
    field :artifact_repository_id, :id
    field :deployer_repository_id, :id
    field :agent_helm_values,      :string, description: "custom helm values to apply to all agents (useful for things like adding customary annotations/labels)"
    field :stacks,                 :stack_settings_attributes, description: "global configuration for stack execution"
    field :prometheus_connection,  :http_connection_attributes, description: "connection details for a prometheus instance to use"
    field :loki_connection,        :http_connection_attributes, description: "connection details for a loki instance to use"

    field :smtp, :smtp_settings_attributes, description: "configuration for smtp message delivery"

    field :ai, :ai_settings_attributes, description: "configuration for LLM provider clients"
    field :cost, :cost_settings_attributes, description: "settings for cost management functionality"

    field :read_bindings,          list_of(:policy_binding_attributes)
    field :write_bindings,         list_of(:policy_binding_attributes)
    field :git_bindings,           list_of(:policy_binding_attributes)
    field :create_bindings,        list_of(:policy_binding_attributes)
  end

  input_object :http_connection_attributes do
    field :host,     non_null(:string)
    field :user,     :string, description: "user to connect w/ for basic auth"
    field :password, :string, description: "password to connect w/ for basic auth"
  end

  input_object :stack_settings_attributes do
    field :job_spec,      :gate_job_attributes
    field :connection_id, :id
  end

  @desc "Settings for cost management"
  input_object :cost_settings_attributes do
    field :enabled,                  :boolean
    field :recommendation_threshold, :integer, description: "the percentage change needed to generate a recommendation, default 30%"
    field :recommendation_cushion,   :integer, description: "the percentage change needed to generate a recommendation, default 20%"
  end

  input_object :logging_settings_attributes do
    field :enabled,  :boolean
    field :driver,   :log_driver
    field :victoria, :http_connection_attributes
  end

  input_object :ai_settings_attributes do
    field :enabled,       :boolean
    field :tools,         :tool_config_attributes
    field :provider,      :ai_provider
    field :tool_provider, :ai_provider, description: "ai provider to use with tool calls"
    field :openai,        :openai_settings_attributes
    field :anthropic,     :anthropic_settings_attributes
    field :ollama,        :ollama_attributes
    field :azure,         :azure_openai_attributes
    field :bedrock,       :bedrock_ai_attributes
    field :vertex,        :vertex_ai_attributes
  end

  input_object :tool_config_attributes do
    field :create_pr, :create_pr_config_attributes
  end

  input_object :create_pr_config_attributes do
    field :connection_id, :id, description: "a scm connection id to use for pr automations"
  end

  input_object :openai_settings_attributes do
    field :base_url,     :string
    field :access_token, :string
    field :model,        :string
    field :tool_model,   :string, description: "the model to use for tool calls, which are less frequent and require more complex reasoning"
  end

  input_object :anthropic_settings_attributes do
    field :access_token, :string
    field :model,        :string
    field :tool_model,   :string, description: "the model to use for tool calls, which are less frequent and require more complex reasoning"
  end

  input_object :ollama_attributes do
    field :model,         non_null(:string)
    field :tool_model,    :string, description: "the model to use for tool calls, which are less frequent and require more complex reasoning"
    field :url,           non_null(:string)
    field :authorization, :string, description: "An http authorization header to use on calls to the Ollama api"
  end

  input_object :azure_openai_attributes do
    field :endpoint,     non_null(:string), description: "the endpoint of your azure openai version, should look like: https://{endpoint}/openai/deployments/{deployment-id}"
    field :api_version,  :string, description: "the api version you want to use"
    field :model,        :string, description: "the exact model you wish to use"
    field :tool_model,   :string, description: "the model to use for tool calls, which are less frequent and require more complex reasoning"
    field :access_token, non_null(:string), description: "the azure openai access token to use"
  end

  input_object :bedrock_ai_attributes do
    field :model_id,          non_null(:string), description: "the bedrock model id to use"
    field :tool_model_id,     :string, description: "the model to use for tool calls, which are less frequent and require more complex reasoning"
    field :access_key_id,     :string, description: "aws access key id to use, you can also use IRSA for self-hosted consoles"
    field :secret_access_key, :string, description: "aws secret access key to use, you can also use IRSA for self-hosted consoles"
  end

  input_object :vertex_ai_attributes do
    field :model,                :string, description: "the vertex model id to use"
    field :tool_model,           :string, description: "the model to use for tool calls, which are less frequent and require more complex reasoning"
    field :service_account_json, :string, description: "optional service account json to auth to the GCP vertex apis"
    field :endpoint,             :string, description: "custom vertexai endpoint if for dedicated customer deployments"
    field :project,              non_null(:string), description: "the gcp project id to use"
    field :location,             non_null(:string), description: "the gcp region the model is hosted in"
  end

  input_object :smtp_settings_attributes do
    field :server,   non_null(:string)
    field :port,     non_null(:integer)
    field :sender,   non_null(:string)
    field :user,     non_null(:string)
    field :password, non_null(:string)
    field :ssl,      non_null(:boolean)
  end

  @desc "A unit of organization to control permissions for a set of objects within your Console instance"
  object :project do
    field :id,          non_null(:id)
    field :name,        non_null(:string)
    field :description, :string
    field :default,     :boolean

    @desc "list all alerts discovered for this project"
    connection field :alerts, node_type: :alert do
      resolve &Deployments.list_alerts/3
    end

    field :read_bindings,   list_of(:policy_binding), resolve: dataloader(Deployments), description: "read policy across this project"
    field :write_bindings,  list_of(:policy_binding), resolve: dataloader(Deployments), description: "write policy across this project"

    timestamps()
  end

  @desc "global settings for CD, these specify global read/write policies and also allow for customization of the repos for CAPI resources and the deploy operator"
  object :deployment_settings do
    field :id,                    non_null(:id)
    field :enabled,               non_null(:boolean), description: "whether you've yet to enable CD for this instance"
    field :name,                  non_null(:string)
    field :self_managed,          :boolean, description: "whether the byok cluster has been brought under self-management"
    field :loki_connection,       :http_connection, description: "the way we can connect to your loki instance"
    field :prometheus_connection, :http_connection, description: "the way we can connect to your prometheus instance"
    field :agent_helm_values,     :string, description: "custom helm values to apply to all agents (useful for things like adding customary annotations/labels)"
    field :stacks,                :stack_settings, description: "global settings for stack configuration"
    field :smtp,                  :smtp_settings, description: "smtp server configuration for email notifications"
    field :ai,                    :ai_settings, description: "settings for LLM provider clients"
    field :cost,                  :cost_settings, description: "settings for cost management"
    field :logging,               :logging_settings, description: "settings for connections to log aggregation datastores"

    field :agent_vsn, non_null(:string), description: "The console's expected agent version",
      resolve: fn _, _, _ -> {:ok, Settings.agent_vsn()} end

    field :latest_k8s_vsn, non_null(:string), description: "the latest known k8s version",
      resolve: fn _, _, _ -> {:ok, Settings.kube_vsn()} end

    field :compliant_k8s_vsn, non_null(:string), description: "your compliant k8s version",
      resolve: fn _, _, _ -> {:ok, Settings.compliant_vsn()} end

    field :artifact_repository, :git_repository, resolve: dataloader(Deployments), description: "the repo to fetch CAPI manifests from, for both providers and clusters"
    field :deployer_repository, :git_repository, resolve: dataloader(Deployments), description: "the repo to fetch the deploy operators manifests from"

    field :read_bindings,   list_of(:policy_binding), resolve: dataloader(Deployments), description: "read policy across all objects"
    field :write_bindings,  list_of(:policy_binding), resolve: dataloader(Deployments), description: "write policy across all objects"
    field :git_bindings,    list_of(:policy_binding), resolve: dataloader(Deployments), description: "policy for managing git repos"
    field :create_bindings, list_of(:policy_binding), resolve: dataloader(Deployments), description: "policy for creation of new objects"

    timestamps()
  end

  object :stack_settings do
    field :job_spec,      :job_gate_spec
    field :connection_id, :id
  end

  @desc "the details of how to connect to a http service like prometheus"
  object :http_connection do
    field :host,     non_null(:string)
    field :user,     :string, description: "user to connect w/ for basic auth"
  end

  @desc "SMTP server configuration for email notifications"
  object :smtp_settings do
    field :server,   non_null(:string)
    field :port,     non_null(:integer)
    field :sender,   non_null(:string)
    field :user,     non_null(:string)
    field :ssl,      non_null(:boolean)
  end

  @desc "Settings for cost management"
  object :cost_settings do
    field :enabled, :boolean
    field :recommendation_threshold, :integer, description: "the percentage change needed to generate a recommendation, default 30%"
    field :recommendation_cushion, :integer, description: "the percentage cushion above baseline usage to give when generation recommendations, default 20%"
  end

  @desc "Settings for configuring access to common LLM providers"
  object :ai_settings do
    field :enabled,       :boolean
    field :tools_enabled, :boolean, resolve: fn _, _, _ -> {:ok, Console.AI.Provider.tools?()} end
    field :provider,      :ai_provider
    field :tool_provider, :ai_provider, description: "ai provider to use with tool calls"
    field :openai,        :openai_settings
    field :anthropic,     :anthropic_settings
    field :ollama,        :ollama_settings
    field :azure,         :azure_openai_settings
    field :bedrock,       :bedrock_ai_settings
    field :vertex,        :vertex_ai_settings
  end

  @desc "OpenAI connection information"
  object :openai_settings do
    field :base_url,   :string, description: "the base url to use when querying an OpenAI compatible API, leave blank for OpenAI"
    field :model,      :string, description: "the openai model version to use"
    field :tool_model, :string, description: "the model to use for tool calls, which are less frequent and require more complex reasoning"
  end

  @desc "Anthropic connection information"
  object :anthropic_settings do
    field :model,      :string, description: "the anthropic model version to use"
    field :tool_model, :string, description: "the model to use for tool calls, which are less frequent and require more complex reasoning"
  end

  @desc "Settings for a self-hosted ollama-based LLM deployment"
  object :ollama_settings do
    field :model,      non_null(:string)
    field :tool_model, :string, description: "the model to use for tool calls, which are less frequent and require more complex reasoning"
    field :url,        non_null(:string), description: "the url your ollama deployment is hosted on"
  end

  @desc "Settings for configuring against Azure OpenAI"
  object :azure_openai_settings do
    field :endpoint,    non_null(:string), description: "the endpoint of your azure openai version, should look like: https://{endpoint}/openai/deployments/{deployment-id}"
    field :model,       :string
    field :tool_model,  :string, description: "the model to use for tool calls, which are less frequent and require more complex reasoning"
    field :api_version, :string, description: "the api version you want to use"
  end

  @desc "Settings for usage of AWS Bedrock for LLMs"
  object :bedrock_ai_settings do
    field :model_id,      non_null(:string), description: "the bedrock model to use"
    field :tool_model_id, :string, description: "the model to use for tool calls, which are less frequent and require more complex reasoning"
    field :access_key_id, :string, description: "the aws access key to use, can also use IRSA when console is self-hosted"
  end

  @desc "Settings for usage of GCP VertexAI for LLMs"
  object :vertex_ai_settings do
    field :model,      :string, description: "the vertex ai model to use"
    field :tool_model, :string, description: "the model to use for tool calls, which are less frequent and require more complex reasoning"
    field :project,    non_null(:string), description: "the gcp project id to use"
    field :location,   non_null(:string), description: "the gcp region the model"
  end

  @desc "Settings for configuring log aggregation throughout Plural"
  object :logging_settings do
    field :enabled,  :boolean
    field :driver,   :log_driver, description: "the type of log aggregation solution you wish to use"
    field :victoria, :http_connection, description: "configures a connection to victoria metrics"
  end

  connection node_type: :project

  object :settings_queries do
    field :deployment_settings, :deployment_settings do
      middleware Authenticated, :cluster

      resolve &Deployments.settings/2
    end

    connection field :projects, node_type: :project do
      middleware Authenticated
      arg :q, :string

      resolve &Deployments.list_projects/2
    end

    field :project, :project do
      middleware Authenticated
      arg :id,   :id
      arg :name, :string

      resolve &Deployments.get_project/2
    end
  end

  object :settings_mutations do
    field :update_deployment_settings, :deployment_settings do
      middleware Authenticated
      arg :attributes, non_null(:deployment_settings_attributes)

      safe_resolve &Deployments.update_settings/2
    end

    field :enable_deployments, :deployment_settings do
      middleware Authenticated

      safe_resolve &Deployments.enable/2
    end

    field :create_project, :project do
      middleware Authenticated
      arg :attributes, non_null(:project_attributes)

      resolve &Deployments.create_project/2
    end

    field :update_project, :project do
      middleware Authenticated
      arg :id,         non_null(:id)
      arg :attributes, non_null(:project_attributes)

      resolve &Deployments.update_project/2
    end

    field :delete_project, :project do
      middleware Authenticated
      arg :id,         non_null(:id)

      resolve &Deployments.delete_project/2
    end
  end
end
