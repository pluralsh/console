defmodule Console.Plural.Client do
  alias Console.Plural.Config

  @headers [
    {"accept", "application/json"},
    {"content-type", "application/json"}
  ]

  defmodule Response, do: defstruct [:data, :errors]

  def run(query, variables, type_spec) do
    token = Config.fetch()
    Req.post(url(),
      headers: [{"authorization", "Bearer #{token}"} | @headers],
      body: Jason.encode!(%{query: query, variables: variables}),
      decode_body: false,
      retry: false
    )
    |> decode(type_spec)
  end

  defp decode({:ok, %{body: body}}, type_spec) do
    case Poison.decode(body, as: %Response{data: type_spec}) do
      {:ok, %Response{errors: [_ | _] = errors}} ->
        {:error, Enum.map(errors, & &1["message"])}
      {:ok, %Response{data: data}} when not is_nil(data) -> {:ok, data}
      _ -> {:error, "invalid json response"}
    end
  end
  defp decode({:error, _}, _), do: {:error, "network error"}

  defp url(), do: "https://#{Config.endpoint()}/gql"
end
