import yaml


def readYaml(file_path):
    try:
        with open(file_path, "r") as file:
            yaml_file = yaml.safe_load(file)
        return yaml_file
    except FileNotFoundError:
        print(f"Error: The file {file_path} was not found.")
    except yaml.YAMLError as exc:
        print(f"Error parsing YAML file: {exc}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
    return None
