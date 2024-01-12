defmodule Console.Deployments.Pr.Config do
  alias Console.Schema.PrAutomation

  @doc """
  Generate onfig for executing a pr template
  """
  @spec config(PrAutomation.t, map) :: {:ok, binary} | Console.error
  def config(%PrAutomation{} = pr, ctx) do
    with {:ok, f} <- Briefly.create(),
         {:ok, doc} <- Ymlr.document(structure(pr, ctx)),
         :ok <- File.write(f, String.trim_leading(doc, "---\n")),
      do: {:ok, f}
  end

  defp structure(pr, ctx) do
    %{
      apiVersion: "pr.plural.sh/v1alpha1",
      kind: "PrTemplate",
      spec: Console.mapify(pr.spec) |> Map.put(:message, pr.message),
      context: ctx
    }
  end
end
