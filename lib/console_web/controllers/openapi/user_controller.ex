defmodule ConsoleWeb.OpenAPI.UserController do
  use ConsoleWeb, :api_controller

  operation :me,
    operation_id: "Me",
    tags: ["user"],
    responses: [ok: OpenAPI.User]
  def me(conn, _) do
    user = Console.Guardian.Plug.current_resource(conn)
    json(conn, Console.OpenAPI.User.wire_format(user))
  end
end
