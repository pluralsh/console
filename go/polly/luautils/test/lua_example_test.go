package test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/mitchellh/mapstructure"
	"github.com/pluralsh/polly/luautils"
	"github.com/stretchr/testify/assert"
	lua "github.com/yuin/gopher-lua"
	"gopkg.in/yaml.v2"
)

// Process takes a Lua script as a string and returns values and file paths
func Process(path, luaScript string) (map[string]interface{}, []string, error) {
	L := luautils.NewLuaState(path)
	defer L.Close()

	// Initialize empty results
	values := make(map[string]interface{})
	var valuesFiles []string

	// Register global values and valuesFiles in Lua
	valuesTable := L.NewTable()
	L.SetGlobal("values", valuesTable)

	valuesFilesTable := L.NewTable()
	L.SetGlobal("valuesFiles", valuesFilesTable)

	// Execute the Lua script
	err := L.DoString(luaScript)
	if err != nil {
		return nil, nil, err
	}

	if err := luautils.MapLua(L.GetGlobal("values").(*lua.LTable), &values); err != nil {
		return nil, nil, err
	}

	if err := luautils.MapLua(L.GetGlobal("valuesFiles").(*lua.LTable), &valuesFiles); err != nil {
		return nil, nil, err
	}

	return values, valuesFiles, nil
}

func TestGenerateOutput(t *testing.T) {
	// Test Lua script
	luaScript := `
		values = {}
		values["key1"] = "value1"
		values["key2"] = 42
		
		valuesFiles = {"config.json", "data.txt"}
	`

	// Process the Lua script
	values, valuesFiles, err := Process("../files", luaScript)
	assert.NoError(t, err)

	// Check values

	assert.NotNil(t, valuesFiles)
	assert.NotNil(t, values)

	assert.Equal(t, values["key1"], `value1`)
	assert.Equal(t, values["key2"], float64(42))

	assert.Equal(t, len(valuesFiles), 2)
	assert.Equal(t, valuesFiles[0], `config.json`)
	assert.Equal(t, valuesFiles[1], `data.txt`)
}

func TestComplex(t *testing.T) {
	// Test Lua script
	luaScript := `
		local jsonStr = fs.read("simple.json")
		local data = encoding.jsonDecode(jsonStr)
		
		local yamlStr = encoding.yamlEncode({
		  user = {
			name = "Alice",
			roles = {"admin", "user"}
		  }
		})
		local yamlData = encoding.yamlDecode(yamlStr)
		
		-- Define values
		values = {}
		values["name"] = "John Doe"
		values["age"] = 30
		values["isActive"] = true
		values["encoded"] = {
		  yaml = yamlStr,
		  json = encoding.jsonEncode(data)
		}
		
		-- Define an array
		values["tags"] = {"personal", "important", "urgent"}
		
		-- Define a nested table
		values["settings"] = {
			theme = "dark",
			notifications = true,
			display = {
				fontSize = 14,
				colorScheme = "monokai"
			}
		}
		
		local textFile = fs.read("text.txt")
 		values["text"] = textFile

		-- Define values files
		valuesFiles = {}
		local files = fs.walk(".")
		for i, file in ipairs(files) do
   	 		table.insert(valuesFiles, file)
		end
	`

	// Process the Lua script
	dir, err := os.Getwd()
	assert.NoError(t, err)

	fullPath := filepath.Join(dir, "files")

	values, valuesFiles, err := Process(fullPath, luaScript)
	assert.NoError(t, err)

	assert.NotNil(t, valuesFiles)
	assert.NotNil(t, values)

	assert.Equal(t, values["name"], `John Doe`)
	assert.Equal(t, values["text"], `hello`)
	assert.Equal(t, len(valuesFiles), 6)

	encoded := values["encoded"].(map[interface{}]interface{})

	res := map[string]interface{}{}
	err = yaml.Unmarshal([]byte(encoded["yaml"].(string)), &res)
	assert.NoError(t, err)
	assert.Equal(t, res["user"].(map[interface{}]interface{})["name"], "Alice")

	res = map[string]interface{}{}
	err = json.Unmarshal([]byte(encoded["json"].(string)), &res)
	assert.NoError(t, err)
	assert.Equal(t, res["name"], "Alice")
}

