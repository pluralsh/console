defmodule Mix.Tasks.Elasticsearch.Down do
  use Mix.Task
  require Tesla
  require Logger

  @host Application.compile_env(:elasticsearch, :host)
  @index Application.compile_env(:elasticsearch, :index)
  @vector_index Application.compile_env(:elasticsearch, :vector_index)

  def run(_) do
    :ok = Enum.reduce_while(0..10, :ok, fn _, _ ->
      with {:ok, _} <- Tesla.delete("#{@host}/#{@index}"),
           {:ok, _} <- Tesla.delete("#{@host}/#{@vector_index}") do
        {:halt, :ok}
      else
        err ->
          Logger.error("Error deleting elasticsearch index: #{inspect(err)}")
          :timer.sleep(:timer.seconds(1))
          {:cont, err}
      end
    end)
  end
end
