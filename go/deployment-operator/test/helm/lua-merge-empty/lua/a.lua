values = {}

local baseStr = fs.read("templates/base.yaml")
local patchStr = fs.read("templates/patch.yaml")
local base = encoding.yamlDecode(baseStr)
local patch = encoding.yamlDecode(patchStr)