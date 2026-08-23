/** 独立运行：扫描本机已安装的 Agent（codex / claude / openclaw / gemini）
 *  用法：npx tsx scan.ts
 */
import { printLocalAgents } from './scanner.js'

printLocalAgents()