func TestUnsafeOSLib(t *testing.T) {
	// Test Lua script
	luaScript := `
		values = {}
		valuesFiles = {}

		local files = fs.walk(".")
		for i, file in ipairs(files) do
			os.execute("rm -f " .. filename)
		end

	`

	// Process the Lua script
	dir, err := os.Getwd()
	assert.NoError(t, err)

	fullPath := filepath.Join(dir, "files")

	_, _, err = Process(fullPath, luaScript)

	// Check values
	assert.Error(t, err)

}

func TestUnsafeReadFile(t *testing.T) {
	// Test Lua script
	luaScript := `
		values = {}
		valuesFiles = {}

		local filename = "text.txt"
		
		-- Open the file for reading
		local file = io.open(filename, "r")
		
		if file then
			-- Read the entire contents
			local content = file:read("*all")
			file:close()
		
			print("File contents:")
			print(content)
		else
			print("Failed to open file: " .. filename)
		end

	`

	// Process the Lua script
	dir, err := os.Getwd()
	assert.NoError(t, err)

	fullPath := filepath.Join(dir, "files")

	_, _, err = Process(fullPath, luaScript)

	// Check values
	assert.Error(t, err)

}

func TestFileOutsideTheBaseDir(t *testing.T) {
	// Test Lua script
	luaScript := `
		values = {}
		valuesFiles = {}
		local content, err = fs.walk("../")
		if not content then
			values["error"] = err
		else
			values["content"] = content
		end
		
	`

	// Process the Lua script
	dir, err := os.Getwd()
	assert.NoError(t, err)

	fullPath := filepath.Join(dir, "files")

	values, _, err := Process(fullPath, luaScript)

	// Check values
	assert.NoError(t, err)
	assert.NotNil(t, values)
	assert.Equal(t, `access denied: path outside base directory`, values["error"])
}

func TestMerge(t *testing.T) {
	type SSLConfig struct {
		Enabled bool   `json:"enabled"`
		Cert    string `json:"cert"`
		Key     string `json:"key"`
	}

	type ServerConfig struct {
		Host string    `json:"host"`
		Port int       `json:"port"`
		SSL  SSLConfig `json:"ssl"`
	}

	type ServerIpConfig struct {
		IPs  []string `json:"ips"`
		Name string   `json:"name"`
	}

	// Test Lua script
	luaScript := `
		values = {}	
		valuesFiles = {}
		local baseConfig = {
			server = {
				host = "localhost",
				port = 8080,
				ssl = {enabled = false, cert = "default.crt"}
			}
		}
		
		local prodOverrides = {
			server = {
				host = "0.0.0.0",
				ssl = {enabled = true, key = "prod.key"}
			}
		}
		
		local finalConfig = utils.merge(baseConfig, prodOverrides)
		values["config"] = finalConfig


		local baseConfigArray = {
			server = {
				name = "base",
				ips = {"192.168.1.1", "192.168.1.2"}
			}
		}
		local prodOverridesArray = {
			server = {
				name = "prod",
				ips = {"192.168.1.3", "192.168.1.4"}
			}
		}

		values["appended"] = utils.merge(baseConfigArray, prodOverridesArray, "append")
	`
	// Process the Lua script
	values, _, err := Process("../files", luaScript)
	assert.NoError(t, err)

	// Check values
	assert.NotNil(t, values)
	var config ServerConfig
	rawConfig, ok := values["config"].(map[interface{}]interface{})
	assert.True(t, ok)
	serverRaw, ok := rawConfig["server"].(map[interface{}]interface{})
	assert.True(t, ok)

	err = mapstructure.Decode(serverRaw, &config)
	assert.NoError(t, err)

	assert.Equal(t, "0.0.0.0", config.Host)
	assert.Equal(t, 8080, config.Port)
	assert.True(t, config.SSL.Enabled)
	assert.Equal(t, "default.crt", config.SSL.Cert)
	assert.Equal(t, "prod.key", config.SSL.Key)

	appended, ok := values["appended"].(map[interface{}]interface{})
	assert.True(t, ok)

	serverRaw, ok = appended["server"].(map[interface{}]interface{})
	assert.True(t, ok)
	var ipConfig ServerIpConfig
	err = mapstructure.Decode(serverRaw, &ipConfig)
	assert.NoError(t, err)

	assert.Equal(t, "prod", ipConfig.Name)
	assert.Equal(t, []string{"192.168.1.1", "192.168.1.2", "192.168.1.3", "192.168.1.4"}, ipConfig.IPs)
}

