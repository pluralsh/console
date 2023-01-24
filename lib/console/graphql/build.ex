defmodule Console.GraphQl.Build do
  use Console.GraphQl.Schema.Base
  alias Console.Schema
  alias Console.Middleware.{Authenticated, RequiresGit, Rbac}
  alias Console.GraphQl.Resolvers.{Build, User}

  ecto_enum :status, Schema.Build.Status
  ecto_enum :build_type, Schema.Build.Type

  enum :tool do
    value :helm
    value :terraform
  end

  ## INPUTS

  input_object :build_attributes do
    field :repository, non_null(:string)
    field :type,       :build_type
    field :message,    :string
  end

  object :build do
    field :id,           non_null(:id)
    field :repository,   non_null(:string)
    field :type,         non_null(:build_type)
    field :status,       non_null(:status)
    field :message,      :string
    field :completed_at, :datetime
    field :sha,          :string

    connection field :commands, node_type: :command do
      resolve &Build.list_commands/2
    end

    field :creator,  :user, resolve: dataloader(User)
    field :approver, :user, resolve: dataloader(User)
    field :changelogs, list_of(:changelog) do
      middleware Rbac, perm: :configure, field: :repository
      resolve dataloader(Build)
    end

    timestamps()
  end

  object :changelog do
    field :id,      non_null(:id)
    field :repo,    non_null(:string)
    field :tool,    non_null(:string)
    field :content, :string

    timestamps()
  end

  object :command do
    field :id,           non_null(:id)
    field :command,      non_null(:string)
    field :exit_code,    :integer
    field :stdout,       :string, resolve: fn
      %{completed_at: nil} = cmd, _, _ -> {:ok, Console.Services.Builds.get_line(cmd)}
      %{stdout: stdo}, _, _ -> {:ok, stdo}
    end
    field :completed_at, :datetime
    field :build,        :build, resolve: dataloader(Build)

    timestamps()
  end

  delta :build
  delta :command

  connection node_type: :build
  connection node_type: :command

  object :build_queries do
    connection field :builds, node_type: :build do
      middleware Authenticated

      resolve &Build.list_builds/2
    end

    field :build, :build do
      middleware Authenticated

      arg :id, non_null(:id)

      resolve safe_resolver(&Build.resolve_build/2)
    end
  end

  object :build_mutations do
    field :create_build, :build do
      middleware Authenticated
      middleware RequiresGit
      arg :attributes, non_null(:build_attributes)

      middleware Rbac, perm: :deploy, arg: [:attributes, :repository]
      resolve safe_resolver(&Build.create_build/2)
    end

    field :restart_build, :build do
      middleware Authenticated
      middleware RequiresGit
      arg :id, non_null(:id)

      resolve safe_resolver(&Build.restart_build/2)
    end

    field :cancel_build, :build do
      middleware Authenticated
      middleware RequiresGit
      arg :id, non_null(:id)

      resolve safe_resolver(&Build.cancel_build/2)
    end

    field :approve_build, :build do
      middleware Authenticated
      middleware RequiresGit
      arg :id, non_null(:id)

      resolve safe_resolver(&Build.approve_build/2)
    end
  end

  object :build_subscriptions do
    field :build_delta, :build_delta do
      arg :build_id, :id

      config fn
        %{id: id}, _ when is_binary(id) -> {:ok, topic: "builds:#{id}"}
        _, _ -> {:ok, topic: "builds"}
      end
    end

    field :command_delta, :command_delta do
      arg :build_id, non_null(:id)

      config fn %{build_id: build_id}, _ -> {:ok, topic: "commands:#{build_id}"} end
    end
  end
end
