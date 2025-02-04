defmodule Mix.Tasks.Elasticsearch.Up do
  use Mix.Task
  require Tesla

  @host Application.compile_env(:elasticsearch, :host)
  @index Application.compile_env(:elasticsearch, :index)

  def run(_) do
    HTTPoison.start()
    with true <- index_exists?() do
      IO.puts("Elasticsearch index #{@index} already exists at #{@host}. Will delete")
      delete_index()
      IO.puts("Deleted index #{@index} at #{@host}")
    end

    create_index()
  end

  def index_exists?(index_name \\ @index) do
    Tesla.get!(url("/#{index_name}")).status == 200
  end

  def delete_index(index \\ @index) do
    url("/#{index}")
    |> Tesla.delete!()
  end

  def create_index(index \\ @index) do
    url("/#{index}")
    |> HTTPoison.put!("", [])
  end

  defp url(path), do: "#{@host}#{path}"
end
