defmodule Console.Plural.Client do
  alias Console.Plural.Config

  @headers [
    {"accept", "application/json"},
    {"content-type", "application/json"}
  ]

  defmodule Response, do: defstruct [:data, :errors]

  def run(query, variables, type_spec) do
    token = Config.fetch()
    HTTPoison.post(url(), Jason.encode!(%{
      query: query,
      variables: variables
    }), [{"authorization", "Bearer #{token}"} | @headers])
    |> decode(type_spec)
  end

  defp decode({:ok, %{body: body}}, type_spec) do
    case Poison.decode!(body, as: %Response{data: type_spec}) do
      %Response{errors: [_ | _] = errors} ->
        {:error, Enum.map(errors, & &1["message"])}
      %Response{data: data} when not is_nil(data) -> {:ok, data}
    end
  end
  defp decode({:error, _}, _), do: {:error, "network error"}

  defp url(), do: "https://#{Config.endpoint()}/gql"
end