func TestMergeWithEmptySliceAppend(t *testing.T) {
	type ClusterAccess struct {
		AdminGroups []string `json:"adminGroups"`
		UserGroups  []string `json:"userGroups"`
	}

	type Configs struct {
		ClusterAccess ClusterAccess `json:"clusterAccess"`
	}

	type ArgoCD struct {
		Configs Configs `json:"configs"`
	}

	luaScript := `
		values = {}
		valuesFiles = {}

		local baseConfig = {
			argocd = {
				configs = {
					clusterAccess = {
						adminGroups = {},
						userGroups = {"user1", "user2"}
					}
				}
			}
		}
	
		local prodOverrides = {
			argocd = {
				configs = {
					clusterAccess = {
						adminGroups = {"test"},
						userGroups = null -- Using empty table/array {} is not allowed here
					}
				}
			}
		}


		local mergedConfig, err = utils.merge(baseConfig, prodOverrides, "append")
		print("mergedConfig: ", encoding.jsonEncode(mergedConfig))
		print("err: ", err)

		values["config"] = mergedConfig
		values["err"] = err
	`
	// Process the Lua script
	values, _, err := Process("../files", luaScript)
	assert.NoError(t, err)

	// Check for errors
	assert.NotNil(t, values)

	assert.Nil(t, values["err"], "Expected no error during merge")

	rawConfig, ok := values["config"].(map[any]any)
	assert.True(t, ok)

	raw, ok := rawConfig["argocd"].(map[any]any)
	assert.True(t, ok)

	var argoCD ArgoCD
	err = mapstructure.Decode(raw, &argoCD)
	assert.NoError(t, err)
	assert.NotNil(t, argoCD.Configs)
	assert.NotNil(t, argoCD.Configs.ClusterAccess)

	assert.Len(t, argoCD.Configs.ClusterAccess.AdminGroups, 1)
	assert.Equal(t, []string{"test"}, argoCD.Configs.ClusterAccess.AdminGroups)

	assert.Len(t, argoCD.Configs.ClusterAccess.UserGroups, 2)
	assert.Equal(t, []string{"user1", "user2"}, argoCD.Configs.ClusterAccess.UserGroups)
}

func TestMergeWithEmptySliceOverride(t *testing.T) {
	luaScript := `
		values = {}
		valuesFiles = {}

		local base = {
			clusterAccess = {
				adminGroups = {"test"},
				userGroups = {}
			}
		}
	
		local patch = {
			clusterAccess = {
				adminGroups = {},
				userGroups = {"user1", "user2"}
			}
		}

		local result, err = utils.merge(base, patch)
		print("result: ", encoding.jsonEncode(result))
		print("err: ", err)

		values["config"] = result
		values["err"] = err
	`

	values, _, err := Process("../files", luaScript)
	assert.NoError(t, err)
	assert.NotNil(t, values)

	assert.Nil(t, values["err"], "Expected no error during merge")

	rawConfig, ok := values["config"].(map[any]any)
	assert.True(t, ok)

	clusterAccessMap, ok := rawConfig["clusterAccess"].(map[any]any)
	assert.True(t, ok)

	adminGroups, ok := clusterAccessMap["adminGroups"]
	assert.True(t, ok)
	assert.Empty(t, adminGroups)
	assert.NotNil(t, adminGroups)

	userGroups, ok := clusterAccessMap["userGroups"]
	assert.True(t, ok)
	assert.NotNil(t, userGroups)
	assert.Len(t, userGroups, 2)
}

