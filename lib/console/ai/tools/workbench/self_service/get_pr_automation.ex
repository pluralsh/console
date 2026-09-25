defmodule Console.AI.Tools.Workbench.SelfService.GetPrAutomation do
  use Console.AI.Tools.Workbench.Base
  alias Console.Repo
  alias Console.AI.Tool
  alias Console.Deployments.{Git, Policies}
  alias Console.Schema.PrAutomation

  embedded_schema do
    field :pr_automation_id, :string
    field :name, :string
  end

  @valid ~w(pr_automation_id name)a
  @json_schema Console.priv_file!("tools/workbench/self_service/get_pr_automation.json") |> Jason.decode!()
  @fields ~w(id name documentation title message branch branch_prefix identifier configuration icon dark_icon)a

  def json_schema(), do: @json_schema
  def name(), do: "workbench_get_pr_automation"
  def description(), do: """
  Fetch a single PR automation by id or name, including documentation, branch metadata,
  configuration fields, and confirmation requirements. Use this before invoking an automation
  so you can fill a valid context.
  """

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_one_of()
  end

  defp validate_one_of(cs) do
    case {get_field(cs, :pr_automation_id), get_field(cs, :name)} do
      {id, _} when is_binary(id) and byte_size(id) > 0 -> cs
      {_, name} when is_binary(name) and byte_size(name) > 0 -> cs
      _ -> add_error(cs, :pr_automation_id, "either pr_automation_id or name is required")
    end
  end

  def implement(%__MODULE__{} = model) do
    with %{} = user <- Tool.actor(),
         %PrAutomation{} = pra <- fetch(model),
         {:ok, _} <- Policies.allow(pra, user, :read) do
      pra
      |> Repo.preload([:catalog])
      |> format()
      |> Jason.encode()
    else
      nil -> {:ok, "PR automation not found"}
      {:error, _} -> {:ok, "You do not have access to this PR automation"}
      _ -> {:ok, "not logged in"}
    end
  end

  defp fetch(%__MODULE__{pr_automation_id: id}) when is_binary(id) and byte_size(id) > 0,
    do: Git.get_pr_automation(id)
  defp fetch(%__MODULE__{name: name}) when is_binary(name) and byte_size(name) > 0,
    do: Git.get_pr_automation_by_name(name)
  defp fetch(_), do: nil

  defp format(%PrAutomation{} = pra) do
    Map.take(pra, @fields)
    |> Map.put(:description, pra.documentation)
    |> Map.put(:catalog, format_catalog(pra.catalog))
    |> Map.put(:confirmation, format_confirmation(pra.confirmation))
    |> Console.mapify()
  end

  defp format_catalog(%{id: id, name: name, description: description, category: category}),
    do: %{id: id, name: name, description: description, category: category}
  defp format_catalog(_), do: nil

  defp format_confirmation(%{text: text, checklist: checklist}),
    do: %{text: text, checklist: Enum.map(checklist || [], &Map.take(&1, [:label]))}
  defp format_confirmation(_), do: nil
end
