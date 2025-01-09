defmodule Console.Logs.Provider.Elastic.Client do
  @behaviour Snap.Cluster
  alias Snap.Request

  @key {__MODULE__, :config}

  def init(config) do
    Process.put(@key, build_config(config))
  end

  defp build_config(config) do
    Enum.filter([
      url: config.host,
      user: config.user,
      password: config.password,
      json_library: Jason
    ], &elem(&1, 1))
  end

  def config(), do: Process.get(@key)

  def json_library(), do: Jason

  def get(path, params \\ [], headers \\ [], opts \\ []) do
    Request.request(__MODULE__, :get, path, nil, params, headers, opts)
  end

  def post(path, body \\ nil, params \\ [], headers \\ [], opts \\ []) do
    Request.request(__MODULE__, :post, path, body, params, headers, opts)
  end

  def put(path, body \\ nil, params \\ [], headers \\ [], opts \\ []) do
    Request.request(__MODULE__, :put, path, body, params, headers, opts)
  end

  def delete(path, params \\ [], headers \\ [], opts \\ []) do
    Request.request(__MODULE__, :delete, path, nil, params, headers, opts)
  end

  def patch(path, body \\ nil, params \\ [], headers \\ [], opts \\ []) do
    Request.request(__MODULE__, :patch, path, body, params, headers, opts)
  end
end