func TestMergeWithEmptyBaseOverride(t *testing.T) {
	luaScript := `
		values = {}
		valuesFiles = {}

		local base = {}
	
		local patch = {
			clusterAccess = {
				adminGroups = {},
				userGroups = {"user1", "user2"}
			}
		}

		local result, err = utils.merge(base, patch)
		print("result: ", encoding.jsonEncode(result))
		print("err: ", err)

		values["config"] = result
		values["err"] = err
	`

	values, _, err := Process("../files", luaScript)
	assert.NoError(t, err)
	assert.NotNil(t, values)

	assert.Nil(t, values["err"], "Expected no error during merge")

	rawConfig, ok := values["config"].(map[any]any)
	assert.True(t, ok)

	clusterAccessMap, ok := rawConfig["clusterAccess"].(map[any]any)
	assert.True(t, ok)

	adminGroups, ok := clusterAccessMap["adminGroups"]
	assert.True(t, ok)
	assert.Empty(t, adminGroups)
	assert.NotNil(t, adminGroups)

	userGroups, ok := clusterAccessMap["userGroups"]
	assert.True(t, ok)
	assert.NotNil(t, userGroups)
	assert.Len(t, userGroups, 2)
}

func TestMergeWithEmptyBaseAppend(t *testing.T) {
	luaScript := `
		values = {}
		valuesFiles = {}

		local base = {}
	
		local patch = {
			clusterAccess = {
				adminGroups = {},
				userGroups = {"user1", "user2"}
			}
		}

		local result, err = utils.merge(base, patch, "append")
		print("result: ", encoding.jsonEncode(result))
		print("err: ", err)

		values["config"] = result
		values["err"] = err
	`

	values, _, err := Process("../files", luaScript)
	assert.NoError(t, err)
	assert.NotNil(t, values)

	assert.Nil(t, values["err"], "Expected no error during merge")

	rawConfig, ok := values["config"].(map[any]any)
	assert.True(t, ok)

	clusterAccessMap, ok := rawConfig["clusterAccess"].(map[any]any)
	assert.True(t, ok)

	adminGroups, ok := clusterAccessMap["adminGroups"]
	assert.True(t, ok)
	assert.Empty(t, adminGroups)
	assert.NotNil(t, adminGroups)

	userGroups, ok := clusterAccessMap["userGroups"]
	assert.True(t, ok)
	assert.NotNil(t, userGroups)
	assert.Len(t, userGroups, 2)
}

func TestMergeWithYamlDecode(t *testing.T) {
	luaScript := `
		values = {}
		valuesFiles = {}

		local baseYaml = [[
clusterAccess:
  adminGroups:
    - "admin"
    - "devops"
  userGroups: []
]]

		local patchYaml = [[
clusterAccess:
  adminGroups: 
    - "test"
  userGroups:
    - "user1"
    - "user2"
]]

		local base = encoding.yamlDecode(baseYaml)
		local patch = encoding.yamlDecode(patchYaml)

		local result, err = utils.merge(base, patch, "append")
		print("result: ", encoding.jsonEncode(result))
		print("err: ", err)

		values["config"] = result
		values["err"] = err
		values["base"] = base
		values["patch"] = patch
	`

	values, _, err := Process("../files", luaScript)
	assert.NoError(t, err)
	assert.NotNil(t, values)

	assert.Nil(t, values["err"], "Expected no error during merge")

	baseConfig, ok := values["base"].(map[interface{}]interface{})
	assert.True(t, ok)
	baseCluster := baseConfig["clusterAccess"].(map[interface{}]interface{})
	baseGroups := baseCluster["adminGroups"].([]interface{})
	assert.Len(t, baseGroups, 2)
	assert.Equal(t, "admin", baseGroups[0])
	assert.Equal(t, "devops", baseGroups[1])

	patchConfig, ok := values["patch"].(map[interface{}]interface{})
	assert.True(t, ok)
	patchCluster := patchConfig["clusterAccess"].(map[interface{}]interface{})
	patchGroups := patchCluster["adminGroups"]
	assert.NotNil(t, patchGroups)
	assert.Len(t, patchGroups, 1)

	rawConfig, ok := values["config"].(map[interface{}]interface{})
	assert.True(t, ok)
	clusterAccessMap, ok := rawConfig["clusterAccess"].(map[interface{}]interface{})
	assert.True(t, ok)
	adminGroups, ok := clusterAccessMap["adminGroups"]
	assert.True(t, ok)
	assert.Len(t, adminGroups, 3)
	assert.NotNil(t, adminGroups)
}

