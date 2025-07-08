defmodule Console.Schema.StackState do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Stack, StackRun, AiInsight}

  schema "stack_states" do
    field :plan, :binary

    embeds_many :state, StateItem, on_replace: :delete do
      field :identifier,    :string
      field :resource,      :string
      field :name,          :string
      field :configuration, :map
      field :links,         {:array, :string}
    end

    belongs_to :stack,   Stack
    belongs_to :run,     StackRun
    belongs_to :insight, AiInsight, on_replace: :update

    timestamps()
  end

  @valid ~w(plan stack_id run_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:insight)
    |> unique_constraint(:run_id)
    |> unique_constraint(:stack_id)
    |> foreign_key_constraint(:insight_id)
    |> foreign_key_constraint(:stack_id)
    |> foreign_key_constraint(:run_id)
    |> cast_embed(:state, with: &state_changeset/2)
  end

  defp state_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(identifier resource name configuration links)a)
    |> validate_required(~w(identifier)a)
  end
end

defmodule Console.Schema.StackState.Mini do
  @moduledoc """
  A minified version of a stack state item to be used for vector indexing
  """
  alias Console.Schema.{StackState, Stack, GitRepository}

  @type stack_data :: %{
    id: binary,
    name: binary,
    status: binary,
    repository: %{
      id: binary,
      url: binary
    },
    git: %{
      ref: binary,
      folder: binary
    }
  }

  @type t :: %__MODULE__{
    identifier: binary,
    resource: binary,
    name: binary,
    configuration: binary,
    links: [binary],
    stack: stack_data()
  }

  defstruct [:identifier, :resource, :name, :configuration, :links, :stack]

  def new(%{} = args) do
    %__MODULE__{
      identifier: args["identifier"],
      resource: args["resource"],
      name: args["name"],
      configuration: args["configuration"],
      links: args["links"],
      stack: args["stack"]
    }
  end

  def new(%StackState{stack: %Stack{} = stack}, %StackState.StateItem{} = item) do
    %__MODULE__{
      identifier: item.identifier,
      resource: item.resource,
      name: item.name,
      configuration: Jason.encode!(item.configuration),
      links: item.links,
      stack: stack_data(stack)
    }
  end

  defp stack_data(%Stack{repository: %GitRepository{} = repository, git: git} = stack) do
    %{
      id: stack.id,
      name: stack.name,
      status: stack.status,
      repository: %{
        id: repository.id,
        url: repository.url
      },
      git: %{
        ref: git.ref,
        folder: git.folder,
      }
    }
  end
end
