defmodule Console.GraphQl.Users do
  use Console.GraphQl.Schema.Base
  alias Console.GraphQl.Resolvers.User
  alias Console.Middleware.{Authenticated, AdminRequired, AllowJwt, Sandboxed}
  alias Console.Schema.Notification.{Severity, Status}

  enum_from_list :permission, Console.Schema.Role, :permissions, []
  ecto_enum :severity, Severity
  ecto_enum :notification_status, Status

  enum :read_type do
    value :notification
    value :build
  end

  input_object :user_attributes do
    field :name,     :string
    field :email,    :string
    field :password, :string
    field :roles,    :user_role_attributes
  end

  input_object :user_role_attributes do
    field :admin, :boolean
  end

  input_object :invite_attributes do
    field :email, :string
  end

  input_object :group_attributes do
    field :name,  non_null(:string)
    field :description, :string
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

  object :user do
    field :id,              non_null(:id)
    field :name,            non_null(:string)
    field :email,           non_null(:string)
    field :deleted_at,      :datetime
    field :profile,         :string
    field :plural_id,       :string
    field :roles,           :user_roles
    field :read_timestamp,  :datetime
    field :build_timestamp, :datetime
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

  object :user_roles do
    field :admin, :boolean
  end

  object :invite do
    field :secure_id, non_null(:string)
    field :email, :string
  end

  object :group do
    field :id, non_null(:id)
    field :name, non_null(:string)
    field :description, :string

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
    field :oidc_uri, :string
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

  connection node_type: :user
  connection node_type: :group
  connection node_type: :group_member
  connection node_type: :role
  connection node_type: :notification

  delta :notification

  object :user_queries do
    connection field :users, node_type: :user do
      middleware Authenticated
      arg :q, :string

      resolve &User.list_users/2
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
  end

  object :user_mutations do
    field :sign_in, :user do
      middleware AllowJwt
      arg :email,    non_null(:string)
      arg :password, non_null(:string)

      safe_resolve &User.signin_user/2
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

    field :update_user, :user do
      middleware Authenticated
      middleware Sandboxed
      arg :id, :id
      arg :attributes, non_null(:user_attributes)

      safe_resolve &User.update_user/2
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
  end

  object :user_subscriptions do
    field :notification_delta, :notification_delta do
      config fn _, _ -> {:ok, topic: "notifications"} end
    end
  end
end
