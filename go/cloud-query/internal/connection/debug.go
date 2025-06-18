package connection

func (in *connection) LoadedModules() ([][]any, error) {
	_, rows, err := in.Query("SELECT * FROM pg_extension")
	if err != nil {
		return nil, err
	}

	return rows, nil
}
