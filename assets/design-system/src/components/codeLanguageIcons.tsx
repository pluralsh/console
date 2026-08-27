import { type ReactNode } from 'react'

import type { IconProps } from './icons/createIcon'
import CppLogoIcon from './icons/CppLogoIcon'
import CSharpLogoIcon from './icons/CSharpLogoIcon'
import ElixirLogoIcon from './icons/ElixirLogoIcon'
import GoLogoIcon from './icons/GoLogoIcon'
import JavaLogoIcon from './icons/JavaLogoIcon'
import JavaScriptLogoIcon from './icons/JavaScriptLogoIcon'
import PhpLogoIcon from './icons/PhpLogoIcon'
import PythonLogoIcon from './icons/PythonLogoIcon'
import RubyLogoIcon from './icons/RubyLogoIcon'
import RustLogoIcon from './icons/RustLogoIcon'
import ScalaLogoIcon from './icons/ScalaLogoIcon'
import TerraformLogoIcon from './icons/TerraformLogoIcon'
import TypeScriptLogoIcon from './icons/TypeScriptLogoIcon'
import YamlLogoIcon from './icons/YamlLogoIcon'

const LANGUAGE_ICONS: Record<string, (props: IconProps) => ReactNode> = {
  yaml: YamlLogoIcon,
  yml: YamlLogoIcon,
  terraform: TerraformLogoIcon,
  tf: TerraformLogoIcon,
  hcl: TerraformLogoIcon,
  go: GoLogoIcon,
  golang: GoLogoIcon,
  python: PythonLogoIcon,
  py: PythonLogoIcon,
  rust: RustLogoIcon,
  rs: RustLogoIcon,
  javascript: JavaScriptLogoIcon,
  js: JavaScriptLogoIcon,
  jsx: JavaScriptLogoIcon,
  mjs: JavaScriptLogoIcon,
  cjs: JavaScriptLogoIcon,
  typescript: TypeScriptLogoIcon,
  ts: TypeScriptLogoIcon,
  tsx: TypeScriptLogoIcon,
  mts: TypeScriptLogoIcon,
  cts: TypeScriptLogoIcon,
  java: JavaLogoIcon,
  csharp: CSharpLogoIcon,
  cs: CSharpLogoIcon,
  'c#': CSharpLogoIcon,
  cpp: CppLogoIcon,
  'c++': CppLogoIcon,
  cc: CppLogoIcon,
  cxx: CppLogoIcon,
  hpp: CppLogoIcon,
  hh: CppLogoIcon,
  hxx: CppLogoIcon,
  elixir: ElixirLogoIcon,
  ex: ElixirLogoIcon,
  exs: ElixirLogoIcon,
  ruby: RubyLogoIcon,
  rb: RubyLogoIcon,
  php: PhpLogoIcon,
  scala: ScalaLogoIcon,
}

export function getCodeLanguageIcon(
  language?: string,
  props: IconProps = { size: 12, fullColor: true }
) {
  if (!language) return null

  const Icon = LANGUAGE_ICONS[language.toLowerCase().trim()]

  return Icon ? <Icon {...props} /> : null
}
