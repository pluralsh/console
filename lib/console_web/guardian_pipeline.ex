defmodule ConsoleWeb.GuardianPipeline do
  use Guardian.Plug.Pipeline, otp_app: :console,
                              module: Console.Guardian,
                              error_handler: ConsoleWeb.Plug.AuthErrorHandler

  plug ConsoleWeb.Plugs.Token
  plug Guardian.Plug.VerifySession
  plug Guardian.Plug.VerifyHeader, realm: "Bearer"
  # plug Guardian.Plug.EnsureAuthenticated
  plug Guardian.Plug.LoadResource, allow_blank: true
end
