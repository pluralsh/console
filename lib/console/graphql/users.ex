defmodule Console.GraphQl.Users do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.{User, Deployments}
  alias Console.Middleware.{AllowJwt, Sandboxed}
  alias Console.Schema.Notification.{Severity, Status}

  enum_from_list :permission, Console.Schema.Role, :permissions, []
  ecto_enum :severity, Severity
  ecto_enum :notification_status, Status

  enum :read_type do
    value :notification
    value :build
  end

  input_object :user_attributes do
    field :name,                :string
    field :email,               :string
    field :password,            :string
    field :roles,               :user_role_attributes
    field :email_settings,      :email_settings_attributes
    field :signing_private_key, :string
  end

  input_object :service_account_attributes do
    field :name,             :string
    field :email,            :string
    field :roles,            :user_role_attributes
    field :assume_bindings,  list_of(:policy_binding_attributes)
  end

  input_object :user_role_attributes do
    field :admin, :boolean
  end

  input_object :email_settings_attributes do
    field :digest, :boolean, description: "whether you want to receive digest emails"
  end

  input_object :invite_attributes do
    field :email, :string
  end

  input_object :scope_attributes do
    field :api,        :string
    field :apis,       list_of(non_null(:string))
    field :identifier, :string
    field :ids,        list_of(non_null(:string))
  end

  input_object :group_attributes do
    field :name,        non_null(:string)
    field :description, :string
    field :global,      :boolean
  end

  input_object :role_attributes do
    field :name,  :string
    field :description, :string
    field :repositories, list_of(:string)
    field :role_bindings, list_of(:binding_attributes)
    field :permissions, list_of(:permission)
  end

  input_object :binding_attributes do
    field :id,       :id
    field :user_id,  :id
    field :group_id, :id
  end

  input_object :persona_attributes do
    field :name,          :string
    field :description,   :string, description: "longform description of this persona"
    field :configuration, :persona_configuration_attributes
    field :bindings,      list_of(:binding_attributes)
  end

  input_object :persona_configuration_attributes do
    field :all,         :boolean, description: "enable full ui for this persona"
    field :home,        :persona_home_attributes, description: "configuration for the homepage for the given persona"
    field :deployments, :persona_deployment_attributes, description: "enable individual parts of the deployments views"
    field :sidebar,     :persona_sidebar_attributes, description: "enable individual aspects of the sidebar"
  end

  input_object :persona_deployment_attributes do
    field :clusters,     :boolean
    field :deployments,  :boolean
    field :repositories, :boolean
    field :services,     :boolean
    field :pipelines,    :boolean
    field :providers,    :boolean
    field :add_ons,      :boolean
  end

  input_object :persona_sidebar_attributes do
    field :audits,        :boolean
    field :kubernetes,    :boolean
    field :pull_requests, :boolean
    field :settings,      :boolean
    field :backups,       :boolean
    field :stacks,        :boolean
  end

  input_object :persona_home_attributes do
    field :manager,  :boolean
    field :security, :boolean
  end

  input_object :bootstrap_token_attributes do
    field :user_id,    :id, description: "An optional external user id to be the user identity for this bootstrap token in audit logs"
    field :project_id, non_null(:id), description: "the project all clusters spawned by this bootstrap token are put into"
  end

  object :user do
    field :id,              non_null(:id)
    field :name,            non_null(:string)
    field :email,           non_null(:string)
    field :deleted_at,      :datetime
    field :profile,         :string
    field :plural_id,       :string
    field :roles,           :user_roles
    field :email_settings,  :email_settings
    field :read_timestamp,  :datetime
    field :build_timestamp, :datetime
    field :refresh_token,   :refresh_token

    field :assume_bindings, list_of(:policy_binding), resolve: dataloader(User)
    field :groups, list_of(:group), resolve: dataloader(User)

    field :personas, list_of(:persona), resolve: &User.list_personas/3

    field :bound_roles,     list_of(:role), resolve: fn user, _, _ ->
      {:ok, Console.Schema.User.roles(user)}
    end

    field :jwt, :string, resolve: fn
      %{jwt: jwt}, _, %{context: %{allow_jwt: true}} -> {:ok, jwt}
      _, _, _ -> {:error, "forbidden"}
    end

    field :unread_notifications, :integer, resolve: fn
      %{id: uid} = user, _, %{context: %{current_user: %{id: uid}}} ->
        {:ok, Console.Services.Users.unread_notifications(user)}
      _, _, _ -> {:error, "you can only query unread notifications for yourself"}
    end

    field :background_color, :string, resolve: fn
      user, _, _ -> User.background_color(user)
    end

    timestamps()
  end

  object :refresh_token do
    field :id,    non_null(:id)
    field :token, non_null(:string), description: "the token to use to request a refresh"

    timestamps()
  end

  object :user_roles do
    field :admin, :boolean
  end

  object :email_settings do
    field :digest, :boolean, description: "whether you want to receive digest emails"
  end

  object :invite do
    field :secure_id, non_null(:string)
    field :email, :string
  end

  object :group do
    field :id,          non_null(:id)
    field :name,        non_null(:string)
    field :description, :string
    field :global,      :boolean, description: "automatically adds all users in the system to this group"

    timestamps()
  end

  object :group_member do
    field :id, non_null(:id)
    field :user, :user, resolve: dataloader(User)
    field :group, :group, resolve: dataloader(User)

    timestamps()
  end

  object :role do
    field :id,           non_null(:id)
    field :name,         non_null(:string)
    field :description,  :string
    field :repositories, list_of(:string)
    field :permissions,  list_of(:permission), resolve: fn role, _, _ -> {:ok, Console.Schema.Role.permissions(role)} end
    field :role_bindings, list_of(:role_binding), resolve: dataloader(User)

    timestamps()
  end

  object :role_binding do
    field :id,    non_null(:id)
    field :user,  :user, resolve: dataloader(User)
    field :group, :group, resolve: dataloader(User)

    timestamps()
  end

  object :login_info do
    field :oidc_uri,  :string
    field :external,  :boolean
    field :oidc_name, :string
  end

  object :notification do
    field :id,          non_null(:id)
    field :title,       non_null(:string)
    field :description, :string
    field :fingerprint, non_null(:string)
    field :status,      :notification_status
    field :labels,      :map
    field :annotations, :map
    field :repository,  non_null(:string)
    field :seen_at,     :datetime
    field :severity,    :severity

    timestamps()
  end

  object :access_token do
    field :id,    :id
    field :token, :string

    field :scopes, list_of(:access_token_scope)

    connection field :audits, node_type: :access_token_audit do
      middleware Feature, :audit
      resolve &User.list_token_audits/2
    end

    timestamps()
  end

  object :access_token_scope do
    field :api,        :string
    field :apis,       list_of(non_null(:string))
    field :identifier, :string
    field :ids,        list_of(non_null(:string))
  end

  object :access_token_audit do
    field :id,        :id
    field :ip,        :string
    field :timestamp, :datetime
    field :count,     :integer
    field :city,      :string
    field :country,   :string
    field :latitude,  :string
    field :longitude, :string

    timestamps()
  end

  object :persona do
    field :id,            non_null(:id)
    field :name,          non_null(:string), description: "the name for this persona"
    field :description,   :string, description: "longform description of this persona"
    field :configuration, :persona_configuration, description: "the ui configuration for this persona (additive across personas)"
    field :bindings,      list_of(:policy_binding),
      resolve: dataloader(Deployments), description: "the group bindings for this persona"

    timestamps()
  end

  object :persona_configuration do
    field :all,         :boolean, description: "enable full ui for this persona"
    field :home,        :persona_home, description: "settings for the home page for this persona"
    field :deployments, :persona_deployment, description: "enable individual parts of the deployments views"
    field :sidebar,     :persona_sidebar, description: "enable individual aspects of the sidebar"
  end

  object :persona_deployment do
    field :clusters,     :boolean
    field :deployments,  :boolean
    field :repositories, :boolean
    field :services,     :boolean
    field :pipelines,    :boolean
    field :providers,    :boolean
    field :add_ons,      :boolean
  end

  object :persona_sidebar do
    field :audits,        :boolean
    field :kubernetes,    :boolean
    field :pull_requests, :boolean
    field :settings,      :boolean
    field :backups,       :boolean
    field :stacks,        :boolean
  end

  object :persona_home do
    field :manager,  :boolean
    field :security, :boolean
  end

  @desc "A restricted token meant only for use in registering clusters, esp for edge devices"
  object :bootstrap_token do
    field :id,       non_null(:id)
    field :token,    non_null(:string), description: "the token to use when bootstrapping clusters"

    field :user,    :user,    resolve: dataloader(User)
    field :project, :project, resolve: dataloader(Deployments), description: "the project for all clusters to live within"

    timestamps()
  end

  connection node_type: :user
  connection node_type: :group
  connection node_type: :group_member
  connection node_type: :role
  connection node_type: :notification
  connection node_type: :access_token
  connection node_type: :access_token_audit
  connection node_type: :persona
  connection node_type: :refresh_token

  delta :notification

  object :user_queries do
    field :user, :user do
      middleware Authenticated
      arg :email, non_null(:string)

      resolve &User.get_user/2
    end

    field :group, :group do
      middleware Authenticated
      arg :name, non_null(:string)

      resolve &User.get_group/2
    end

    connection field :users, node_type: :user do
      middleware Authenticated
      arg :q, :string

      resolve &User.list_users/2
    end

    connection field :service_accounts, node_type: :user do
      middleware Authenticated
      arg :q, :string

      resolve &User.list_service_accounts/2
    end

    field :login_info, :login_info do
      arg :redirect, :string

      resolve &User.login_info/2
    end

    field :me, :user do
      middleware Authenticated

      resolve fn _, %{context: %{current_user: user}} -> {:ok, user} end
    end

    field :invite, :invite do
      arg :id, non_null(:string)

      resolve &User.resolve_invite/2
    end

    connection field :groups, node_type: :group  do
      middleware Authenticated
      arg :q, :string

      resolve &User.list_groups/2
    end

    connection field :group_members, node_type: :group_member  do
      middleware Authenticated
      arg :group_id, non_null(:id)

      resolve &User.list_group_members/2
    end

    field :role, :role do
      middleware Authenticated

      safe_resolve &User.resolve_role/2
    end

    connection field :roles, node_type: :role do
      middleware Authenticated
      arg :q, :string

      resolve &User.list_roles/2
    end

    connection field :notifications, node_type: :notification do
      middleware Authenticated
      arg :all, :boolean

      resolve &User.list_notifications/2
    end

    field :temporary_token, :string do
      middleware Authenticated
      middleware AdminRequired

      resolve &User.temporary_token/2
    end

    connection field :access_tokens, node_type: :access_token do
      middleware Authenticated
      resolve &User.list_tokens/2
    end

    field :access_token, :access_token do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &User.resolve_token/2
    end

    field :persona, :persona do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &User.get_persona/2
    end

    connection field :personas, node_type: :persona do
      middleware Authenticated

      resolve &User.list_personas/2
    end

    connection field :refresh_tokens, node_type: :refresh_token do
      middleware Authenticated

      resolve &User.list_refresh_tokens/2
    end

    field :refresh, :user do
      middleware AllowJwt
      arg :token, non_null(:string)

      resolve &User.refresh/2
    end
  end

  object :user_mutations do
    field :sign_in, :user do
      middleware AllowJwt
      arg :email,    non_null(:string)
      arg :password, non_null(:string)

      safe_resolve &User.signin_user/2
    end

    field :logout, :user do
      middleware Authenticated

      safe_resolve &User.logout/2
    end

    field :login_link, :user do
      middleware AllowJwt
      arg :key, non_null(:string)

      safe_resolve &User.login_link/2
    end

    field :read_notifications, :user do
      middleware Authenticated

      safe_resolve &User.read_notifications/2
    end

    field :signup, :user do
      middleware AllowJwt
      middleware Sandboxed
      arg :invite_id, non_null(:string)
      arg :attributes, non_null(:user_attributes)

      safe_resolve &User.signup_user/2
    end

    field :oauth_callback, :user do
      middleware AllowJwt
      arg :code,     non_null(:string)
      arg :redirect, :string

      safe_resolve &User.oauth_callback/2
    end

    field :create_invite, :invite do
      middleware Authenticated
      middleware Sandboxed
      arg :attributes, non_null(:invite_attributes)

      safe_resolve &User.create_invite/2
    end

    field :create_user, :user do
      middleware Authenticated
      middleware AdminRequired
      arg :attributes, non_null(:user_attributes)

      resolve &User.create_user/2
    end

    field :create_service_account, :user do
      middleware Authenticated
      middleware AdminRequired
      arg :attributes, non_null(:service_account_attributes)

      resolve &User.create_service_account/2
    end

    field :update_service_account, :user do
      middleware Authenticated
      middleware AdminRequired
      arg :id,         non_null(:id)
      arg :attributes, non_null(:service_account_attributes)

      resolve &User.update_service_account/2
    end

    field :update_user, :user do
      middleware Authenticated
      middleware Sandboxed
      arg :id, :id
      arg :attributes, non_null(:user_attributes)

      safe_resolve &User.update_user/2
    end

    field :delete_user, :user do
      middleware Authenticated
      middleware AdminRequired
      arg :id, non_null(:id)

      safe_resolve &User.delete_user/2
    end

    field :impersonate_service_account, :user do
      middleware Authenticated
      middleware AllowJwt
      arg :email, non_null(:string)

      safe_resolve &User.impersonate/2
    end

    field :mark_read, :user do
      middleware Authenticated
      arg :type, :read_type

      safe_resolve &User.mark_read/2
    end

    field :create_group, :group do
      middleware Authenticated
      middleware AdminRequired
      middleware Sandboxed
      arg :attributes, non_null(:group_attributes)

      safe_resolve &User.create_group/2
    end

    field :delete_group, :group do
      middleware Authenticated
      middleware AdminRequired
      middleware Sandboxed
      arg :group_id, non_null(:id)

      safe_resolve &User.delete_group/2
    end

    field :update_group, :group do
      middleware Authenticated
      middleware AdminRequired
      middleware Sandboxed
      arg :group_id, non_null(:id)
      arg :attributes, non_null(:group_attributes)

      safe_resolve &User.update_group/2
    end

    field :create_group_member, :group_member do
      middleware Authenticated
      middleware AdminRequired
      middleware Sandboxed
      arg :group_id, non_null(:id)
      arg :user_id, non_null(:id)

      safe_resolve &User.create_group_member/2
    end

    field :delete_group_member, :group_member do
      middleware Authenticated
      middleware AdminRequired
      middleware Sandboxed
      arg :group_id, non_null(:id)
      arg :user_id, non_null(:id)

      safe_resolve &User.delete_group_member/2
    end

    field :create_role, :role do
      middleware Authenticated
      middleware AdminRequired
      middleware Sandboxed
      arg :attributes, non_null(:role_attributes)

      safe_resolve &User.create_role/2
    end

    field :update_role, :role do
      middleware Authenticated
      middleware AdminRequired
      middleware Sandboxed
      arg :id, non_null(:id)
      arg :attributes, non_null(:role_attributes)

      safe_resolve &User.update_role/2
    end

    field :delete_role, :role do
      middleware Authenticated
      middleware AdminRequired
      middleware Sandboxed
      arg :id, non_null(:id)

      safe_resolve &User.delete_role/2
    end

    field :create_access_token, :access_token do
      middleware Authenticated
      arg :scopes, list_of(:scope_attributes)

      safe_resolve &User.create_access_token/2
    end

    field :create_service_account_token, :access_token do
      middleware Authenticated
      middleware AdminRequired
      arg :id,     non_null(:id)
      arg :scopes, list_of(:scope_attributes)

      resolve &User.create_access_token/2
    end

    field :delete_access_token, :access_token do
      middleware Authenticated
      arg :token, non_null(:string)

      safe_resolve &User.delete_access_token/2
    end

    field :create_bootstrap_token, :bootstrap_token do
      middleware Authenticated
      arg :attributes, non_null(:bootstrap_token_attributes)

      resolve &User.create_bootstrap_token/2
    end

    field :delete_bootstrap_token, :bootstrap_token do
      middleware Authenticated
      arg :id, non_null(:id)

      resolve &User.delete_bootstrap_token/2
    end

    field :create_persona, :persona do
      middleware Authenticated
      middleware AdminRequired
      arg :attributes, non_null(:persona_attributes)

      resolve &User.create_persona/2
    end

    field :update_persona, :persona do
      middleware Authenticated
      middleware AdminRequired
      arg :id,         non_null(:id)
      arg :attributes, non_null(:persona_attributes)

      resolve &User.update_persona/2
    end

    field :delete_persona, :persona do
      middleware Authenticated
      middleware AdminRequired
      arg :id, non_null(:id)

      resolve &User.delete_persona/2
    end
  end

  object :user_subscriptions do
    field :notification_delta, :notification_delta do
      config fn _, _ -> {:ok, topic: "notifications"} end
    end
  end
end
