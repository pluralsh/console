defmodule Console.AI.Tools.Agent.Coding.ServiceFiles do
  use Console.AI.Tools.Agent.Base
  alias Console.Schema.{Service, User}
  alias Console.Deployments.Services
  alias Console.AI.Fixer.Service, as: ServiceFixer

  embedded_schema do
    field :service_id, :string
  end

  @valid ~w(service_id)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
  end

  @json_schema Console.priv_file!("tools/agent/coding/service_files.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("service_files")
  def description(), do: "Finds the terraform files for a Plural service and renders them as a sequence of messages"

  def implement(%__MODULE__{service_id: id}) do
    Console.AI.Fixer.Base.raw()
    with %Service{} = service <- Services.get_service(id) |> Console.Repo.preload([:repository]),
         %User{} = user <- Tool.actor(),
         {:ok, service} <- Policies.allow(service, user, :write),
         {:ok, [_ | rest]} <- ServiceFixer.prompt(service, ""),
         {:ok, _} <- update_session(%{service_id: id}) do
      {:ok, Enum.map(rest, fn {:user, raw} -> %{content: raw} end)}
    else
      {:error, err} -> {:error, "failed to get service files, reason: #{inspect(err)}"}
      nil -> {:error, "could not find service with id #{id}"}
    end
  end
end
