defmodule Console.AI.Tools.Agent.InsightFiles do
  use Console.AI.Tools.Agent.Base
  alias Console.AI.Tool
  alias Console.Schema.{Service, User, Stack, AiInsight}
  alias Console.AI.Fixer.Service, as: ServiceFixer
  alias Console.AI.Fixer.Stack, as: StackFixer

  embedded_schema do
  end

  @valid ~w()a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/agent/insight_files.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("insight_files")
  def description(), do: "Finds the gitops manifests that are known to be associated with this insight"

  def implement(%__MODULE__{}) do
    Console.AI.Fixer.Base.raw()
    with %AiInsight{} = insight <- Tool.insight(),
         %User{} = user <- Tool.actor(),
         insight <- Console.Repo.preload(insight, [:service, :stack, :alert]),
         {:ok, insight} <- Policies.allow(insight, user, :read),
         {:ok, result} <- get_contents(insight) do
      Jason.encode(result)
    else
      {:error, err} -> {:error, "failed to get insight files, reason: #{inspect(err)}"}
      nil -> {:error, "no insight associated with session"}
    end
  end

  defp get_contents(%AiInsight{service: %Service{} = service}),
    do: ServiceFixer.file_contents(service, ctx_window_scale: 0.5)
  defp get_contents(%AiInsight{stack: %Stack{} = stack}),
    do: StackFixer.healthy_prompt(stack)
  defp get_contents(_), do: {:error, "this is not an insight we can generate a fix for"}
end
