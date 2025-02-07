defmodule Mix.Tasks.Elasticsearch.Down do
  use Mix.Task
  require Tesla

  @host Application.compile_env(:elasticsearch, :host)
  @index Application.compile_env(:elasticsearch, :index)

  def run(_) do
    Tesla.delete!("#{@host}/#{@index}")
  end
end
