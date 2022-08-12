import { Flex } from 'honorable'

import { Code } from '..'

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
  title: 'Code',
  component: Code,
}

function Template() {
  return (
    <Flex
      direction="column"
      gap="medium"
    >
      <Code
        language="js"
        width="600px"
      >
        {jsCode}
      </Code>
      <Code
        language="go"
        width="400px"
      >
        {goCode}
      </Code>
      <Code width="400px">
        One line
      </Code>
      <Code width="400px">
        {'Two lines\nTwo lines'}
      </Code>
      <Code width="400px">
        {'Three lines\nThree lines\nThree lines'}
      </Code>
    </Flex>
  )
}

export const Default = Template.bind({})
