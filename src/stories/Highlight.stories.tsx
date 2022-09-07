import { Flex } from 'honorable'

import { Divider, Highlight } from '..'

const goCode = `package main

import "fmt"
          
func main() {
  fmt.Println("Hello, 世界")
}`

const jsCode = `function reverseString(str) {
  let newString = "";
  for (let i = str.length - 1; i >= 0; i--) {
      newString += str[i];
  }
  return newString;
}`

export default {
  title: 'Highlight',
  component: Highlight,
}

function Template() {
  return (
    <Flex
      width="600px"
      direction="column"
      gap="medium"
    >
      <Divider text="JavaScript" />
      <Highlight
        language="js"
        width="600px"
      >
        {jsCode}
      </Highlight>
      <Divider text="Go" />
      <Highlight
        language="go"
        width="400px"
      >
        {goCode}
      </Highlight>
    </Flex>
  )
}

export const Default = Template.bind({})
