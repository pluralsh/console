import { type ReactNode } from 'react'

import type { IconProps } from './icons/createIcon'
import CLogoIcon from './icons/CLogoIcon'
import CppLogoIcon from './icons/CppLogoIcon'
import CSharpLogoIcon from './icons/CSharpLogoIcon'
import ElixirLogoIcon from './icons/ElixirLogoIcon'
import ErlangLogoIcon from './icons/ErlangLogoIcon'
import GoLogoIcon from './icons/GoLogoIcon'
import GroovyLogoIcon from './icons/GroovyLogoIcon'
import JavaLogoIcon from './icons/JavaLogoIcon'
import JavaScriptLogoIcon from './icons/JavaScriptLogoIcon'
import JsonLogoIcon from './icons/JsonLogoIcon'
import LispLogoIcon from './icons/LispLogoIcon'
import PerlLogoIcon from './icons/PerlLogoIcon'
import PhpLogoIcon from './icons/PhpLogoIcon'
import PythonLogoIcon from './icons/PythonLogoIcon'
import RubyLogoIcon from './icons/RubyLogoIcon'
import RustLogoIcon from './icons/RustLogoIcon'
import ScalaLogoIcon from './icons/ScalaLogoIcon'
import SqlLogoIcon from './icons/SqlLogoIcon'
import SwiftLogoIcon from './icons/SwiftLogoIcon'
import TerminalIcon from './icons/TerminalIcon'
import TerraformLogoIcon from './icons/TerraformLogoIcon'
import TomlLogoIcon from './icons/TomlLogoIcon'
import TypeScriptLogoIcon from './icons/TypeScriptLogoIcon'
import YamlLogoIcon from './icons/YamlLogoIcon'
import ZigLogoIcon from './icons/ZigLogoIcon'

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
  erlang: ErlangLogoIcon,
  erl: ErlangLogoIcon,
  groovy: GroovyLogoIcon,
  gvy: GroovyLogoIcon,
  gy: GroovyLogoIcon,
  lisp: LispLogoIcon,
  clisp: LispLogoIcon,
  commonlisp: LispLogoIcon,
  'common-lisp': LispLogoIcon,
  elisp: LispLogoIcon,
  'emacs-lisp': LispLogoIcon,
  perl: PerlLogoIcon,
  pl: PerlLogoIcon,
  pm: PerlLogoIcon,
  ruby: RubyLogoIcon,
  rb: RubyLogoIcon,
  php: PhpLogoIcon,
  scala: ScalaLogoIcon,
  json: JsonLogoIcon,
  jsonc: JsonLogoIcon,
  json5: JsonLogoIcon,
  toml: TomlLogoIcon,
  bash: TerminalIcon,
  sh: TerminalIcon,
  shell: TerminalIcon,
  zsh: TerminalIcon,
  fish: TerminalIcon,
  ksh: TerminalIcon,
  console: TerminalIcon,
  terminal: TerminalIcon,
  zig: ZigLogoIcon,
  ziglang: ZigLogoIcon,
  c: CLogoIcon,
  sql: SqlLogoIcon,
  mysql: SqlLogoIcon,
  pgsql: SqlLogoIcon,
  postgresql: SqlLogoIcon,
  plsql: SqlLogoIcon,
  sqlite: SqlLogoIcon,
  tsql: SqlLogoIcon,
  swift: SwiftLogoIcon,
}

export function getCodeLanguageIcon(
  language?: string,
  props: IconProps = { size: 12, fullColor: true }
) {
  if (!language) return null

  const Icon = LANGUAGE_ICONS[language.toLowerCase().trim()]

  return Icon ? <Icon {...props} /> : null
}
