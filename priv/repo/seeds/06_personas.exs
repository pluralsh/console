import Botanist

alias Console.Services.Users

seed do
  config = fn fields -> Map.new(fields, & {&1, true}) end
  {:ok, _} = Users.create_persona(%{
    name: "platform",
    description: "Platform engineer persona with access to all features",
    configuration: %{all: true}
  })

  {:ok, _} = Users.create_persona(%{
    name: "developer",
    description: "Developer persona with access to features relevant to microservice deployment",
    configuration: %{
      deployments: config.(~w(clusters services pipelines)a),
      sidebar: config.(~w(kubernetes pull_requests)a)
    }
  })
end
