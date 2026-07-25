defmodule Console.AI.Tools.Workbench.Sentinel.RunSentinel do
  use Console.AI.Tools.Agent.Base
  alias Console.Deployments.Sentinels
  alias Console.Schema.{Sentinel, User}

  embedded_schema do
    field :user,         :map, virtual: true
    field :sentinel,     :map, virtual: true
    field :sentinel_id,  :binary_id
    field :name,         :string
    field :overrides,    :map, default: %{}
  end

  @valid ~w(sentinel_id name overrides)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> check_uuid(:sentinel_id)
    |> validate_sentinel_ref()
  end

  @json_schema Console.priv_file!("tools/workbench/sentinel/run_sentinel.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "plrl_run_sentinel"
  def description(_), do: "Run a Plural sentinel by id or name. The verification subagent will poll the run once a minute until it completes."

  def implement(%__MODULE__{user: %User{}, sentinel_id: id, name: name} = model) do
    with %Sentinel{} = sentinel <- sentinel(id, name) do
      {:ok, %{model | sentinel: sentinel}}
    else
      nil -> {:error, "could not find sentinel by #{sentinel_ref(id, name)}"}
      error -> error
    end
  end

  defp validate_sentinel_ref(cs) do
    case {get_field(cs, :sentinel_id), get_field(cs, :name)} do
      {id, _} when is_binary(id) and byte_size(id) > 0 -> cs
      {_, name} when is_binary(name) and byte_size(name) > 0 -> cs
      _ -> add_error(cs, :sentinel_id, "must specify either sentinel_id or name")
    end
  end

  defp sentinel(id, _) when is_binary(id) and byte_size(id) > 0, do: Sentinels.get_sentinel(id)
  defp sentinel(_, name) when is_binary(name) and byte_size(name) > 0, do: Sentinels.get_sentinel_by_name(name)
  defp sentinel(_, _), do: nil

  defp sentinel_ref(id, _) when is_binary(id) and byte_size(id) > 0, do: "id #{id}"
  defp sentinel_ref(_, name) when is_binary(name) and byte_size(name) > 0, do: "name #{name}"
  defp sentinel_ref(_, _), do: "empty sentinel reference"
end
