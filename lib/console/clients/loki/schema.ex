defmodule Loki.Response do
  alias Loki.Data

  defstruct [:status, :data]

  @doc "decodes a loki query_range response body"
  @spec decode(binary) :: {:ok, %__MODULE__{}} | {:error, term}
  def decode(body) when is_binary(body) do
    case Torque.decode(body) do
      {:ok, %{} = resp} -> {:ok, %__MODULE__{status: resp["status"], data: Data.new(resp["data"])}}
      {:ok, _} -> {:error, "invalid loki response"}
      err -> err
    end
  end
end

defmodule Loki.Data do
  defstruct [:resultType, :result]

  def new(%{} = data) do
    %__MODULE__{resultType: data["resultType"], result: results(data["result"])}
  end
  def new(_), do: nil

  defp results(results) when is_list(results), do: Enum.map(results, &Loki.Result.new/1)
  defp results(results), do: results
end

defmodule Loki.Result do
  defstruct [:metric, :stream, :values]

  def new(%{} = result) do
    %__MODULE__{metric: result["metric"], stream: result["stream"], values: result["values"]}
  end
  def new(result), do: result
end

defmodule Loki.Value, do: defstruct [:timestamp, :value]
