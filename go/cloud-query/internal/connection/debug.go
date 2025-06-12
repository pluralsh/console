package connection

func (in *connection) LoadedModules() ([]string, error) {
	rows, err := in.db.Query("SELECT name FROM pragma_module_list;")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]string, 0)
	for rows.Next() {
		var name string
		if err = rows.Scan(&name); err != nil {
			return nil, err
		}

		result = append(result, name)
	}

	return result, nil
}
