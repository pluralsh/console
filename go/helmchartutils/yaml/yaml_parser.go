package yaml

import (
	"os"
	"sort"
	"strings"
)

const (
	commentLinePrefix  = "#"
	referenceDelimiter = "."
	indent             = "  "
)

type ItemsTreeNode struct {
	children map[string]*ItemsTreeNode
}

func NewItemsTreeNode() *ItemsTreeNode {
	return &ItemsTreeNode{
		children: map[string]*ItemsTreeNode{},
	}
}

func ParseYaml(filepath string) []string {
	data, err := os.ReadFile(filepath)
	if err != nil {
		panic(err)
	}

	return strings.Split(string(data), "\n")
}

func BuildReferenceTree(data []string, prefix string, root *ItemsTreeNode) {
	for _, line := range data {
		// Ignore comments
		if strings.HasPrefix(line, commentLinePrefix) {
			continue
		}

		tokens := strings.Split(line, " ")
		for _, token := range tokens {
			// some tokens may have braces due to not being spaced, remove braces
			token = strings.ReplaceAll(token, "}", "")
			if strings.HasPrefix(token, prefix) {
				insertIntoTree(strings.Split(token, referenceDelimiter), root)
			}
		}
	}
}

func ItemTreeToString(node *ItemsTreeNode) string {
	// root node should have exactly one child
	// since the root node is "empty" we can just use its child (avoid extra indent)
	keys := make([]string, 0, len(node.children))
	for key := range node.children {
		keys = append(keys, key)
	}

	return strings.Join(treeToString(node.children[keys[0]], "", indent), "\n")
}

func treeToString(node *ItemsTreeNode, currIndent, indent string) []string {
	lines := []string{}
	sortedKeys := make([]string, 0, len(node.children))
	for key := range node.children {
		sortedKeys = append(sortedKeys, key)
	}
	sort.Strings(sortedKeys)

	for _, key := range sortedKeys {
		lines = append(lines, currIndent+key)
		lines = append(lines, treeToString(node.children[key], currIndent+indent, indent)...)
	}

	return lines
}

func insertIntoTree(data []string, node *ItemsTreeNode) {
	for _, item := range data {
		_, exists := node.children[item]
		if !exists {
			node.children[item] = &ItemsTreeNode{
				children: map[string]*ItemsTreeNode{},
			}
		}
		node = node.children[item]
	}
}