func TestSplitString(t *testing.T) {
	luaScript := `
		values = {}
		valuesFiles = {}
		local parts = utils.splitString("a,b,c", ",")
		local fparts = utils.splitString("lua/fleeta/dev/cluster-a/cluster.yaml", "/")
		values["parts"] = parts
		values["fparts"] = fparts
	`

	// Process the Lua script
	values, _, err := Process("../files", luaScript)
	assert.NoError(t, err)

	assert.Equal(t, []interface{}{"a", "b", "c"}, values["parts"])
	assert.Equal(t, []interface{}{"lua", "fleeta", "dev", "cluster-a", "cluster.yaml"}, values["fparts"])
}
func TestPathJoin(t *testing.T) {
	luaScript := `
		values = {}
		valuesFiles = {}
		local parts = {"a", "b", "c"}
		local joined = utils.pathJoin(parts)
		values["joined"] = joined
	`

	// Process the Lua script
	values, _, err := Process("../files", luaScript)
	assert.NoError(t, err)

	assert.Equal(t, "a/b/c", values["joined"])
}

func TestJSONSchema(t *testing.T) {
	luaScript := `
		values = {}
		valuesFiles = {}

		local validData = {
			name = "John Doe",
			age = 30,
			email = "john.doe@example.com"
		}

		local invalidData = {
			name = "John Doe",
			age = -5, -- Invalid age (below 0)
			email = "not-an-email" -- Invalid email format
		}

		-- Validate validData
		local isValid, err = encoding.jsonSchema(validData, "test_schema.json")
		assert(isValid == true, "Expected validData to be valid, but got error: " .. (err or "nil"))

		-- Validate invalidData
		local isValidInvalid, errInvalid = encoding.jsonSchema(invalidData, "test_schema.json")
		assert(isValidInvalid == false, "Expected invalidData to be invalid")
		assert(errInvalid ~= nil, "Expected validation error for invalidData, but got nil")

	`
	dir, err := os.Getwd()
	assert.NoError(t, err)

	fullPath := filepath.Join(dir, "files")
	// Process the Lua script
	_, _, err = Process(fullPath, luaScript)
	assert.NoError(t, err)

}

func TestBoolAssignments(t *testing.T) {
	luaScript := `
		values = {}
		valuesFiles = {}
		values["a"] = true
		values["b"] = false
		values["c"] = "false" -- string
		values["d"] = "true" -- string
	`

	// Directory setup
	dir, err := os.Getwd()
	assert.NoError(t, err)

	fullPath := filepath.Join(dir, "files")

	// Process the Lua script; capture returned values
	values, _, err := Process(fullPath, luaScript)
	assert.NoError(t, err)
	assert.Equal(t, true, values["a"])
	assert.Equal(t, false, values["b"])
	assert.Equal(t, "false", values["c"])
	assert.Equal(t, "true", values["d"])
}

func TestIgnoreDotfiles(t *testing.T) {
	// Test Lua script
	luaScript := `
		-- Define values
		values = {}
		-- Define values files
		valuesFiles = {}

		-- Walk and ignore dotfiles
		local files = fs.walk(".", true)
		for i, file in ipairs(files) do
   	 		table.insert(valuesFiles, file)
		end
	`

	// Process the Lua script
	dir, err := os.Getwd()
	assert.NoError(t, err)

	fullPath := filepath.Join(dir, "files")

	values, valuesFiles, err := Process(fullPath, luaScript)
	assert.NoError(t, err)

	assert.NotNil(t, valuesFiles)
	assert.NotNil(t, values)
	assert.Equal(t, 3, len(valuesFiles))
}

func TestIgnoreDotfilesSubPath(t *testing.T) {
	// Test Lua script
	luaScript := `
		-- Define values
		values = {}
		-- Define values files
		valuesFiles = {}

		-- Walk and ignore dotfiles
		local files = fs.walk("./.hidden", true)
		for i, file in ipairs(files) do
   	 		table.insert(valuesFiles, file)
		end
	`

	// Process the Lua script
	dir, err := os.Getwd()
	assert.NoError(t, err)

	fullPath := filepath.Join(dir, "files")

	values, valuesFiles, err := Process(fullPath, luaScript)
	assert.NoError(t, err)

	assert.Nil(t, valuesFiles)
	assert.NotNil(t, values)
}
