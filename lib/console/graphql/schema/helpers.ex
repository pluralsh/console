defmodule Console.GraphQl.Schema.Helpers do
  import Absinthe.Resolution.Helpers

  def manual_dataloader(loader, resolver, queryable, args) do
    loader
    |> Dataloader.load(resolver, queryable, args)
    |> on_load(fn loader ->
      {:ok, Dataloader.get(loader, resolver, queryable, args)}
    end)
  end
end
