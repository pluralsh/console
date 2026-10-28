defmodule Prometheus.Data do
  defstruct [:resultType, :result]

  def new(%{} = data) do
    %__MODULE__{resultType: data["resultType"], result: results(data["result"])}
  end
  def new(_), do: nil

  # scalar and string results are a bare [ts, value] pair rather than a list of series
  defp results([%{} | _] = results), do: Enum.map(results, &Prometheus.Result.new/1)
  defp results(results), do: results
end

defmodule Prometheus.Result do
  defstruct [:metric, :values, :value]

  def new(%{} = result) do
    %__MODULE__{metric: result["metric"], values: result["values"], value: result["value"]}
  end
end

defmodule Prometheus.Response do
  alias Prometheus.Data

  defstruct [:status, :data]

  @doc "decodes a prometheus api response body"
  @spec decode(binary) :: {:ok, %__MODULE__{}} | {:error, term}
  def decode(body) when is_binary(body) do
    case Torque.decode(body) do
      {:ok, %{} = resp} -> {:ok, %__MODULE__{status: resp["status"], data: Data.new(resp["data"])}}
      {:ok, _} -> {:error, "invalid prometheus response"}
      err -> err
    end
  end
end
