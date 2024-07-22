defmodule Console.Cached.Base do
  import Kube.Client.Base, only: [path_builder: 3]

  defmacro __using__(_) do
    quote do
      import Console.Cached.Base

      def child_spec(_opts) do
        %{
          id: __MODULE__,
          start: {__MODULE__, :start_link, []},
          type: :worker,
          restart: :permanent,
          shutdown: 500
        }
      end
    end
  end

  def list_request(model) do
    {g, v, k} = model.gvk()
    %Kazan.Request{
      method: "get",
      path: path_builder(g, v, k),
      body: "",
      query_params: %{},
      content_type: "application/json",
      response_model: Module.concat(model, List)
    }
  end
end
