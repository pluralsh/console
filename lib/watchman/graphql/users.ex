defmodule Watchman.GraphQl.Users do
  use Watchman.GraphQl.Schema.Base
  alias Watchman.GraphQl.Resolvers.User
  alias Watchman.Middleware.Authenticated

  input_object :user_attributes do
    field :name,     :string
    field :email,    :string
    field :password, :string
  end

  input_object :group_attributes do
    field :name,  non_null(:string)
    field :description, :string
  end

  object :user do
    field :id, non_null(:id)
    field :name, non_null(:string)
    field :email, non_null(:string)
    field :deleted_at, :datetime

    field :jwt, :string, resolve: fn
      %{id: id, jwt: jwt}, _, %{context: %{current_user: %{id: id}}} -> {:ok, jwt}
      _, _, %{context: %{current_user: %{}}} -> {:error, "you can only query your own jwt"}
      %{jwt: jwt}, _, _ -> {:ok, jwt}
    end

    field :background_color, :string, resolve: fn
      user, _, _ -> User.background_color(user)
    end

    timestamps()
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
  end

  connection node_type: :user
  connection node_type: :group
  connection node_type: :group_member

  object :user_queries do
    connection field :users, node_type: :user do
      middleware Authenticated
      arg :q, :string

      resolve &User.list_users/2
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
  end

  object :user_mutations do
    field :sign_in, :user do
      arg :email,    non_null(:string)
      arg :password, non_null(:string)

      resolve safe_resolver(&User.signin_user/2)
    end

    field :signup, :user do
      arg :invite_id, non_null(:string)
      arg :attributes, non_null(:user_attributes)

      resolve safe_resolver(&User.signup_user/2)
    end

    field :create_invite, :invite do
      arg :attributes, non_null(:invite_attributes)

      resolve safe_resolver(&User.create_invite/2)
    end

    field :update_user, :user do
      arg :attributes, non_null(:user_attributes)

      resolve safe_resolver(&User.update_user/2)
    end

    field :create_group, :group do
      arg :attributes, non_null(:group_attributes)

      resolve safe_resolver(&User.create_group/2)
    end

    field :delete_group, :group do
      arg :group_id, non_null(:id)

      resolve safe_resolver(&User.delete_group/2)
    end

    field :update_group, :group do
      arg :group_id, non_null(:id)
      arg :attributes, non_null(:group_attributes)

      resolve safe_resolver(&User.update_group/2)
    end

    field :create_group_member, :group_member do
      arg :group_id, non_null(:id)
      arg :user_id, non_null(:id)

      resolve safe_resolver(&User.create_group_member/2)
    end

    field :delete_group_member, :group_member do
      arg :group_id, non_null(:id)
      arg :user_id, non_null(:id)

      resolve safe_resolver(&User.delete_group_member/2)
    end
  end
end