defmodule ConsoleWeb.Plugs.GraphQLMultipartSpec do
  @moduledoc """
  Normalizes single-operation GraphQL multipart requests before Absinthe.Plug.

  gqlgenc sends uploads using the GraphQL multipart request spec:

      operations={"query":"...","variables":{"file":null}}
      map={"0":["variables.file"]}
      0=<file>

  Absinthe.Plug already supports upload variables when they point directly to a
  multipart file field, but this pinned version does not expand the spec's map
  for a single operations object. This plug does that expansion without changing
  batched/list operations, which Absinthe.Plug already handles via `_json`.
  """

  @behaviour Plug

  @impl Plug
  def init(opts), do: opts

  @impl Plug
  def call(%Plug.Conn{params: %{"operations" => operations, "map" => upload_map}} = conn, _opts)
      when is_binary(operations) and is_binary(upload_map) do
    case Jason.decode(operations) do
      {:ok, %{} = operation} ->
        params =
          conn.params
          |> Map.delete("operations")
          |> Map.delete("map")
          |> Map.merge(apply_upload_map(operation, upload_map))

        %{conn | params: params}

      _ ->
        conn
    end
  end

  def call(conn, _opts), do: conn

  defp apply_upload_map(%{"variables" => variables} = operation, upload_map)
       when is_map(variables) and is_binary(upload_map) do
    case Jason.decode(upload_map) do
      {:ok, %{} = mapping} ->
        variables =
          Enum.reduce(mapping, variables, fn {file_key, paths}, vars ->
            Enum.reduce(List.wrap(paths), vars, &put_upload_variable(&2, &1, file_key))
          end)

        Map.put(operation, "variables", variables)

      _ ->
        operation
    end
  end

  defp apply_upload_map(operation, _upload_map), do: operation

  defp put_upload_variable(variables, "variables." <> path, file_key) do
    put_upload_variable_path(variables, String.split(path, "."), file_key)
  end

  defp put_upload_variable(variables, _path, _file_key), do: variables

  defp put_upload_variable_path(variables, [key], file_key), do: Map.put(variables, key, file_key)

  defp put_upload_variable_path(variables, [key | rest], file_key) do
    case Map.get(variables, key) do
      %{} = nested -> Map.put(variables, key, put_upload_variable_path(nested, rest, file_key))
      _ -> variables
    end
  end
end
