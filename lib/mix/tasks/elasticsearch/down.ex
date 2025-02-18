defmodule Mix.Tasks.Elasticsearch.Down do
  use Mix.Task
  require Tesla

  @host Application.compile_env(:elasticsearch, :host)
  @index Application.compile_env(:elasticsearch, :index)
  @vector_index Application.compile_env(:elasticsearch, :vector_index)

  def run(_) do
    Tesla.delete!("#{@host}/#{@index}")
    Tesla.delete("#{@host}/#{@vector_index}")
  end
end
