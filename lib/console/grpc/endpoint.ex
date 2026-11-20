defmodule Console.GRPC.Endpoint do
  use GRPC.Endpoint
  intercept GRPC.Server.Interceptors.Logger
  run Console.GRPC.Server
  run Console.GRPC.Devbox.Ingest
end
