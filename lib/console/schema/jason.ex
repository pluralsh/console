defimpl Jason.Encoder, for: [
  Console.Schema.ClusterNodePool.Taint,
  Console.Schema.ClusterNodePool.CloudSettings.Aws,
] do
  def encode(struct, opts) do
    Piazza.Ecto.Schema.mapify(struct)
    |> Jason.Encode.map(opts)
  end
end
