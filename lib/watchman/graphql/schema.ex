defmodule Watchman.GraphQl.Schema do
  use Watchman.GraphQl.Schema.Base
  alias Watchman.Schema
  alias Watchman.GraphQl.Resolvers.{Build, Forge, User}
  import_types Absinthe.Plug.Types
  import_types Watchman.GraphQl.CustomTypes

  ## ENUMS
  ecto_enum :status, Schema.Build.Status
  ecto_enum :build_type, Schema.Build.Type

  enum :webhook_health do
    value :healthy
    value :unhealthy
  end

  enum :webhook_type do
    value :piazza
  end

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

  input_object :webhook_attributes do
    field :url, non_null(:string)
  end

  input_object :invite_attributes do
    field :email, :string
  end


  ## OBJECTS
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
    field :changelogs, list_of(:changelog), resolve: dataloader(Build)

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
    field :stdout,       :string
    field :completed_at, :datetime
    field :build,        :build, resolve: dataloader(Build)

    timestamps()
  end

  object :webhook do
    field :id,      non_null(:id)
    field :url,     non_null(:string)
    field :health,  non_null(:webhook_health)
    field :type,    non_null(:webhook_type)

    timestamps()
  end

  object :installation do
    field :id, non_null(:id)
    field :repository, :repository
  end

  object :repository do
    field :id,            non_null(:id)
    field :name,          non_null(:string)
    field :description,   :string
    field :icon,          :string
    field :configuration, :configuration, resolve: &Forge.resolve_configuration/3
    field :grafana_dns,   :string, resolve: fn _, _, _ ->
      {:ok, Watchman.conf(:grafana_dns)}
    end
  end

  object :configuration do
    field :terraform, :string
    field :helm,      :string
  end

  object :log_label do
    field :name,  :string
    field :value, :string
  end

  delta :build
  delta :command

  connection node_type: :build
  connection node_type: :command
  connection node_type: :installation
  connection node_type: :webhook
end