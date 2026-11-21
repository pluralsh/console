defmodule Console.GraphQl.Deployments.Devbox do
  use Console.GraphQl.Schema.Base
  alias Console.Schema.{
    Devbox,
    DevboxInstance,
    DevboxInstanceSession,
    DevboxInstanceInteraction,
    DevboxSnapshot,
    PullRequest,
    AgentCredential
  }
  alias Console.GraphQl.Resolvers.{Deployments, User}

  ecto_enum :devbox_status, Devbox.Status
  ecto_enum :devbox_agent_type, Devbox.AgentType
  ecto_enum :devbox_probe_status, Devbox.ProbeStatus
  ecto_enum :devbox_instance_status, DevboxInstance.Status
  ecto_enum :devbox_foreground_state, DevboxInstance.ForegroundState
  ecto_enum :devbox_snapshot_fidelity, DevboxInstance.Fidelity
  ecto_enum :devbox_thread_kind, DevboxInstanceSession.Kind
  ecto_enum :devbox_thread_status, DevboxInstanceSession.Status
  ecto_enum :devbox_interaction_kind, DevboxInstanceInteraction.Kind
  ecto_enum :devbox_interaction_state, DevboxInstanceInteraction.State
  ecto_enum :devbox_snapshot_status, DevboxSnapshot.Status
  ecto_enum :pull_request_source, PullRequest.Source
  ecto_enum :devbox_cloud_provider, Devbox.CloudProvider
  ecto_enum :devbox_autonomy, Devbox.Autonomy
  ecto_enum :agent_credential_provider, AgentCredential.Provider
  ecto_enum :agent_credential_kind, AgentCredential.Kind
  ecto_enum :agent_credential_status, AgentCredential.Status

  enum :devbox_billing_mode do
    value :proxy, description: "billed through the Plural AI proxy against the workbench budget"
    value :subscription, description: "billed to the instance owner's linked subscription"
  end

  enum :devbox_thread_stage do
    value :running,      description: "a turn is in flight or queued"
    value :needs_review, description: "the agent is waiting on a person to answer a permission request or question"
    value :completed,    description: "the last turn finished or failed, or the thread was closed"
  end

  enum :devbox_queued_prompt_action do
    value :edit,     description: "replace the prompt's text"
    value :cancel,   description: "drop the prompt from the queue"
    value :send_now, description: "run the prompt next, stopping the current turn"
  end

  enum :devbox_stream_kind do
    value :terminal
    value :vnc
    value :preview
  end

  enum :devbox_snippet_format do
    value :terraform
    value :cli
  end

  enum :devbox_entity_type do
    value :user_message
    value :agent_message
    value :agent_thought
    value :session_message
    value :tool_call
    value :plan
    value :terminal
    value :compaction
    value :unknown
  end

  enum :devbox_delta_op do
    value :append, description: "a chunk appended to an entity, e.g. message text"
    value :patch, description: "an ACP upsert patch: omitted fields unchanged, null clears, values replace"
    value :notice, description: "a live-only notice, never stored in the transcript"
    value :state, description: "session state: config options, available commands, session info or usage"
    value :settle, description: "the entity settled, `entity` holds its final revision"
    value :pull_request, description: "a pull request was created from the thread"
  end

  enum :devbox_content_block_type do
    value :text
    value :image
    value :audio
    value :resource
    value :resource_link
    value :unknown
  end

  enum :devbox_tool_call_content_type do
    value :content
    value :diff
    value :terminal
    value :unknown
  end

  enum :devbox_lease_kind do
    value :viewer
    value :deferral
  end

  enum :devbox_elicitation_action do
    value :accept
    value :decline
    value :cancel
  end

  input_object :devbox_attributes do
    field :name,                 non_null(:string), description: "the name of the DevboxRunner"
    field :cluster_id,           :id, description: "the cluster this box runs on (required for user-authenticated upserts)"
    field :image,                :string, description: "the box image as specified on the DevboxRunner"
    field :resolved_image,       :string, description: "the image pinned by digest"
    field :template_revision,    :string, description: "the golden template revision instances boot from"
    field :status,               :devbox_status
    field :resources,            :json, description: "the resources for each instance"
    field :allowed_repositories, list_of(:string), description: "repositories instances may check out, all if unset"
    field :max_instances,        :integer, description: "the most live instances this box may run at once"
    field :browser,              :boolean, description: "whether instances get a browser sidecar"
    field :scm_connections,      list_of(:string), description: "names of the scm connections instances may use"
    field :agents,               list_of(:devbox_agent_attributes), description: "the probed agent catalog"
    field :http_allowlist,       list_of(:devbox_http_allow_attributes), description: "hosts instances may reach"
    field :idle_policy,          :devbox_idle_policy_attributes
    field :autonomy,             :devbox_autonomy_attributes
    field :conditions,           list_of(:devbox_condition_attributes)
    field :cloud_identities,     list_of(:devbox_cloud_identity_attributes),
      description: "cloud identities instances get workload identity tokens for"
    field :create_bindings,      list_of(:agent_binding_attributes),
      description: "who may attach this box to a workbench and start instances on it, falling back to the global create policy if empty"
  end

  input_object :devbox_cloud_identity_attributes do
    field :name,                       non_null(:string)
    field :provider,                   non_null(:devbox_cloud_provider)
    field :default,                    :boolean
    field :role_arn,                   :string, description: "aws: the role to assume with the token"
    field :duration_seconds,           :integer, description: "token lifetime, at most an hour"
    field :workload_identity_provider, :string,
      description: "gcp: projects/<number>/locations/global/workloadIdentityPools/<pool>/providers/<provider>"
    field :service_account,            :string, description: "gcp: the service account to impersonate"
    field :tenant_id,                  :string, description: "azure: the Entra ID tenant"
    field :client_id,                  :string, description: "azure: the application (client) id"
    field :authority_host,             :string, description: "azure: the authority host, for sovereign clouds"
  end

  input_object :devbox_agent_attributes do
    field :type,                 non_null(:devbox_agent_type)
    field :default,              :boolean, description: "whether this is the box's default agent (exactly one must be)"
    field :adapter_name,         :string
    field :adapter_version,      :string
    field :adapter_pin,          :string
    field :protocol_version,     :integer, description: "the negotiated ACP protocol version"
    field :acp_v2,               :boolean
    field :capabilities,         :json, description: "the verbatim agentCapabilities from initialize"
    field :allowed_models,       list_of(:string), description: "the DevboxRunner's model allowlist"
    field :default_model,        :string
    field :current_model,        :string, description: "the agent's own current model in a fresh session"
    field :model_switchable,     :boolean
    field :probe_status,         :devbox_probe_status
    field :probe_error,          :string
    field :models,               list_of(:devbox_model_attributes), description: "values of the model config option"
    field :commands,             list_of(:devbox_command_attributes), description: "the commands of a fresh session"
    field :config_options,       list_of(:devbox_config_option_attributes), description: "config options of a fresh session"
    field :session_capabilities, :devbox_session_capabilities_attributes
  end

  input_object :devbox_model_attributes do
    field :id,          non_null(:string)
    field :name,        :string
    field :description, :string
  end

  input_object :devbox_command_attributes do
    field :name,        non_null(:string)
    field :description, :string
    field :input_hint,  :string
  end

  input_object :devbox_config_option_attributes do
    field :config_id,     non_null(:string)
    field :name,          :string
    field :description,   :string
    field :category,      :string
    field :type,          :string
    field :current_value, :string
    field :options,       list_of(:devbox_config_value_option_attributes)
  end

  input_object :devbox_config_value_option_attributes do
    field :value,       non_null(:string)
    field :name,        :string
    field :description, :string
    field :group,       :string
  end

  input_object :devbox_session_capabilities_attributes do
    field :list,   :boolean
    field :resume, :boolean
    field :load,   :boolean
    field :close,  :boolean
    field :delete, :boolean
    field :fork,   :boolean
  end

  input_object :devbox_http_allow_attributes do
    field :host,        non_null(:string)
    field :port,        :integer
    field :passthrough, :boolean
  end

  input_object :devbox_autonomy_attributes do
    field :default, :devbox_autonomy, description: "the level new threads start at"
    field :max,     :devbox_autonomy, description: "the highest level a thread may use"
  end

  input_object :devbox_idle_policy_attributes do
    field :activity_window,      :integer, description: "seconds"
    field :cpu_threshold,        :float
    field :grace_period,         :integer, description: "seconds"
    field :max_deferral,         :integer, description: "seconds"
    field :max_continuous_awake, :integer, description: "seconds"
    field :complete_after,       :integer, description: "seconds"
  end

  input_object :devbox_condition_attributes do
    field :type,    non_null(:string)
    field :status,  non_null(:string)
    field :reason,  :string
    field :message, :string
  end

  input_object :devbox_heartbeat_attributes do
    field :status,            :devbox_status
    field :resolved_image,    :string
    field :template_revision, :string
    field :conditions,        list_of(:devbox_condition_attributes)
  end

  input_object :devbox_config_value_attributes do
    field :config_id, non_null(:string), description: "the ACP config option id"
    field :value,     non_null(:string)
  end

  input_object :devbox_instance_attributes do
    field :devbox_id,           :id, description: "the attached box to start (defaults to the snapshot's box when restoring)"
    field :snapshot_id,         :id, description: "a ready snapshot to restore from"
    field :name,                :string
    field :agent,               :devbox_agent_type, description: "defaults to the box's default agent"
    field :model,               :string, description: "defaults to the agent's default model"
    field :repositories,        list_of(:string), description: "defaults to the workbench's coding repositories allowed on the box"
    field :config_options,      list_of(:devbox_config_value_attributes), description: "initial values for other config options"
    field :max_running_threads, :integer
    field :agent_billing,       list_of(:devbox_agent_billing_attributes),
      description: "how each agent is billed, defaults to your credentials marked default where the workbench allows it, otherwise the AI proxy"
  end

  input_object :devbox_agent_billing_attributes do
    field :agent,               non_null(:devbox_agent_type)
    field :billing,             non_null(:devbox_billing_mode)
    field :allow_collaborators, :boolean, description: "let other workbench users prompt this agent on your subscription"
  end

  input_object :agent_credential_attributes do
    field :kind,            non_null(:agent_credential_kind)
    field :secret,          non_null(:string), description: "the setup-token, auth.json contents or access token, write-only"
    field :label,           :string
    field :expires_at,      :datetime, description: "when the access token expires, for expiry warnings"
    field :default_billing, :boolean, description: "bill new instances' agents of this provider to it by default"
  end

  input_object :devbox_snapshot_attributes do
    field :name, :string
  end

  input_object :devbox_prompt_block_attributes do
    field :type,      non_null(:devbox_content_block_type)
    field :text,      :string
    field :data,      :string, description: "base64 data for images and audio"
    field :mime_type, :string
    field :uri,       :string
    field :name,      :string
  end

  input_object :devbox_thread_attributes do
    field :agent,          :devbox_agent_type, description: "defaults to the instance's agent"
    field :model,          :string
    field :config_options, list_of(:devbox_config_value_attributes)
    field :cwd,            :string, description: "~ or ~/<repository>"
    field :worktree_repos, list_of(:string), description: "repositories to give the thread its own worktree of"
    field :title,          :string
    field :prompt,         :string, description: "an optional first prompt"
    field :content,        list_of(:devbox_prompt_block_attributes), description: "an optional first prompt, as content blocks"
  end

  input_object :devbox_import_attributes do
    field :agent,      non_null(:devbox_agent_type)
    field :session_id, non_null(:string), description: "the agent's session id, from devboxImportableSessions"
    field :title,      :string
    field :cwd,        :string
  end

  input_object :devbox_interaction_response_attributes do
    field :option_id, :string, description: "the selected option of a permission request"
    field :cancelled, :boolean, description: "cancel a permission request"
    field :action,    :devbox_elicitation_action, description: "the answer to an elicitation"
    field :content,   :json, description: "form content for an accepted form elicitation"
  end

  object :devbox do
    field :id,                   non_null(:id)
    field :name,                 non_null(:string)
    field :image,                :string
    field :resolved_image,       :string
    field :template_revision,    :string
    field :status,               :devbox_status
    field :resources,            :map
    field :allowed_repositories, list_of(:string)
    field :max_instances,        :integer
    field :browser,              :boolean
    field :last_heartbeat_at,    :datetime
    field :agents,               list_of(:devbox_agent)
    field :http_allowlist,       list_of(:devbox_http_allow)
    field :idle_policy,          :devbox_idle_policy, resolve: fn devbox, _, _ -> {:ok, Devbox.idle_policy(devbox)} end
    field :autonomy,             non_null(:devbox_autonomy_policy),
      description: "how agents' permission requests are answered",
      resolve: fn devbox, _, _ -> {:ok, Devbox.autonomy(devbox)} end
    field :decision_review,      :boolean,
      description: "whether agents billed to the AI proxy can run at autonomy auto, reviewed by a decision model",
      resolve: fn _, _, _ -> {:ok, Console.Devboxes.decision_review?()} end
    field :conditions,           list_of(:devbox_condition)

    field :cloud_identities, list_of(:devbox_cloud_identity)

    field :cluster,         :cluster, resolve: dataloader(Deployments)
    field :scm_connections, list_of(:scm_connection), resolve: dataloader(Deployments)
    field :create_bindings, list_of(:policy_binding), resolve: dataloader(Deployments),
      description: "who may attach this box to a workbench and start instances on it"

    @desc "the box's workload identity issuer and how to trust it from cloud accounts"
    field :workload_identity, :devbox_workload_identity, resolve: &Deployments.devbox_workload_identity/3

    timestamps()
  end

  object :devbox_cloud_identity do
    field :name,                       non_null(:string)
    field :provider,                   non_null(:devbox_cloud_provider)
    field :default,                    :boolean
    field :role_arn,                   :string
    field :duration_seconds,           :integer
    field :workload_identity_provider, :string
    field :service_account,            :string
    field :tenant_id,                  :string
    field :client_id,                  :string
    field :authority_host,             :string
  end

  object :devbox_workload_identity do
    field :issuer_url, non_null(:string), description: "the OIDC issuer cloud accounts federate with"
    field :subject,    non_null(:string), description: "the sub claim of every token from this box"
    field :audiences,  list_of(:string), description: "audiences the box can mint tokens for"
    field :snippets,   list_of(:devbox_trust_snippet)
  end

  object :devbox_trust_snippet do
    field :provider, non_null(:devbox_cloud_provider)
    field :format,   non_null(:devbox_snippet_format)
    field :title,    non_null(:string)
    field :content,  non_null(:string)
  end

  object :devbox_agent do
    field :type,                 non_null(:devbox_agent_type)
    field :default,              :boolean
    field :adapter_name,         :string
    field :adapter_version,      :string
    field :protocol_version,     :integer
    field :acp_v2,               :boolean
    field :capabilities,         :map
    field :model_switchable,     :boolean
    field :probe_status,         :devbox_probe_status
    field :probe_error,          :string
    field :commands,             list_of(:devbox_command)
    field :config_options,       list_of(:devbox_config_option)
    field :session_capabilities, :devbox_session_capabilities

    field :models, list_of(:devbox_model),
      description: "the models offered under a billing mode (proxy by default): the AI proxy's models, or on a subscription the probed values narrowed by the box's allowlist" do
      arg :billing, :devbox_billing_mode
      resolve &Deployments.offered_models/3
    end
    field :default_model, :string,
      description: "the model preselected when starting an instance under a billing mode (proxy by default)" do
      arg :billing, :devbox_billing_mode
      resolve &Deployments.devbox_default_model/3
    end
  end

  object :devbox_model do
    field :id,          non_null(:string)
    field :name,        :string
    field :description, :string
  end

  object :devbox_command do
    field :name,        non_null(:string)
    field :description, :string
    field :input_hint,  :string
  end

  object :devbox_config_option do
    field :config_id,     non_null(:string), description: "the ACP config option id"
    field :name,          :string
    field :description,   :string
    field :category,      :string, description: "model, mode, thought_level, ..."
    field :type,          :string
    field :current_value, :string
    field :options,       list_of(:devbox_config_option_value)
  end

  object :devbox_config_option_value do
    field :value,       non_null(:string)
    field :name,        :string
    field :description, :string
    field :group,       :string
  end

  object :devbox_session_capabilities do
    field :list,   :boolean
    field :resume, :boolean
    field :load,   :boolean
    field :close,  :boolean
    field :delete, :boolean
    field :fork,   :boolean
  end

  object :devbox_http_allow do
    field :host,        non_null(:string)
    field :port,        :integer
    field :passthrough, :boolean
  end

  object :devbox_autonomy_policy do
    field :default, non_null(:devbox_autonomy), description: "the level new threads start at"
    field :max,     non_null(:devbox_autonomy), description: "the highest level a thread may use"
  end

  object :devbox_idle_policy do
    field :activity_window,      :integer
    field :cpu_threshold,        :float
    field :grace_period,         :integer
    field :max_deferral,         :integer
    field :max_continuous_awake, :integer
    field :complete_after,       :integer
  end

  object :devbox_condition do
    field :type,    non_null(:string)
    field :status,  non_null(:string)
    field :reason,  :string
    field :message, :string
  end

  object :devbox_probe_token do
    field :token,      non_null(:string)
    field :expires_at, non_null(:datetime)
  end

  object :devbox_instance do
    field :id,                  non_null(:id)
    field :name,                :string
    field :agent,               :devbox_agent_type
    field :requested_model,     :string
    field :repositories,        list_of(:string)
    field :config_options,      :map, description: "initial config option values, by config id"
    field :max_running_threads, :integer
    field :status,              non_null(:devbox_instance_status)
    field :status_reason,       :string
    field :template_revision,   :string
    field :image_digest,        :string
    field :restore_fidelity,    :devbox_snapshot_fidelity,
      description: "filesystem if the box's template changed since the snapshot, so the instance cold-boots"
    field :foreground_state,    :devbox_foreground_state, description: "requires_action if any thread needs you"
    field :running_threads,     :integer
    field :waiting_threads,     :integer
    field :keep_awake_until,    :datetime
    field :awake_since,         :datetime
    field :started_at,          :datetime
    field :suspended_at,        :datetime
    field :completed_at,        :datetime
    field :last_activity_at,    :datetime
    field :agent_connections,   list_of(:devbox_agent_connection)
    field :checkouts,           list_of(:devbox_checkout)
    field :idle_state,          :devbox_idle_state

    field :viewer_count, :integer, resolve: &Deployments.devbox_viewer_count/3
    field :leases, list_of(:devbox_lease), resolve: &Deployments.devbox_leases/3
    field :agent_billing, list_of(:devbox_agent_billing), resolve: &Deployments.devbox_agent_billing/3

    field :workbench,     :workbench, resolve: dataloader(Deployments)
    field :devbox,        :devbox, resolve: dataloader(Deployments)
    field :snapshot,      :devbox_snapshot, resolve: dataloader(Deployments)
    field :user,          :user, resolve: dataloader(User)
    field :keep_awake_by, :user, resolve: dataloader(User)

    field :threads, list_of(:devbox_thread) do
      arg :include_deleted, :boolean
      arg :stages,          list_of(:devbox_thread_stage), description: "only threads in these stages"
      resolve &Deployments.devbox_instance_threads/3
    end

    field :interactions, list_of(:devbox_interaction) do
      arg :pending, :boolean
      resolve &Deployments.devbox_instance_interactions/3
    end

    timestamps()
  end

  object :devbox_agent_connection do
    field :agent,            :devbox_agent_type
    field :protocol_version, :integer
    field :adapter_name,     :string
    field :adapter_version,  :string
    field :capabilities,     :map
    field :billing,          :string, description: "proxy or subscription"
  end

  object :devbox_agent_billing do
    field :agent,               :devbox_agent_type
    field :billing,             :devbox_billing_mode
    field :credential_kind,     :string
    field :allow_collaborators, :boolean
  end

  object :devbox_stream do
    field :stream_id,    non_null(:string)
    field :kind,         non_null(:devbox_stream_kind)
    field :url,          non_null(:string), description: "the websocket to connect to"
    field :token,        non_null(:string), description: "a short-lived bearer token for the websocket"
    field :expires_at,   :datetime, description: "connect before this"
    field :subprotocols, list_of(:string)
    field :terminal_id,  :string
  end

  object :devbox_file_entry do
    field :path,           non_null(:string)
    field :name,           :string
    field :type,           :string, description: "file, directory, symlink or other"
    field :size,           :long
    field :mode,           :integer
    field :modified_at,    :datetime
    field :symlink_target, :string
    field :repository,     :string, description: "the checkout containing the file"
    field :git_status,     :string, description: "the porcelain git status, e.g. \" M\" or \"??\""
  end

  object :devbox_file do
    field :entry,     :devbox_file_entry
    field :content,   :string, description: "the text content, null for binary files"
    field :sha256,    :string, description: "pass back as expectedSha256 when writing"
    field :truncated, :boolean
    field :mime_type, :string
    field :binary,    :boolean
  end

  object :devbox_file_write do
    field :entry,  :devbox_file_entry
    field :sha256, :string
  end

  object :devbox_repository_changes do
    field :checkout,  :devbox_checkout
    field :base_ref,  :string
    field :base_sha,  :string
    field :additions, :integer
    field :deletions, :integer
    field :files,     list_of(:devbox_file_change)
  end

  object :devbox_file_change do
    field :path,           non_null(:string)
    field :old_path,       :string
    field :status,         :string, description: "added, modified, deleted, renamed, copied, untracked, conflicted or type_changed"
    field :staged,         :boolean
    field :additions,      :integer
    field :deletions,      :integer
    field :binary,         :boolean
    field :diff,           :string
    field :diff_truncated, :boolean
  end

  @desc "A linked coding agent subscription.  The secret is write-only and never returned."
  object :agent_credential do
    field :id,                non_null(:id)
    field :provider,          non_null(:agent_credential_provider)
    field :kind,              non_null(:agent_credential_kind)
    field :label,             :string
    field :status,            non_null(:agent_credential_status)
    field :version,           :long
    field :default_billing,   :boolean
    field :failure_count,     :integer
    field :email,             :string, resolve: fn c, _, _ -> {:ok, (c.metadata || %{})["email"]} end
    field :plan,              :string, resolve: fn c, _, _ -> {:ok, (c.metadata || %{})["plan"]} end
    field :linked_at,         :datetime
    field :expires_at,        :datetime
    field :last_refreshed_at, :datetime
    field :last_used_at,      :datetime

    timestamps()
  end

  object :devbox_checkout do
    field :path,               :string
    field :name,               :string
    field :remote_url,         :string
    field :default_branch,     :string
    field :branch,             :string
    field :head_sha,           :string
    field :dirty,              :boolean
    field :worktree_thread_id, :string
    field :ahead,              :integer
    field :behind,             :integer
  end

  object :devbox_idle_state do
    field :idle,         :boolean
    field :idle_since,   :datetime
    field :suspends_at,  :datetime
    field :busy_reasons, list_of(:map)
    field :message,      :string
  end

  object :devbox_lease do
    field :kind,       non_null(:devbox_lease_kind)
    field :expires_at, non_null(:datetime)
    field :holder,     :user, resolve: fn
      %{holder: %{user_id: id}}, _, _ when is_binary(id) -> {:ok, Console.Services.Users.get_user(id)}
      _, _, _ -> {:ok, nil}
    end
  end

  object :devbox_snapshot do
    field :id,                non_null(:id)
    field :name,              :string
    field :status,            non_null(:devbox_snapshot_status)
    field :fidelity,          :devbox_snapshot_fidelity
    field :size_bytes,        :long
    field :error,             :string
    field :template_revision, :string

    field :workbench, :workbench, resolve: dataloader(Deployments)
    field :devbox,    :devbox, resolve: dataloader(Deployments)
    field :instance,  :devbox_instance, resolve: dataloader(Deployments)
    field :user,      :user, resolve: dataloader(User)

    timestamps()
  end

  @desc "A top-level ACP session console knows about, or (as a subagent) one spawned by it"
  object :devbox_thread do
    field :id,                non_null(:id)
    field :session_id,        :string, description: "the ACP session id, unset while a waiting thread hasn't started",
      resolve: fn s, _, _ -> {:ok, s.acp_session_id} end
    field :kind,              non_null(:devbox_thread_kind)
    field :agent,             :devbox_agent_type
    field :title,             :string, resolve: &Deployments.devbox_thread_title/3
    field :agent_title,       :string, description: "the agent-owned title", resolve: fn s, _, _ -> {:ok, s.title} end
    field :model,             :string, description: "the current model-category config value", resolve: &Deployments.devbox_thread_model/3
    field :cwd,               :string
    field :worktree_repos,    list_of(:string)
    field :status,            non_null(:devbox_thread_status)
    field :stage,             non_null(:devbox_thread_stage), description: "where the thread sits in its lifecycle, for grouping",
      resolve: fn s, _, _ -> {:ok, DevboxInstanceSession.stage(s)} end
    field :imported,          :boolean
    field :last_activity_at,  :datetime
    field :entity_count,      :integer
    field :foreground_state,  :devbox_foreground_state
    field :stop_reason,       :string
    field :error,             :map
    field :background_work,   :map
    field :billing,           :string
    field :revision,          :integer
    field :config_options,    list_of(:devbox_config_option)
    field :available_commands, list_of(:devbox_command)
    field :usage,             :devbox_usage
    field :queued_prompts,    list_of(:devbox_queued_prompt), description: "prompts held until the running turn ends, in the order they'll run"
    field :parent_tool_call_id, :string, description: "for subagents, the parent's tool call that spawned it"

    field :instance,     :devbox_instance, resolve: dataloader(Deployments)
    field :parent,       :devbox_thread, resolve: dataloader(Deployments)
    field :user,         :user, resolve: dataloader(User)
    field :subagents,    list_of(:devbox_thread), description: "subagent sessions spawned by this one",
      resolve: dataloader(Deployments, :children)
    field :interactions, list_of(:devbox_interaction), resolve: dataloader(Deployments)

    timestamps()
  end

  @desc "A prompt sent while the thread was busy, waiting for its turn"
  object :devbox_queued_prompt do
    field :prompt_id,   non_null(:string)
    field :text,        :string
    field :attachments, list_of(:string), description: "names of the files attached to the prompt"
    field :queued_at,   :datetime
  end

  object :devbox_usage do
    field :input_tokens,     :integer
    field :output_tokens,    :integer
    field :cached_tokens,    :integer
    field :reasoning_tokens, :integer
    field :total_tokens,     :integer
    field :context_size,     :integer
    field :context_used,     :integer
    field :total_cost,       :float
    field :currency,         :string
  end

  @desc "A permission request or elicitation from an agent"
  object :devbox_interaction do
    field :id,               non_null(:id)
    field :external_id,      non_null(:string), description: "the daemon-allocated interaction id"
    field :tool_call_id,     :string, description: "set when scoped to a tool call (render it inline)"
    field :kind,             non_null(:devbox_interaction_kind)
    field :state,            non_null(:devbox_interaction_state)
    field :title,            :string
    field :message,          :string
    field :requested_schema, :map, description: "json schema for a form elicitation"
    field :url,              :string, description: "the url of a url elicitation"
    field :options,          list_of(:devbox_permission_option)
    field :response,         :map
    field :answered_at,      :datetime
    field :expires_at,       :datetime

    field :instance,    :devbox_instance, resolve: dataloader(Deployments)
    field :thread,      :devbox_thread, resolve: dataloader(Deployments, :session)
    field :answered_by, :user, resolve: dataloader(User)
    field :answered_by_policy, :string, description: "set when the devbox answered by policy, e.g. autonomy:full"
    field :review,             :devbox_interaction_review, description: "the devbox reviewer's verdict at autonomy auto"

    timestamps()
  end

  @desc "A decision model's review of a permission request at autonomy auto"
  object :devbox_interaction_review do
    field :verdict,    :string, description: "allow, deny or ask"
    field :confidence, :float, description: "the verdict's probability, 0 to 1"
    field :risk,       :string, description: "none, destructive, exfiltration, credentials, out_of_scope or external"
    field :model,      :string, description: "the decision model that answered"
    field :escalation, :string, description: "why a human was still asked, when they were"
  end

  object :devbox_permission_option do
    field :option_id, non_null(:string)
    field :name,      :string
    field :kind,      :string, description: "allow_once, allow_always, reject_once or reject_always"
  end

  object :devbox_importable_session do
    field :agent,      :devbox_agent_type
    field :session_id, non_null(:string)
    field :title,      :string
    field :cwd,        :string
    field :updated_at, :datetime
  end

  object :devbox_session_summary do
    field :session_id,        :string
    field :thread_id,         :string
    field :kind,              :devbox_thread_kind
    field :parent_session_id, :string
    field :agent,             :devbox_agent_type
    field :title,             :string
    field :status,            :devbox_thread_status
    field :foreground_state,  :devbox_foreground_state
    field :last_activity_at,  :datetime
  end

  object :devbox_repository do
    field :path,               :string
    field :name,               :string
    field :remote_url,         :string
    field :default_branch,     :string
    field :branch,             :string
    field :head_sha,           :string
    field :dirty,              :boolean
    field :worktree_thread_id, :string
    field :ahead,              :integer
    field :behind,             :integer
  end

  @desc "A page of a session's transcript, served by the box: settled entities merged with in-flight state"
  object :devbox_timeline do
    field :entities,     list_of(:devbox_entity)
    field :delta_offset, :long, description: "apply live deltas with a greater offset on top of this page"
    field :has_more,     :boolean, description: "more entities lie in the paging direction (older ones, unless paging with after)"
  end

  @desc "An ACP transcript entity, with a typed view for its type and the verbatim ACP JSON in `raw`"
  object :devbox_entity do
    field :id,              :string
    field :session_id,      :string
    field :type,            non_null(:devbox_entity_type)
    field :position,        :long
    field :revision,        :long
    field :settled,         :boolean
    field :created_at,      :datetime
    field :updated_at,      :datetime
    field :raw,             :map
    field :message,         :devbox_message_entity, description: "for user_message, agent_message and agent_thought"
    field :session_message, :devbox_session_message_entity, description: "a message between sessions (e.g. to a subagent)"
    field :tool_call,       :devbox_tool_call
    field :plan,            :devbox_plan
    field :terminal,        :devbox_terminal
    field :compaction,      :devbox_compaction
  end

  object :devbox_message_entity do
    field :message_id, :string
    field :content,    list_of(:devbox_content_block)
    field :prompt_id,  :string
    field :sent_by_id, :string
    field :meta,       :map
  end

  object :devbox_session_message_entity do
    field :message_id,      :string
    field :from_session_id, :string
    field :to_session_id,   :string
    field :content,         list_of(:devbox_content_block)
    field :meta,            :map
  end

  union :devbox_content_block do
    types [
      :devbox_text_content,
      :devbox_image_content,
      :devbox_audio_content,
      :devbox_resource_content,
      :devbox_resource_link_content,
      :devbox_unknown_content
    ]

    resolve_type fn
      %{type: :text}, _ -> :devbox_text_content
      %{type: :image}, _ -> :devbox_image_content
      %{type: :audio}, _ -> :devbox_audio_content
      %{type: :resource}, _ -> :devbox_resource_content
      %{type: :resource_link}, _ -> :devbox_resource_link_content
      _, _ -> :devbox_unknown_content
    end
  end

  object :devbox_text_content do
    field :type,        non_null(:devbox_content_block_type)
    field :text,        :string
    field :annotations, :map
  end

  object :devbox_image_content do
    field :type,      non_null(:devbox_content_block_type)
    field :data,      :string
    field :mime_type, :string
    field :uri,       :string
  end

  object :devbox_audio_content do
    field :type,      non_null(:devbox_content_block_type)
    field :data,      :string
    field :mime_type, :string
  end

  object :devbox_resource_content do
    field :type,      non_null(:devbox_content_block_type)
    field :uri,       :string
    field :mime_type, :string
    field :text,      :string
    field :blob,      :string
  end

  object :devbox_resource_link_content do
    field :type,        non_null(:devbox_content_block_type)
    field :uri,         :string
    field :name,        :string
    field :title,       :string
    field :description, :string
    field :mime_type,   :string
    field :size,        :long
  end

  object :devbox_unknown_content do
    field :type,    non_null(:devbox_content_block_type)
    field :variant, :string, description: "the unrecognized ACP type"
    field :raw,     :map
  end

  object :devbox_tool_call do
    field :tool_call_id, :string
    field :title,        :string
    field :kind,         :string, description: "read, edit, delete, move, search, execute, think, fetch, other, ..."
    field :status,       :string, description: "pending, in_progress, completed or failed"
    field :content,      list_of(:devbox_tool_call_content)
    field :locations,    list_of(:devbox_tool_call_location)
    field :raw_input,    :map
    field :raw_output,   :map
    field :meta,         :map
  end

  union :devbox_tool_call_content do
    types [:devbox_tool_call_block, :devbox_tool_call_diff, :devbox_tool_call_terminal, :devbox_tool_call_unknown]

    resolve_type fn
      %{type: :content}, _ -> :devbox_tool_call_block
      %{type: :diff}, _ -> :devbox_tool_call_diff
      %{type: :terminal}, _ -> :devbox_tool_call_terminal
      _, _ -> :devbox_tool_call_unknown
    end
  end

  object :devbox_tool_call_block do
    field :type,    non_null(:devbox_tool_call_content_type)
    field :content, :devbox_content_block
  end

  object :devbox_tool_call_diff do
    field :type,     non_null(:devbox_tool_call_content_type)
    field :path,     :string
    field :old_text, :string
    field :new_text, :string
  end

  object :devbox_tool_call_terminal do
    field :type,        non_null(:devbox_tool_call_content_type)
    field :terminal_id, :string
  end

  object :devbox_tool_call_unknown do
    field :type,    non_null(:devbox_tool_call_content_type)
    field :variant, :string
    field :raw,     :map
  end

  object :devbox_tool_call_location do
    field :path, :string
    field :line, :integer
  end

  object :devbox_plan do
    field :plan_id, :string
    field :entries, list_of(:devbox_plan_entry)
    field :meta,    :map
  end

  object :devbox_plan_entry do
    field :content,  :string
    field :priority, :string, description: "high, medium or low"
    field :status,   :string, description: "pending, in_progress or completed"
  end

  object :devbox_terminal do
    field :terminal_id, :string
    field :command,     :string
    field :args,        list_of(:string)
    field :cwd,         :string
    field :output,      :string
    field :truncated,   :boolean
    field :exit_code,   :integer
    field :signal,      :string
    field :meta,        :map
  end

  object :devbox_compaction do
    field :compaction_id, :string
    field :status,        :string
    field :summary,       list_of(:devbox_content_block)
    field :meta,          :map
  end

  @desc "A live entity change, never stored"
  object :devbox_entity_change do
    field :instance_id, non_null(:id)
    field :session_id,  :string
    field :thread_id,   :string
    field :entity_type, :devbox_entity_type
    field :entity_id,   :string
    field :position,    :long
    field :op,          non_null(:devbox_delta_op)
    field :state_kind,  :string, description: "for state deltas, which ACP update this is"
    field :payload,     :map, description: "the verbatim ACP chunk, patch, notice or state update"
    field :entity,      :devbox_entity, description: "for settle deltas, the final entity"
    field :offset,      :long
    field :emitted_at,  :datetime
  end

  @desc "The index rows an UpsertInstanceIndex call changed (revision and foreground state only when the instance aggregate changed)"
  enum :devbox_pull_request_job_status do
    value :running
    value :succeeded
    value :failed
  end

  @desc "A pull request a devbox instance is preparing for one of its checkouts (never stored)"
  object :devbox_pull_request_job do
    field :id,          non_null(:id)
    field :instance_id, non_null(:id)
    field :repository,  non_null(:string), description: "the checkout's name or path"
    field :status,      non_null(:devbox_pull_request_job_status)
    field :url,         :string, description: "the pull request, once created"
    field :title,       :string
    field :error,       :string
    field :writer,      :string, description: "who wrote the text: ai_proxy, claude, codex or template"
  end

  object :devbox_index_change do
    field :instance_id,      non_null(:id)
    field :revision,         :long
    field :foreground_state, :devbox_foreground_state
    field :threads,          list_of(:devbox_thread), resolve: fn %{sessions: s}, _, _ -> {:ok, s} end
    field :interactions,     list_of(:devbox_interaction)
  end

  connection node_type: :devbox
  connection node_type: :devbox_instance
  connection node_type: :devbox_snapshot

  delta :devbox_instance
  delta :devbox_thread
  delta :devbox_snapshot
  delta :devbox_entity_change
  delta :devbox_index_change
  delta :devbox_pull_request_job

  object :public_devbox_queries do
    field :devbox, :devbox do
      middleware Authenticated, :cluster
      arg :id,         :id
      arg :name,       :string
      arg :cluster_id, :id

      resolve &Deployments.resolve_devbox/2
    end
  end

  object :public_devbox_mutations do
    field :upsert_devbox, :devbox do
      middleware Authenticated, :cluster
      arg :attributes, non_null(:devbox_attributes)

      resolve &Deployments.upsert_devbox/2
    end

    field :heartbeat_devbox, :devbox do
      middleware ClusterAuthenticated
      arg :id,         non_null(:id)
      arg :attributes, non_null(:devbox_heartbeat_attributes)

      resolve &Deployments.heartbeat_devbox/2
    end

    field :delete_devbox, :devbox do
      middleware Authenticated, :cluster
      arg :id, non_null(:id)

      resolve &Deployments.delete_devbox/2
    end

    field :mint_devbox_probe_token, :devbox_probe_token do
      middleware ClusterAuthenticated
      arg :id, non_null(:id)

      resolve &Deployments.mint_devbox_probe_token/2
    end
  end

  object :devbox_queries do
    connection field :devboxes, node_type: :devbox do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :read
      arg :q,            :string
      arg :cluster_id,   :id
      arg :workbench_id, :id

      resolve &Deployments.list_devboxes/2
    end

    field :devbox_agents, list_of(:devbox_agent) do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :read
      arg :workbench_id, non_null(:id)
      arg :devbox_id,    non_null(:id)

      resolve &Deployments.devbox_agents/2
    end

    field :devbox_instance, :devbox_instance do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :read
      arg :id, non_null(:id)

      resolve &Deployments.devbox_instance/2
    end

    field :devbox_snapshot, :devbox_snapshot do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :read
      arg :id, non_null(:id)

      resolve &Deployments.devbox_snapshot/2
    end

    field :devbox_thread, :devbox_thread do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :read
      arg :id, non_null(:id)

      resolve &Deployments.devbox_thread/2
    end

    field :devbox_instance_commands, list_of(:devbox_command) do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :read
      arg :thread_id, non_null(:id)

      resolve &Deployments.devbox_instance_commands/2
    end

    field :devbox_repositories, list_of(:devbox_repository) do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :read
      arg :instance_id, non_null(:id)

      resolve &Deployments.devbox_repositories/2
    end

    field :devbox_timeline, :devbox_timeline do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :read
      arg :instance_id, non_null(:id)
      arg :session_id,  non_null(:string), description: "the ACP session id of the thread or subagent"
      arg :before,      :long, description: "page backwards from this position; without before or after, the newest page"
      arg :after,       :long, description: "page forwards from this position"
      arg :limit,       :integer

      resolve &Deployments.devbox_timeline/2
    end

    field :devbox_sessions, list_of(:devbox_session_summary) do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :read
      arg :instance_id, non_null(:id)

      resolve &Deployments.devbox_sessions/2
    end

    field :devbox_importable_sessions, list_of(:devbox_importable_session) do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :read
      arg :instance_id, non_null(:id)

      resolve &Deployments.devbox_importable_sessions/2
    end

    @desc "One directory level of an instance's workspace"
    field :devbox_files, list_of(:devbox_file_entry) do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :read
      arg :instance_id, non_null(:id)
      arg :path,        :string, description: "relative to ~, the home directory if unset"

      resolve &Deployments.devbox_files/2
    end

    field :devbox_file, :devbox_file do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :read
      arg :instance_id, non_null(:id)
      arg :path,        non_null(:string)

      resolve &Deployments.devbox_file/2
    end

    @desc "Uncommitted changes of an instance, grouped by repository"
    field :devbox_changes, list_of(:devbox_repository_changes) do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :read
      arg :instance_id,  non_null(:id)
      arg :thread_id,    :id, description: "a thread's worktrees instead of the main checkouts"
      arg :repositories, list_of(:string)
      arg :include_diff, :boolean

      resolve &Deployments.devbox_changes/2
    end

    @desc "Your linked coding agent subscriptions"
    field :agent_credentials, list_of(:agent_credential) do
      middleware Authenticated

      resolve &Deployments.list_agent_credentials/2
    end
  end

  object :devbox_mutations do
    field :attach_devbox, :devbox do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :workbench_id, non_null(:id)
      arg :devbox_id,    non_null(:id)

      resolve &Deployments.attach_devbox/2
    end

    field :detach_devbox, :devbox do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :workbench_id, non_null(:id)
      arg :devbox_id,    non_null(:id)

      resolve &Deployments.detach_devbox/2
    end

    field :create_devbox_instance, :devbox_instance do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :workbench_id, non_null(:id)
      arg :attributes,   non_null(:devbox_instance_attributes)

      resolve &Deployments.create_devbox_instance/2
    end

    field :restore_devbox_snapshot, :devbox_instance do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :id,         non_null(:id), description: "the snapshot to start an instance from"
      arg :attributes, :devbox_instance_attributes

      resolve &Deployments.restore_devbox_snapshot/2
    end

    field :cancel_devbox_instance, :devbox_instance do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :id, non_null(:id)

      resolve &Deployments.cancel_devbox_instance/2
    end

    field :suspend_devbox_instance, :devbox_instance do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :id, non_null(:id)

      resolve &Deployments.suspend_devbox_instance/2
    end

    field :resume_devbox_instance, :devbox_instance do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :id, non_null(:id)

      resolve &Deployments.resume_devbox_instance/2
    end

    @desc "Marks you as viewing an instance (call about every 30s while its tab is visible), which keeps it awake and resumes it if suspended"
    field :ping_devbox_instance, :devbox_instance do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :read
      arg :id, non_null(:id)

      resolve &Deployments.ping_devbox_instance/2
    end

    field :leave_devbox_instance, :devbox_instance do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :read
      arg :id, non_null(:id)

      resolve &Deployments.leave_devbox_instance/2
    end

    @desc "Keeps an instance awake until a time, clamped to the box's maxDeferral and maxContinuousAwake"
    field :keep_devbox_instance_awake, :devbox_instance do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :id,    non_null(:id)
      arg :until, non_null(:datetime)

      resolve &Deployments.keep_devbox_instance_awake/2
    end

    @desc "Starts a pull request for a checkout: the box writes the title, body and commit message, commits and pushes"
    field :create_devbox_pull_request, :devbox_pull_request_job do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :instance_id, non_null(:id)
      arg :repository,  non_null(:string), description: "a checkout's name or path; a thread worktree's path picks that worktree"
      arg :thread_id,   :id, description: "a thread whose recent prompts explain the change"

      resolve &Deployments.create_devbox_pull_request/2
    end

    field :cancel_devbox_keep_awake, :devbox_instance do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :id, non_null(:id)

      resolve &Deployments.cancel_devbox_keep_awake/2
    end

    field :create_devbox_snapshot, :devbox_snapshot do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :instance_id, non_null(:id)
      arg :attributes,  :devbox_snapshot_attributes

      resolve &Deployments.create_devbox_snapshot/2
    end

    field :delete_devbox_snapshot, :devbox_snapshot do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :id, non_null(:id)

      resolve &Deployments.delete_devbox_snapshot/2
    end

    field :create_devbox_thread, :devbox_thread do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :instance_id, non_null(:id)
      arg :attributes,  :devbox_thread_attributes

      resolve &Deployments.create_devbox_thread/2
    end

    field :import_devbox_thread, :devbox_thread do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :instance_id, non_null(:id)
      arg :attributes,  non_null(:devbox_import_attributes)

      resolve &Deployments.import_devbox_thread/2
    end

    field :resume_devbox_thread, :devbox_thread do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :id, non_null(:id)

      resolve &Deployments.resume_devbox_thread/2
    end

    field :close_devbox_thread, :devbox_thread do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :id, non_null(:id)

      resolve &Deployments.close_devbox_thread/2
    end

    field :delete_devbox_thread, :devbox_thread do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :id, non_null(:id)

      resolve &Deployments.delete_devbox_thread/2
    end

    field :fork_devbox_thread, :devbox_thread do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :id,    non_null(:id)
      arg :title, :string

      resolve &Deployments.fork_devbox_thread/2
    end

    field :rename_devbox_thread, :devbox_thread do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :id,    non_null(:id)
      arg :title, non_null(:string)

      resolve &Deployments.rename_devbox_thread/2
    end

    field :prompt_devbox_thread, :devbox_thread do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :id,      non_null(:id)
      arg :prompt,  :string
      arg :content, list_of(:devbox_prompt_block_attributes)
      arg :attachments, list_of(:upload),
        description: "files to attach (at most 10, 24MB in total); they're written into the devbox and linked from the prompt, and images are also sent inline to agents that accept them"

      resolve &Deployments.prompt_devbox_thread/2
    end

    field :cancel_devbox_prompt, :devbox_thread do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :id, non_null(:id)

      resolve &Deployments.cancel_devbox_prompt/2
    end

    field :update_devbox_queued_prompt, :devbox_thread do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :id,        non_null(:id), description: "the thread id"
      arg :prompt_id, non_null(:string)
      arg :action,    non_null(:devbox_queued_prompt_action)
      arg :text,      :string, description: "the new text, for edit"

      resolve &Deployments.update_devbox_queued_prompt/2
    end

    field :set_devbox_thread_config_option, :devbox_thread do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :id,        non_null(:id)
      arg :config_id, non_null(:string)
      arg :value,     non_null(:string)

      resolve &Deployments.set_devbox_thread_config_option/2
    end

    field :respond_devbox_interaction, :devbox_interaction do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :id,       non_null(:id)
      arg :response, non_null(:devbox_interaction_response_attributes)

      resolve &Deployments.respond_devbox_interaction/2
    end

    field :add_devbox_repository, :devbox_instance do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :instance_id, non_null(:id)
      arg :repository,  non_null(:string)

      resolve &Deployments.add_devbox_repository/2
    end

    @desc "Opens a terminal, vnc or preview stream to an instance, returning its websocket url and a short-lived token"
    field :open_devbox_stream, :devbox_stream do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :instance_id, non_null(:id)
      arg :kind,        non_null(:devbox_stream_kind)
      arg :terminal_id, :string, description: "reattach to a terminal, a new one is created if unset"
      arg :port,        :integer, description: "the port to preview"
      arg :url,         :string, description: "for vnc streams, an http(s) url to open in the instance's browser"

      resolve &Deployments.open_devbox_stream/2
    end

    field :write_devbox_file, :devbox_file_write do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :instance_id,     non_null(:id)
      arg :path,            non_null(:string)
      arg :content,         non_null(:string)
      arg :expected_sha256, :string, description: "fail if the file changed since it was read"

      resolve &Deployments.write_devbox_file/2
    end

    @desc "Switches one agent of your instance between the AI proxy and your subscription"
    field :set_devbox_agent_billing, :devbox_instance do
      middleware Authenticated
      middleware Scope, resource: :workbench, action: :write
      arg :instance_id, non_null(:id)
      arg :attributes,  non_null(:devbox_agent_billing_attributes)

      resolve &Deployments.set_devbox_agent_billing/2
    end

    @desc "Links (or relinks) your coding agent subscription, verifying it once with the vendor"
    field :link_agent_credential, :agent_credential do
      middleware Authenticated
      arg :attributes, non_null(:agent_credential_attributes)

      resolve &Deployments.link_agent_credential/2
    end

    field :delete_agent_credential, :agent_credential do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &Deployments.delete_agent_credential/2
    end

    @desc "Sets whether new instances bill a provider's agent to your subscription by default"
    field :set_default_agent_billing, :agent_credential do
      middleware Authenticated
      arg :provider, non_null(:agent_credential_provider)
      arg :enabled,  non_null(:boolean)

      resolve &Deployments.set_default_agent_billing/2
    end
  end

  object :devbox_subscriptions do
    field :devbox_instance_status_delta, :devbox_instance_delta do
      arg :id,           :id
      arg :workbench_id, :id

      config fn
        %{id: id}, ctx when is_binary(id) ->
          with {:ok, inst} <- Deployments.devbox_instance(%{id: id}, ctx),
            do: {:ok, topic: "devbox_instances:#{inst.id}"}

        %{workbench_id: wid}, ctx when is_binary(wid) ->
          with {:ok, _} <- Deployments.workbench(%{id: wid}, ctx),
            do: {:ok, topic: "workbenches:#{wid}:devbox_instances"}

        _, _ ->
          {:error, "Must specify either id or workbench_id"}
      end
    end

    field :devbox_thread_delta, :devbox_thread_delta do
      arg :instance_id, non_null(:id)

      config fn %{instance_id: id}, ctx ->
        with {:ok, inst} <- Deployments.devbox_instance(%{id: id}, ctx),
          do: {:ok, topic: "devbox_instances:#{inst.id}:threads"}
      end
    end

    field :devbox_snapshot_delta, :devbox_snapshot_delta do
      arg :workbench_id, non_null(:id)

      config fn %{workbench_id: wid}, ctx ->
        with {:ok, _} <- Deployments.workbench(%{id: wid}, ctx),
          do: {:ok, topic: "workbenches:#{wid}:devbox_snapshots"}
      end
    end

    @desc "Live transcript deltas (including settle), never stored"
    field :devbox_instance_delta, :devbox_entity_change_delta do
      arg :instance_id, non_null(:id)

      config fn %{instance_id: id}, ctx ->
        with {:ok, inst} <- Deployments.devbox_instance(%{id: id}, ctx),
          do: {:ok, topic: "devbox_instances:#{inst.id}:deltas"}
      end
    end

    @desc "Pull requests the instance is preparing"
    field :devbox_pull_request_job_delta, :devbox_pull_request_job_delta do
      arg :instance_id, non_null(:id)

      config fn %{instance_id: id}, ctx ->
        with {:ok, inst} <- Deployments.devbox_instance(%{id: id}, ctx),
          do: {:ok, topic: "devbox_instances:#{inst.id}:pull_request_jobs"}
      end
    end

    @desc "Thread and interaction index changes"
    field :devbox_instance_index_delta, :devbox_index_change_delta do
      arg :instance_id, non_null(:id)

      config fn %{instance_id: id}, ctx ->
        with {:ok, inst} <- Deployments.devbox_instance(%{id: id}, ctx),
          do: {:ok, topic: "devbox_instances:#{inst.id}:index"}
      end
    end
  end
end
