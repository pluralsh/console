defmodule Console.Deployments.Pr.Config do
  alias Console.Schema.PrAutomation

  @doc """
  Generate onfig for executing a pr template
  """
  @spec config(PrAutomation.t, binary, map) :: {:ok, binary} | Console.error
  def config(%PrAutomation{} = pr, branch, ctx) do
    with {:ok, f} <- Briefly.create(),
         {:ok, doc} <- Ymlr.document(structure(pr, branch, ctx)),
         :ok <- File.write(f, String.trim_leading(doc, "---\n")),
      do: {:ok, f}
  end

  defp structure(pr, branch, ctx) do
    spec = Map.take(pr, ~w(identifier creates updates message)a)
           |> Map.put(:branch, branch)
    %{
      apiVersion: "pr.plural.sh/v1alpha1",
      kind: "PrTemplate",
      spec: Console.mapify(spec),
      context: ctx
    }
  end
end
