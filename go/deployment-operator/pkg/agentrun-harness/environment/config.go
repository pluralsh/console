package environment

import (
	"encoding/json"
	"os"
	"path"
)

const (
	configFilename = ".plrl.json"
)

type Config struct {
	BaseBranch string
	Dir        string
}

func Load() (*Config, error) {
	contents, err := os.ReadFile(configFile())
	if err != nil {
		return nil, err
	}

	var config Config
	if err := json.Unmarshal(contents, &config); err != nil {
		return nil, err
	}

	return &config, nil
}

func (c *Config) Save() error {
	json, err := json.Marshal(c)
	if err != nil {
		return err
	}

	return os.WriteFile(configFile(), json, 0644)
}

func configFile() string {
	tmpDir := os.TempDir()
	return path.Join(tmpDir, configFilename)
}
