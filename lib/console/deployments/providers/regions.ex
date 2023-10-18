defmodule Console.Deployments.Providers.Regions do
  @aws File.read!("static/regions/aws") |> String.split(~r/\R/)
  @gcp File.read!("static/regions/gcp") |> String.split(~r/\R/)
  @azure File.read!("static/regions/azure") |> String.split(~r/\R/)

  def aws(), do: @aws

  def gcp(), do: @gcp

  def azure(), do: @azure
end
