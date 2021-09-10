defmodule Kubecost.Client do
  import Console.Services.Base, only: [ok: 1]
  require Logger
  alias Kubecost.Entry

  defmodule Response, do: defstruct [:code, :status, :data, :message]

  def hostname(), do: "http://kubecost-cost-analyzer.kubecost:9090"

  def url(path, params \\ []) do
    params = URI.encode_query(params)
    "#{hostname()}#{path}?#{params}"
  end

  def get_aggregated_cost() do
    url("/model/allocation", window: "month", aggregation: "namespace", accumulate: true)
    |> HTTPoison.get()
    |> case do
      {:ok, %{body: body, status_code: 200}} ->
        Poison.decode(body, as: %Response{})
        |> convert()
      error -> error
    end
  end

  defp convert({:ok, %Response{code: 200, data: [data | _]}}) do
    Enum.into(data, %{}, fn {namespace, result} ->
      {namespace, Entry.build(result)}
    end)
    |> ok()
  end
  defp convert({:ok, %Response{} = resp}) do
    Logger.info "Failed to query kubecost: #{inspect(resp)}"
    {:error, "kubecost failure"}
  end
  defp convert({:error, _} = error), do: error
end
