import { computed, ref } from 'vue';
import { addQuery } from './query.service';
import { askBuyerQuestion, detectCommand, CommandResult } from './ai.service';
import { knowledgeStats, searchKnowledge } from './knowledge.service';
import { AgentKind, AgentRun, AiReply, CloudModule, KnowledgeHit, WorkflowEvent } from '@/types';
import { nowISO, uid } from './storage.service';

export interface WorkflowResult<T> {
  result: T;
  run: AgentRun;
}

export const workflowRuns = ref<AgentRun[]>([]);
export const latestWorkflowRun = computed(() => workflowRuns.value[0] ?? null);

function startRun(agent: AgentKind, input: string): AgentRun {
  const run: AgentRun = { id: uid('run'), agent, input, events: [], createdAt: nowISO() };
  workflowRuns.value.unshift(run);
  workflowRuns.value = workflowRuns.value.slice(0, 20);
  return run;
}

function setEvent(run: AgentRun, module: CloudModule, action: string): WorkflowEvent {
  const event: WorkflowEvent = {
    id: uid('event'),
    runId: run.id,
    agent: run.agent,
    module,
    action,
    status: 'running',
    createdAt: nowISO()
  };
  run.events.push(event);
  return event;
}

async function runStep<T>(run: AgentRun, module: CloudModule, action: string, task: () => Promise<T> | T, detail: (value: T) => string = () => ''): Promise<T> {
  const event = setEvent(run, module, action);
  const started = Date.now();
  try {
    const value = await task();
    event.status = 'success';
    event.durationMs = Date.now() - started;
    event.detail = detail(value);
    return value;
  } catch (error) {
    event.status = 'failed';
    event.durationMs = Date.now() - started;
    event.detail = error instanceof Error ? error.message : '执行失败';
    throw error;
  }
}

function classifyQuestion(question: string): string {
  if (/清单|预算|装修|开学|药箱|推荐/.test(question)) return '场景化推荐';
  if (/怎么|如何|安装|使用|方法/.test(question)) return '知识问答';
  return '商品查询';
}

export async function runBuyerWorkflow(question: string, signal?: AbortSignal): Promise<WorkflowResult<AiReply>> {
  const run = startRun('shopping-advisor', question);
  await runStep(run, 'workflow-engine', '识别顾客意图', () => classifyQuestion(question), (value) => `意图：${value}`);
  const hits = await runStep(run, 'knowledge-engine', '检索商品、文档与图谱', () => searchKnowledge(question), (value) => {
    const stats = knowledgeStats(question);
    return `命中 ${value.length} 条知识，图谱关系 ${stats.graphEdges} 条`;
  });
  const reply = await runStep(run, 'llm-gateway', '生成导购回答', () => askBuyerQuestion(question, signal), (value) => value.demo ? '本地规则 Mock' : '云端大模型');
  await runStep(run, 'relational-db', '记录顾客咨询', () => addQuery(question, reply.text, reply.demo), () => 'customer_queries 已写入');
  await runStep(run, 'collaboration-center', '同步需求到智店管家', () => hits, (value) => `智店管家已收到咨询，关联知识 ${value.length} 条`);
  run.output = reply.text;
  return { result: reply, run };
}

export async function runStorekeeperWorkflow(command: string): Promise<WorkflowResult<CommandResult>> {
  const run = startRun('storekeeper', command);
  await runStep(run, 'workflow-engine', '解析经营指令', () => classifyQuestion(command), () => '商家经营任务');
  const result = await runStep(run, 'collaboration-center', '调度智店管家 Agent', () => detectCommand(command), (value) => value.changed ? '检测到商品数据变更' : '查询型任务');
  await runStep(run, 'relational-db', result.changed ? '持久化商品变更' : '读取经营数据', () => result, (value) => value.changed ? 'products 已同步' : '读取库存/报表数据');
  await runStep(run, 'llm-gateway', '生成经营反馈', () => result.reply, (value) => value.demo ? '本地指令 Mock' : '云端大模型');
  run.output = result.reply.text;
  return { result, run };
}

export function workflowEvents(run: AgentRun | null): WorkflowEvent[] {
  return run ? [...run.events].reverse() : [];
}

export function workflowKnowledge(question: string): KnowledgeHit[] {
  return searchKnowledge(question);
}

export function clearWorkflowRuns(): void {
  workflowRuns.value = [];
}
