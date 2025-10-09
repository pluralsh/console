defmodule Console.GraphQl.Deployments.Git do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.Deployments
  alias Console.Schema.{
    GitRepository,
    HelmRepository,
    PullRequest,
    ScmConnection,
    ScmWebhook,
    PrAutomation,
    Configuration,
    Observer
  }

  ecto_enum :auth_method,              GitRepository.AuthMethod
  ecto_enum :git_health,               GitRepository.Health
  ecto_enum :scm_type,                 ScmConnection.Type
  ecto_enum :match_strategy,           PrAutomation.MatchStrategy
  ecto_enum :list_merge,               PrAutomation.ListMerge
  ecto_enum :helm_auth_provider,       HelmRepository.Provider
  ecto_enum :pr_role,                  PrAutomation.Role
  ecto_enum :pr_status,                PullRequest.Status
  ecto_enum :configuration_type,       Configuration.Type
  ecto_enum :operation,                Configuration.Condition.Operation
  ecto_enum :validation_uniq_scope,    Configuration.UniqScope
  ecto_enum :observer_action_type,     Observer.Action
  ecto_enum :observer_target_type,     Observer.TargetType
  ecto_enum :observer_git_target_type, Observer.GitTargetType
  ecto_enum :observer_target_order,    Observer.TargetOrder
  ecto_enum :observer_status,          Observer.Status

  input_object :catalog_attributes do
    field :name,           non_null(:string)
    field :author,         non_null(:string), description: "the name of the author of this catalog, used for attribution only"
    field :description,    :string
    field :category,       :string, description: "short category name for browsability"
    field :project_id,     :id, description: "owning project of the catalog, permissions will propagate down"
    field :icon,           :string, description: "an icon url to use for this catalog"
    field :dark_icon,      :string, description: "a darkmode icon url to use for this catalog"

    field :tags,            list_of(:tag_attributes)
    field :read_bindings,   list_of(:policy_binding_attributes)
    field :write_bindings,  list_of(:policy_binding_attributes)
    field :create_bindings, list_of(:policy_binding_attributes)
  end

  input_object :git_attributes do
    field :url,           non_null(:string), description: "the url of this repository"
    field :private_key,   :string, description: "an ssh private key to use with this repo if an ssh url was given"
    field :passphrase,    :string, description: "a passphrase to decrypt the given private key"
    field :username,      :string, description: "the http username for authenticated http repos, defaults to apiKey for github"
    field :password,      :string, description: "the http password for http authenticated repos"
    field :https_path,    :string, description: "a manually supplied https path for non standard git setups.  This is auto-inferred in many cases"
    field :url_format,    :string, description: "similar to https_path, a manually supplied url format for custom git.  Should be something like {url}/tree/{ref}/{folder}"
    field :connection_id, :id, description: "id of a scm connection to use for authentication"
    field :decrypt,       :boolean, description: "whether to run plural crypto on this repo"
  end

  input_object :helm_repository_attributes do
    field :provider, :helm_auth_provider
    field :auth,     :helm_auth_attributes
  end

  input_object :helm_auth_attributes do
    field :basic,  :helm_basic_auth_attributes
    field :bearer, :helm_bearer_auth_attributes
    field :aws,    :helm_aws_auth_attributes
    field :azure,  :helm_azure_auth_attributes
    field :gcp,    :helm_gcp_auth_attributes
  end

  input_object :helm_basic_auth_attributes do
    field :username, non_null(:string)
    field :password, non_null(:string)
  end

  input_object :helm_bearer_auth_attributes do
    field :token, non_null(:string)
  end

  input_object :helm_aws_auth_attributes do
    field :access_key,        :string
    field :secret_access_key, :string
    field :assume_role_arn,   :string
  end

  input_object :helm_azure_auth_attributes do
    field :client_id,       :string
    field :client_secret,   :string
    field :tenant_id,       :string
    field :subscription_id, :string
  end

  input_object :helm_gcp_auth_attributes do
    field :application_credentials, :string
  end

  @desc "an object representing a means to authenticate to a source control provider like Github"
  input_object :scm_connection_attributes do
    field :name,                non_null(:string)
    field :type,                non_null(:scm_type)
    field :owner,               :string, description: "the owning entity in this scm provider, eg a github organization"
    field :username,            :string
    field :token,               :string
    field :base_url,            :string
    field :api_url,             :string
    field :github,              :github_app_attributes
    field :azure,               :azure_devops_attributes
    field :default,             :boolean
    field :proxy,               :http_proxy_attributes
    field :signing_private_key, :string, description: "a ssh private key to be used for commit signing"
  end

  @desc "Configuration for http proxy usage in connections to Git or SCM providers"
  input_object :http_proxy_attributes do
    field :url, non_null(:string)
  end

  @desc "Requirements to perform Github App authentication"
  input_object :github_app_attributes do
    field :app_id,          non_null(:string), description: "Github App ID"
    field :installation_id, non_null(:string), description: "ID of this github app installation"
    field :private_key,     non_null(:string), description: "PEM-encoded private key for this app"
  end

  @desc "Requirements to perform Azure DevOps authentication"
  input_object :azure_devops_attributes do
    field :username,     non_null(:string), description: "the username asociated with your Azure DevOps PAT"
    field :organization, non_null(:string), description: "the organization to use for azure devops"
    field :project,      non_null(:string), description: "the project to use for azure devops"
  end

  @desc "A way to create a self-service means of generating PRs against an IaC repo"
  input_object :pr_automation_attributes do
    field :name,          :string
    field :role,          :pr_role
    field :identifier,    :string, description: "string id for a repository, eg for github, this is {organization}/{repository-name}"
    field :documentation, :string
    field :title,         :string
    field :message,       :string
    field :branch,        :string
    field :patch,         :boolean, description: "whether to generate a patch for this pr instead of a full pr"
    field :updates,       :pr_automation_update_spec_attributes
    field :creates,       :pr_automation_create_spec_attributes
    field :deletes,       :pr_automation_delete_spec_attributes

    field :icon,      :string, description: "an icon url to use for this catalog"
    field :dark_icon, :string, description: "a darkmode icon url to use for this catalog"

    field :addon,         :string, description: "link to an add-on name if this can update it"
    field :cluster_id,    :id, description: "link to a cluster if this is to perform an upgrade"
    field :service_id,    :id, description: "link to a service if this can modify its configuration"
    field :connection_id, :id, description: "the scm connection to use for pr generation"


    field :catalog_id,    :id, description: "the catalog this automation will belong to"
    field :project_id,    :id, description: "the project this automation lives in"
    field :repository_id, :id, description: "a git repository to use for create mode prs"
    field :governance_id, :id, description: "the governance controller to use for this pr"

    field :configuration, list_of(:pr_configuration_attributes)
    field :secrets,       :pr_secrets_attributes

    field :confirmation,  :pr_confirmation_attributes

    field :write_bindings,  list_of(:policy_binding_attributes), description: "users who can update this automation"
    field :create_bindings, list_of(:policy_binding_attributes), description: "users who can create prs with this automation"
  end

  @desc "Additional details to verify all prerequisites are satisfied before generating this pr"
  input_object :pr_confirmation_attributes do
    field :text,      :string, description: "optional markdown text to present before pr create"
    field :checklist, list_of(:pr_checklist_attributes), description: "itemized checklist to complete before pr create"
  end

  @desc "a checkbox item to render before creating a pr"
  input_object :pr_checklist_attributes do
    field :label, non_null(:string), description: "the label for the checkbox"
  end

  @desc "the a configuration item for creating a new pr"
  input_object :pr_configuration_attributes do
    field :type,          non_null(:configuration_type)
    field :name,          non_null(:string)
    field :default,       :string
    field :documentation, :string
    field :longform,      :string
    field :display_name,  :string
    field :placeholder,   :string
    field :page,          :integer, description: "the page to use for the pr automation"
    field :optional,      :boolean
    field :condition,     :condition_attributes
    field :validation,    :configuration_validation_attributes
    field :values,        list_of(:string)
  end

  @desc "attributes for declaratively specifying whether a config item is relevant given prior config"
  input_object :condition_attributes do
    field :operation, non_null(:operation)
    field :field,     non_null(:string)
    field :value,     :string
  end

  @desc "Validations to apply to this configuration entry prior to PR creation"
  input_object :configuration_validation_attributes do
    field :regex,    :string, description: "regex a string value should match"
    field :json,     :boolean, description: "whether the string is json encoded"
    field :uniq_by,  :uniq_by_attributes, description: "configuration for name uniqueness"
  end

  input_object :pr_secrets_attributes do
    field :cluster,       :string, description: "the cluster handle that will hold this secret"
    field :namespace,     :string, description: "the k8s namespace to place the secret in"
    field :name,          :string, description: "the name of the secret"
    field :entries,       list_of(:pr_secret_entry_attributes)
  end

  input_object :pr_secret_entry_attributes do
    field :name,          :string, description: "the name of the secret entry"
    field :documentation, :string, description: "the documentation for the secret entry"
    field :autogenerate,  :boolean, description: "whether to autogenerate the secret entry"
  end

  @desc "How to enforce uniqueness for a field"
  input_object :uniq_by_attributes do
    field :scope, non_null(:validation_uniq_scope), description: "the scope this name is uniq w/in"
  end

  @desc "The operations to be performed on the files w/in the pr"
  input_object :pr_automation_update_spec_attributes do
    field :regexes,            list_of(:string)
    field :regex_replacements, list_of(:regex_replacement_attributes),
      description: "list of regex scope replacement templates, useful for ANY strategies"
    field :yaml_overlays,      list_of(:yaml_overlay_attributes),
      description: "list of yaml overlay operations to apply to a file"
    field :files,              list_of(:string)
    field :replace_template,   :string
    field :yq,                 :string
    field :match_strategy,     :match_strategy
  end

  @desc "Operations to create new templated files within this pr"
  input_object :pr_automation_create_spec_attributes do
    field :git,       :git_ref_attributes
    field :templates, list_of(:pr_automation_template_attributes)
  end

  @desc "Operations to delete files within this pr"
  input_object :pr_automation_delete_spec_attributes do
    field :files,     list_of(non_null(:string))
    field :folders,   list_of(non_null(:string))
  end

  @desc "a fully specified regex/replace flow"
  input_object :regex_replacement_attributes do
    field :regex,       non_null(:string)
    field :replacement, non_null(:string)
    field :file,        non_null(:string), description: "the filename to apply this regex on"
    field :templated,   :boolean,
      description: "whether you want to apply liquid templating on the regex before compiling"
  end

  @desc "templates to apply in this pr"
  input_object :pr_automation_template_attributes do
    field :source,      non_null(:string)
    field :destination, non_null(:string)
    field :context,     :json
    field :condition,   :string
    field :external,    non_null(:boolean),
      description: "whether the source template is sourced from an external git repo bound to this automation"
  end

  @desc "a description of a yaml-merge operation on a file"
  input_object :yaml_overlay_attributes do
    field :file,       non_null(:string), description: "the filename to apply this yaml overlay on"
    field :yaml,       non_null(:string)
    field :list_merge, :list_merge, description: "configure how list merge should be performed"
    field :templated,  :boolean,
      description: "whether you want to apply liquid templating on the yaml before compiling"
  end

  @desc "attributes for a pull request pointer record"
  input_object :pull_request_attributes do
    field :url,        non_null(:string)
    field :title,      non_null(:string)
    field :creator,    :string
    field :labels,     list_of(:string)
    field :service_id, :id
    field :cluster_id, :id
    field :service,    :namespaced_name
    field :cluster,    :namespaced_name
  end

  @desc "attributes for a pull request pointer record"
  input_object :pull_request_update_attributes do
    field :title,      non_null(:string)
    field :labels,     list_of(:string)
    field :status,     non_null(:pr_status)
    field :service_id, :id
    field :cluster_id, :id
    field :service,    :namespaced_name
    field :cluster,    :namespaced_name
  end

  @desc "The attributes to configure a new webhook for a SCM provider"
  input_object :scm_webhook_attributes do
    field :hmac,  non_null(:string), description: "the secret token for authenticating this webhook via hmac signature"
    field :type,  non_null(:scm_type), description: "the type of webhook to create"
    field :owner, non_null(:string), description: "the owner for this webhook in your SCM, eg a github org or gitlab group"
  end

  @desc "An observer is a mechanism to poll an external helm, oci or other datasources and perform a list of actions in response"
  input_object :observer_attributes do
    field :name,       non_null(:string)
    field :crontab,    non_null(:string)
    field :target,     non_null(:observer_target_attributes)
    field :actions,    list_of(:observer_action_attributes)
    field :initial,    :string
    field :project_id, :id
  end

  @desc "Resets the current value of the observer"
  input_object :observer_reset_attributes do
    field :last_value, non_null(:string)
  end

  @desc "A spec for a target to poll"
  input_object :observer_target_attributes do
    field :type,      :observer_target_type
    field :target,    :observer_target_type, description: "present for backwards compat"
    field :format,    :string
    field :order,     non_null(:observer_target_order)
    field :helm,      :observer_helm_attributes
    field :oci,       :observer_oci_attributes
    field :git,       :observer_git_attributes
    field :addon,     :observer_addon_attributes
    field :eks_addon, :observer_addon_attributes
  end

  @desc "A spec of an action that can be taken in response to an observed entity"
  input_object :observer_action_attributes do
    field :type, non_null(:observer_action_type)
    field :configuration, non_null(:observer_action_configuration_attributes)
  end

  @desc "a spec for querying a helm repository in an observer"
  input_object :observer_helm_attributes do
    field :url,      non_null(:string)
    field :chart,    non_null(:string)
    field :provider, :helm_auth_provider
    field :auth,     :helm_auth_attributes
  end

  @desc "a spec for querying a helm repository in an observer"
  input_object :observer_oci_attributes do
    field :url,      non_null(:string)
    field :provider, :helm_auth_provider
    field :auth,     :helm_auth_attributes
  end

  input_object :observer_git_attributes do
    field :repository_id, non_null(:id)
    field :type,          non_null(:observer_git_target_type)
    field :filter,        :observer_git_filter_attributes
  end

  @desc "a spec for filtering a git repository tags in an observer"
  input_object :observer_git_filter_attributes do
    field :regex, :string, description: "a regex to filter the git repository tags for the observed value"
  end

  @desc "configuration for an observer action"
  input_object :observer_action_configuration_attributes do
    field :pr,       :observer_pr_action_attributes
    field :pipeline, :observer_pipeline_action_attributes
  end

  @desc "Configuration for sending a pr in response to an observer"
  input_object :observer_pr_action_attributes do
    field :automation_id,   non_null(:id)
    field :repository,      :string
    field :branch_template, :string, description: "a template to use for the created branch, use $value to interject the observed value"
    field :context,         non_null(:json), description: "the context to apply, use $value to interject the observed value"
  end

  @desc "Configuration for setting a pipeline context in an observer"
  input_object :observer_pipeline_action_attributes do
    field :pipeline_id, non_null(:id)
    field :context,     non_null(:json), description: "the context to apply, use $value to interject the observed value"
  end

  @desc "The settings for configuring add-on scraping"
  input_object :observer_addon_attributes do
    field :name,                non_null(:string)
    field :kubernetes_version,  :string
    field :kubernetes_versions, list_of(non_null(:string))
  end

  @desc "The settings for configuring a pr governance controller"
  input_object :pr_governance_attributes do
    field :name, non_null(:string)
    field :connection_id, non_null(:id), description: "the scm connection to use for pr generation"
    field :configuration, :pr_governance_configuration_attributes
  end

  @desc "The settings for configuring a pr governance controller"
  input_object :pr_governance_configuration_attributes do
    field :webhook, :governance_webhook_attributes
  end

  @desc "The settings for configuring a pr governance controller"
  input_object :governance_webhook_attributes do
    field :url, non_null(:string), description: "the url to send webhooks to"
  end

  @desc "a git repository available for deployments"
  object :git_repository do
    field :id,           non_null(:id), description: "internal id of this repository"
    field :url,          non_null(:string), description: "the git url of the repository, either https or ssh supported"
    field :auth_method,  :auth_method, description: "whether its a http or ssh url"
    field :health,       :git_health, description: "whether we can currently pull this repo with the provided credentials"
    field :pulled_at,    :datetime, description: "the last successsful git pull timestamp"
    field :error,        :string, description: "the error message if there were any pull errors"
    field :https_path,   :string, description: "the https url for this git repo"
    field :url_format,   :string, description: "a format string to get the http url for a subfolder in a git repo"
    field :decrypt,      :boolean, description: "whether to run plural crypto unlock on this repo"

    field :refs, list_of(non_null(:string)), description: "named refs like branches/tags for a repository", resolve: fn
      git, _, _ -> Deployments.git_refs(git)
    end

    field :editable, :boolean,
      resolve: &Deployments.editable/3,
      description: "whether the current user can edit this repo"

    timestamps()
  end

  @desc "A direct Plural representation of a Helm repository"
  object :helm_repository do
    field :id,        non_null(:id)
    field :url,       non_null(:string)
    field :health,    :git_health
    field :error,     :string
    field :provider,  :helm_auth_provider
    field :pulled_at, :datetime

    timestamps()
  end

  @desc "a Flux crd representation of a Helm repository"
  object :flux_helm_repository do
    field :metadata, non_null(:metadata)
    field :spec,     non_null(:helm_repository_spec)
    field :charts,   list_of(:helm_chart_entry),
      resolve: &Deployments.helm_charts/3,
      description: "the charts found in this repository (heavy operation, don't do in list endpoints)"
    field :status,   :helm_repository_status,
      resolve: &Deployments.helm_status/3,
      description: "can fetch the status of a given helm repository"
  end

  @desc "a specification of how a helm repository is fetched"
  object :helm_repository_spec do
    field :provider, :string
    field :url,      non_null(:string)
    field :type,     :string
  end

  @desc "the state of this helm repository"
  object :helm_repository_status do
    field :ready,   :boolean
    field :message, :string
  end

  @desc "a chart manifest entry, including all versions"
  object :helm_chart_entry do
    field :name,     :string, description: "the name of the chart"
    field :versions, list_of(:helm_chart_version), description: "all found versions of the chart"
  end

  @desc "a chart version contained within a helm repository manifest"
  object :helm_chart_version do
    field :app_version, :string, description: "the version of the app contained w/in this chart"
    field :version,     :string, description: "the version of the chart itself"
    field :name,        :string, description: "the name of the chart"
    field :type,        :string
    field :digest,      :string, description: "sha digest of this chart's contents"
  end

  @desc "an object representing the means to connect to SCM apis"
  object :scm_connection do
    field :id,       non_null(:id)
    field :name,     non_null(:string)
    field :type,     non_null(:scm_type)
    field :default,  :boolean
    field :username, :string
    field :proxy,    :http_proxy_configuration, description: "a proxy to use for git requests"
    field :azure,    :azure_devops_configuration, description: "the azure devops attributes for this connection"

    field :base_url, :string, description: "base url for git clones for self-hosted versions"
    field :api_url,  :string, description: "base url for HTTP apis for self-hosted versions if different from base url"

    timestamps()
  end

  @desc "a description of how to generate a pr, which can either modify existing files or generate new ones w/in a repo"
  object :pr_automation do
    field :id,            non_null(:id)
    field :identifier,    :string, description: "string id for a repository, eg for github, this is {organization}/{repository-name}"
    field :name,          non_null(:string), description: "the name for this automation"
    field :role,          :pr_role, description: "An enum describing the high-level responsibility of this pr, eg creating a cluster or service, or upgrading a cluster"
    field :documentation, :string
    field :title,         non_null(:string)
    field :message,       non_null(:string)
    field :updates,       :pr_update_spec
    field :creates,       :pr_create_spec
    field :deletes,       :pr_delete_spec

    field :icon,      :string, description: "an icon url to use for this catalog"
    field :dark_icon, :string, description: "a darkmode icon url to use for this catalog"

    field :configuration, list_of(:pr_configuration)
    field :secrets,       :pr_secrets, description: "the secrets to create as part of this pr"
    field :confirmation,  :pr_confirmation, description: "optional confirmation block to express prerequisites for this PR"

    field :write_bindings, list_of(:policy_binding),
      description: "write policy for this pr automation, also propagates to the notifications list for any created PRs",
      resolve: dataloader(Deployments)

    field :create_bindings, list_of(:policy_binding),
      description: "users who can generate prs with this automation",
      resolve: dataloader(Deployments)

    field :addon,      :string, description: "link to an add-on name if this can update it"
    field :repository, :git_repository,
      description: "the git repository to use for sourcing external templates",
      resolve: dataloader(Deployments)
    field :catalog,    :catalog,
      resolve: dataloader(Deployments),
      description: "the catalog this pr automation belongs to"
    field :project,    :project,
      description: "the project this automation lives w/in",
      resolve: dataloader(Deployments)
    field :cluster,    :cluster,
      description: "link to a cluster if this is to perform an upgrade",
      resolve: dataloader(Deployments)
    field :service,    :service_deployment,
      description: "link to a service if this can update its configuration",
      resolve: dataloader(Deployments)
    field :connection, :scm_connection,
      description: "the scm connection to use for pr generation",
      resolve: dataloader(Deployments)

    timestamps()
  end

  @desc "existing file updates that can be performed in a PR"
  object :pr_update_spec do
    field :regexes,            list_of(:string)
    field :regex_replacements, list_of(:regex_replacement)
    field :yaml_overlays,      list_of(:yaml_overlay)
    field :files,              list_of(:string)
    field :replace_template,   :string
    field :yq,                 :string
    field :match_strategy,     :match_strategy
  end

  @desc "a description of a yaml-merge operation on a file"
  object :yaml_overlay do
    field :yaml, non_null(:string)
    field :file,        non_null(:string), description: "the filename to apply this yaml overlay on"
    field :templated,   :boolean,
      description: "whether you want to apply liquid templating on the yaml before compiling"
    field :list_merge,  :list_merge, description: "configure how list merge should be performed"
  end

  @desc "templated files used to add new files to a given pr"
  object :pr_create_spec do
    field :git, :git_ref, description: "pointer within an external git repository to source templates from"
    field :templates, list_of(:pr_template_spec)
  end

  @desc "Files or folders you want to delete in this pr"
  object :pr_delete_spec do
    field :files,     list_of(non_null(:string))
    field :folders,   list_of(non_null(:string))
  end

  @desc "the details of where to find and place a templated file"
  object :pr_template_spec do
    field :source,      non_null(:string)
    field :destination, non_null(:string)
    field :context,     :map
    field :external,    non_null(:boolean)
    field :condition,   :string
  end

  @desc "a fully specified regex/replace flow"
  object :regex_replacement do
    field :regex,       non_null(:string)
    field :file,        non_null(:string), description: "the file to apply this replacement on"
    field :replacement, non_null(:string), description: "template string to replace any match with"
    field :templated,   :boolean, description: "Whether to apply liquid templating before compiling this regex"
  end

  @desc "the a configuration item for creating a new pr, used for templating the ultimate code changes made"
  object :pr_configuration do
    field :type,          non_null(:configuration_type)
    field :name,          non_null(:string)
    field :default,       :string
    field :documentation, :string
    field :longform,      :string
    field :placeholder,   :string
    field :display_name,  :string
    field :page,          :integer, description: "the page to use for the pr configuration"
    field :optional,      :boolean
    field :values,        list_of(:string)
    field :condition,     :pr_configuration_condition
  end

  @desc "declaritive spec for whether a config item is relevant given prior config"
  object :pr_configuration_condition do
    field :operation, non_null(:operation), description: "a boolean operation to apply"
    field :field,     non_null(:string), description: "the prior field to check"
    field :value,     :string, description: "a fixed value to check against if its a binary operation"
  end

  object :pr_secrets do
    field :cluster,   :string, description: "the cluster handle that will hold this secret"
    field :namespace, :string, description: "the k8s namespace to place the secret in"
    field :name,      :string, description: "the name of the secret"
    field :entries,   list_of(:pr_secret_entry)
  end

  object :pr_secret_entry do
    field :name,          :string, description: "the name of the secret entry"
    field :documentation, :string, description: "the documentation for the secret entry"
    field :autogenerate,  :boolean, description: "whether to autogenerate the secret"
  end

  @desc "Additional details to verify all prerequisites are satisfied before generating this pr"
  object :pr_confirmation do
    field :text,      :string, description: "optional markdown text to present before pr create"
    field :checklist, list_of(:pr_checklist), description: "itemized checklist to complete before pr create"
  end

  @desc "a checkbox item to render before creating a pr"
  object :pr_checklist do
    field :label, non_null(:string), description: "the label for the checkbox"
  end

  object :azure_devops_configuration do
    field :username,     non_null(:string), description: "the username asociated with your Azure DevOps PAT"
    field :organization, non_null(:string), description: "the organization to use for azure devops"
    field :project,      non_null(:string), description: "the project to use for azure devops"
  end

  @desc "A reference to a pull request for your kubernetes related IaC"
  object :pull_request do
    field :id,      non_null(:id)
    field :status,  :pr_status
    field :url,     non_null(:string)
    field :title,   :string
    field :creator, :string
    field :labels,  list_of(:string)
    field :patch,   :string, description: "the patch for this pr, if it is a patch.  This is in place of generating a full pr"

    field :flow,    :flow, description: "the flow this pr is meant to modify",
      resolve: dataloader(Deployments)
    field :cluster, :cluster, description: "the cluster this pr is meant to modify",
      resolve: dataloader(Deployments)
    field :service, :service_deployment, description: "the service this pr is meant to modify",
      resolve: dataloader(Deployments)

    timestamps()
  end

  object :scm_webhook do
    field :id,    non_null(:id)
    field :type,  non_null(:scm_type)
    field :owner, non_null(:string)

    field :url,   non_null(:string),
      description: "the url for this specific webhook",
      resolve: fn hook, _, _ -> {:ok, ScmWebhook.url(hook)} end

    field :name,  non_null(:string),
      description: "the name in your SCM provider for this webhook",
      resolve: fn hook, _, _ -> {:ok, ScmWebhook.name(hook)} end

    timestamps()
  end

  @desc "A representation to a service which configures renovate for a scm connection"
  object :dependency_management_service do
    field :id,         non_null(:id)
    field :connection, :scm_connection, resolve: dataloader(Deployments)
    field :service,    :service_deployment, resolve: dataloader(Deployments)

    timestamps()
  end

  @desc "An observer is a mechanism to poll an external helm, oci or other datasources and perform a list of actions in response"
  object :observer do
    field :id,          non_null(:id)
    field :name,        non_null(:string)
    field :status,      non_null(:observer_status)
    field :crontab,     non_null(:string)
    field :last_value,  :string
    field :last_run_at, non_null(:datetime)
    field :next_run_at, non_null(:datetime)
    field :target,      non_null(:observer_target)
    field :actions,     list_of(:observer_action)

    field :project, :project, resolve: dataloader(Deployments)
    field :errors,  list_of(:service_error), resolve: dataloader(Deployments)

    timestamps()
  end

  @desc "A spec for a target to poll"
  object :observer_target do
    field :type,   non_null(:observer_target_type)
    field :target, non_null(:observer_target_type), resolve: fn
      %{type: t}, _, _ -> {:ok, t}
    end, description: "present for backwards compat, use `type` instead"

    @desc """
    a regex for extracting the target value, useful in cases where a semver is nested
    in a larger release string.  The first capture group is the substring that is used for the value.
    """
    field :format, :string
    field :order,  non_null(:observer_target_order), description: "the order in which polled results are applied, defaults to SEMVER"

    field :helm,   :observer_helm_repo
    field :oci,    :observer_oci_repo
    field :git,    :observer_git_repo
  end

  @desc "A spec of an action that can be taken in response to an observed entity"
  object :observer_action do
    field :type, non_null(:observer_action_type)
    field :configuration, non_null(:observer_action_configuration)
  end

  @desc "a spec for querying a helm in an observer"
  object :observer_helm_repo do
    field :url,      non_null(:string)
    field :chart,    non_null(:string)
    field :provider, :helm_auth_provider
  end

  @desc "a spec for querying a oci repository in an observer"
  object :observer_oci_repo do
    field :url,      non_null(:string)
    field :provider, :helm_auth_provider
  end

  @desc "a spec for polling a git repository for recent updates"
  object :observer_git_repo do
    field :repository_id, non_null(:id)
    field :type,          non_null(:observer_git_target_type),
      description: "the resource within the git repository you want to poll"
    field :filter,        :observer_git_filter
  end

  @desc "a spec for filtering a git repository tags in an observer"
  object :observer_git_filter do
    field :regex, :string, description: "a regex to filter the git repository tags for the observed value"
  end

  @desc "configuration for an observer action"
  object :observer_action_configuration do
    field :pr,       :observer_pr_action
    field :pipeline, :observer_pipeline_action
  end

  @desc "Configuration for sending a pr in response to an observer"
  object :observer_pr_action do
    field :automation_id,   non_null(:id)
    field :repository,      :string
    field :branch_template, :string, description: "a template to use for the created branch, use $value to interject the observed value"
    field :context,         non_null(:map), description: "the context to apply, use $value to interject the observed value"
  end

  @desc "Configuration for setting a pipeline context in an observer"
  object :observer_pipeline_action do
    field :pipeline_id, non_null(:id)
    field :context,     non_null(:map), description: "the context to apply, use $value to interject the observed value"
  end

  @desc "Configuration for http proxy usage in connections to Git or SCM providers"
  object :http_proxy_configuration do
    field :url, non_null(:string)
  end


  @desc "A catalog is an organized collection of PR Automations used for permissioning and discovery"
  object :catalog do
    field :id,          non_null(:id)
    field :name,        non_null(:string)
    field :description, :string, description: "longform description for the purpose of this catalog"
    field :category,    :string, description: "short category name used for browsing catalogs"
    field :author,      :string, description: "the name of the author of this catalog"

    field :icon,      :string, description: "an icon url to use for this catalog"
    field :dark_icon, :string, description: "a darkmode icon url to use for this catalog"

    field :project, :project, resolve: dataloader(Deployments)

    field :read_bindings,  list_of(:policy_binding),
      resolve: dataloader(Deployments),
      description: "read policy for this catalog"
    field :write_bindings, list_of(:policy_binding),
      resolve: dataloader(Deployments),
      description: "write policy for this catalog"
    field :create_bindings, list_of(:policy_binding),
      resolve: dataloader(Deployments),
      description: "create policy for this catalog, can give permission to just create prs"

    timestamps()
  end

  @desc "A governance controller is a mechanism to enforce a set of rules on a set of PRs"
  object :pr_governance do
    field :id,            non_null(:id)
    field :name,          non_null(:string)
    field :connection,    :scm_connection, resolve: dataloader(Deployments)
    field :configuration, :pr_governance_configuration

    timestamps()
  end

  @desc "The configuration for a pr governance controller"
  object :pr_governance_configuration do
    field :webhook, :governance_webhook
  end

  @desc "The webhook configuration for a pr governance controller"
  object :governance_webhook do
    field :url, non_null(:string)
  end

  connection node_type: :git_repository
  connection node_type: :helm_repository
  connection node_type: :scm_connection
  connection node_type: :pr_automation
  connection node_type: :pull_request
  connection node_type: :scm_webhook
  connection node_type: :dependency_management_service
  connection node_type: :observer
  connection node_type: :catalog

  delta :git_repository

  object :git_queries do
    field :git_repository, :git_repository do
      middleware Authenticated
      arg :id,  :id
      arg :url, :string

      resolve &Deployments.resolve_git/2
    end

    connection field :git_repositories, node_type: :git_repository do
      middleware Authenticated

      resolve &Deployments.list_git_repositories/2
    end

    connection field :helm_repositories, node_type: :helm_repository do
      middleware Authenticated

      resolve &Deployments.list_helm_repositories/2
    end

    field :helm_repository, :helm_repository do
      middleware Authenticated
      arg :url, non_null(:string)

      resolve &Deployments.resolve_helm_repository/2
    end

    field :flux_helm_repositories, list_of(:flux_helm_repository) do
      middleware Authenticated

      resolve &Deployments.list_flux_helm_repositories/2
    end

    field :flux_helm_repository, :flux_helm_repository do
      middleware Authenticated
      arg :name,      non_null(:string)
      arg :namespace, non_null(:string)

      resolve &Deployments.get_flux_helm_repository/2
    end

    connection field :scm_connections, node_type: :scm_connection do
      middleware Authenticated

      resolve &Deployments.list_scm_connections/2
    end

    field :scm_connection, :scm_connection do
      middleware Authenticated
      arg :id,   :id
      arg :name, :string

      resolve &Deployments.resolve_scm_connection/2
    end

    connection field :pr_automations, node_type: :pr_automation do
      middleware Authenticated
      arg :catalog_id, :id
      arg :project_id, :id
      arg :q,          :string
      arg :role,       :pr_role

      resolve &Deployments.list_pr_automations/2
    end

    field :pr_automation, :pr_automation do
      middleware Authenticated
      arg :id,   :id
      arg :name, :string

      resolve &Deployments.resolve_pr_automation/2
    end

    field :pr_governance, :pr_governance do
      middleware Authenticated
      arg :id, :id
      arg :name, :string

      resolve &Deployments.resolve_pr_governance/2
    end

    connection field :pull_requests, node_type: :pull_request do
      middleware Authenticated
      arg :cluster_id, :id
      arg :service_id, :id
      arg :open,       :boolean
      arg :q,          :string

      resolve &Deployments.list_pull_requests/2
    end

    field :scm_webhook, :scm_webhook do
      middleware Authenticated
      arg :id,   :id
      arg :external_id, :string

      resolve &Deployments.resolve_scm_webhook/2
    end

    connection field :scm_webhooks, node_type: :scm_webhook do
      middleware Authenticated

      resolve &Deployments.list_scm_webhooks/2
    end

    connection field :dependency_management_services, node_type: :dependency_management_service do
      middleware Authenticated

      resolve &Deployments.list_dependency_management_services/2
    end

    field :observer, :observer do
      middleware Authenticated
      arg :id,   :id
      arg :name, :string

      resolve &Deployments.resolve_observer/2
    end

    connection field :observers, node_type: :observer do
      middleware Authenticated
      arg :project_id, :id

      resolve &Deployments.list_observers/2
    end

    field :catalog, :catalog do
      middleware Authenticated
      arg :id,   :id
      arg :name, :string

      resolve &Deployments.resolve_catalog/2
    end

    connection field :catalogs, node_type: :catalog do
      middleware Authenticated
      arg :project_id, :id

      resolve &Deployments.list_catalogs/2
    end
  end

  object :git_mutations do
    field :create_git_repository, :git_repository do
      middleware Authenticated
      arg :attributes, non_null(:git_attributes)

      safe_resolve &Deployments.create_git_repository/2
    end

    field :update_git_repository, :git_repository do
      middleware Authenticated
      arg :id,         non_null(:id)
      arg :attributes, non_null(:git_attributes)

      safe_resolve &Deployments.update_git_repository/2
    end

    field :delete_git_repository, :git_repository do
      middleware Authenticated
      arg :id, non_null(:id)

      safe_resolve &Deployments.delete_git_repository/2
    end

    field :create_scm_connection, :scm_connection do
      middleware Authenticated
      arg :attributes, non_null(:scm_connection_attributes)

      safe_resolve &Deployments.create_scm_connection/2
    end

    field :update_scm_connection, :scm_connection do
      middleware Authenticated
      arg :id,         non_null(:id)
      arg :attributes, non_null(:scm_connection_attributes)

      safe_resolve &Deployments.update_scm_connection/2
    end

    field :delete_scm_connection, :scm_connection do
      middleware Authenticated
      arg :id, non_null(:id)

      safe_resolve &Deployments.delete_scm_connection/2
    end

    field :create_scm_webhook, :scm_webhook do
      middleware Authenticated
      arg :connection_id, non_null(:id)
      arg :owner,         non_null(:string)

      safe_resolve &Deployments.create_webhook_for_connection/2
    end

    field :delete_scm_webhook, :scm_webhook do
      middleware Authenticated
      arg :id, non_null(:id)

      safe_resolve &Deployments.delete_scm_webhook/2
    end

    @desc "creates a webhook reference in our system but doesn't attempt to create it in your upstream provider"
    field :create_scm_webhook_pointer, :scm_webhook do
      middleware Authenticated
      arg :attributes, non_null(:scm_webhook_attributes)

      resolve &Deployments.create_webhook/2
    end

    field :create_pr_automation, :pr_automation do
      middleware Authenticated
      arg :attributes, non_null(:pr_automation_attributes)

      safe_resolve &Deployments.create_pr_automation/2
    end

    field :update_pr_automation, :pr_automation do
      middleware Authenticated
      arg :id,         non_null(:id)
      arg :attributes, non_null(:pr_automation_attributes)

      safe_resolve &Deployments.update_pr_automation/2
    end

    field :delete_pr_automation, :pr_automation do
      middleware Authenticated
      arg :id, non_null(:id)

      safe_resolve &Deployments.delete_pr_automation/2
    end

    @desc "upserts a governance controller"
    field :upsert_pr_governance, :pr_governance do
      middleware Authenticated
      arg :attributes, non_null(:pr_governance_attributes)

      safe_resolve &Deployments.upsert_pr_governance/2
    end

    @desc "deletes a governance controller"
    field :delete_pr_governance, :pr_governance do
      middleware Authenticated
      arg :id, non_null(:id)

      safe_resolve &Deployments.delete_pr_governance/2
    end

    @desc "creates the service to enable self-hosted renovate in one pass"
    field :setup_renovate, :service_deployment do
      middleware Authenticated
      arg :connection_id, non_null(:id)
      arg :repos,         list_of(:string)
      arg :name,          :string, description: "the name of the owning service"
      arg :namespace,     :string, description: "the namespace of the owning service"

      safe_resolve &Deployments.setup_renovate/2
    end

    field :reconfigure_renovate, :service_deployment do
      middleware Authenticated
      arg :repos,      list_of(:string)
      arg :service_id, non_null(:id)

      safe_resolve &Deployments.reconfigure_renovate/2
    end

    field :create_pull_request, :pull_request do
      middleware Authenticated
      middleware Scope, api: "createPullRequest"
      arg :id,         :id, description: "the id of the PR automation instance to use"
      arg :name,       :string, description: "the name of the PR automation instance to use"
      arg :identifier, :string
      arg :branch,     :string
      arg :context,    :json
      arg :secrets,    :json
      arg :thread_id,  :id, description: "a ai thread id this pr was spawned from, for associating with agentic workflows"

      safe_resolve &Deployments.create_pull_request/2
    end

    @desc "just registers a pointer record to a PR after it was created externally be some other automation"
    field :create_pull_request_pointer, :pull_request do
      middleware Authenticated
      middleware Scope, api: "createPullRequestPointer"
      arg :attributes, :pull_request_attributes

      safe_resolve &Deployments.create_pr/2
    end

    field :update_pull_request, :pull_request do
      middleware Authenticated
      arg :id,         non_null(:id)
      arg :attributes, :pull_request_update_attributes

      safe_resolve &Deployments.update_pr/2
    end

    field :delete_pull_request, :pull_request do
      middleware Authenticated
      arg :id, non_null(:id)

      safe_resolve &Deployments.delete_pr/2
    end

    field :upsert_helm_repository, :helm_repository do
      middleware Authenticated
      arg :url,        non_null(:string)
      arg :attributes, :helm_repository_attributes

      safe_resolve &Deployments.upsert_helm_repository/2
    end

    field :upsert_observer, :observer do
      middleware Authenticated
      arg :attributes, :observer_attributes

      resolve &Deployments.upsert_observer/2
    end

    field :delete_observer, :observer do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.delete_observer/2
    end

    field :kick_observer, :observer do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.kick_observer/2
    end

    field :reset_observer, :observer do
      middleware Authenticated
      arg :id, non_null(:id)
      arg :attributes, non_null(:observer_reset_attributes)

      resolve &Deployments.reset_observer/2
    end

    field :upsert_catalog, :catalog do
      middleware Authenticated
      arg :attributes, :catalog_attributes

      resolve &Deployments.upsert_catalog/2
    end

    field :delete_catalog, :catalog do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.delete_catalog/2
    end

    field :register_github_app, :scm_connection do
      middleware Authenticated
      arg :name, non_null(:string)
      arg :installation_id, non_null(:string)

      resolve &Deployments.register_github_app/2
    end
  end
end
