import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// Exercise the real sidebar render function with inert hooks; no RPC or model.
function render(notification,card=null,extra={},open=true,tab='overview',tabChanges=[],localeCode='zh',hookValues={},runtime={}){
 const finding={observation:'AUDIT_OBSERVATION',interpretation:'AUDIT_INTERPRETATION',suggestion:'AUDIT_SUGGESTION',evidenceIds:['event'],userMessageIds:['user']};
 const data={taskId:'task',status:{status:'active'},budget:{config:{}},intent:{messages:[{id:'user',text:'ORIGINAL_USER'}]},card,reports:[{id:'r',created:'2026-09-14T00:00:00Z',report:{status:'assessed-partial',history:{partial:true,totalEvents:2,includedEvents:1,omittedEvents:1,truncatedEvents:0},result:{findings:[finding],notification}}}],...extra};
 const values=[open,tab,data,'',false,'','ask',0,null,{},null],refs=[];let cursor=0,Panel;
 Object.assign(values,hookValues);
 const localeListeners=new Set();const locale={getLocale:()=>({active:localeCode}),subscribe:listener=>{localeListeners.add(listener);return()=>localeListeners.delete(listener);}};
 const React={createElement:(type,props,...children)=>({type,props,children}),Fragment:'fragment',useState:initial=>{const index=cursor++;if(!(index in values))values[index]=initial;return [values[index],value=>{values[index]=typeof value==='function'?value(values[index]):value;if(index===1)tabChanges.push(values[index]);}];},useRef:initial=>{const index=cursor++;return refs[index]??(refs[index]={current:initial});},useEffect:effect=>runtime.effects?.push(effect),useSyncExternalStore:(subscribe,getSnapshot)=>{if(!localeListeners.size)subscribe(()=>rerender());return getSnapshot();}};
 const window={__TASKWATCH_RPC_TRANSPORT__:Object.hasOwn(runtime,'transport')?runtime.transport:'channel',__ModuleLoader__:{load:({factory})=>{const mod=factory(()=>React);mod.apply({effect:fn=>fn(),slots:{register:(_spec,component)=>{Panel=component;}},connection:{rpc:{call:()=>{throw new Error('Unexpected RPC');}}},locale});}}};
 runInNewContext(readFileSync(new URL('../plugins/taskwatch/client.js',import.meta.url),'utf8'),{window,setInterval:()=>0,clearInterval:()=>{}});
 let rerender;
 rerender=()=>{cursor=0;const tree=Panel({useSessions:fn=>fn({current:'session'}),rpc:{call:runtime.call??(()=>{throw new Error('Unexpected RPC');})},locale});Object.defineProperty(tree,'rerender',{value:rerender});Object.defineProperty(tree,'switchLocale',{value:code=>{localeCode=code;for(const listener of localeListeners)listener();return rerender();}});Object.defineProperty(tree,'localeListeners',{value:localeListeners});return tree;};
 return rerender();
}
function nodes(node,predicate){
 if(node==null||typeof node!=='object')return [];
 if(Array.isArray(node))return node.flatMap(child=>nodes(child,predicate));
 return [...(predicate(node)?[node]:[]),...nodes(node.children,predicate)];
}
function text(node,expanded=false){
 if(node==null||typeof node==='boolean')return '';
 if(typeof node!=='object')return String(node);
 if(Array.isArray(node))return node.map(x=>text(x,expanded)).join(' ');
 if(node.type==='style')return '';
 if(node.type==='details'&&!expanded)return text(node.children.filter(x=>x?.type==='summary'),expanded);
 return text(node.children,expanded);
}
test('silent partial sidebar shows scope, collapses audit, and retains typed original references',()=>{
 const tree=render({shouldNotify:false,findingIndexes:[]});const visible=text(tree);
 assert.match(visible,/本次无需提醒/);assert.match(visible,/仅局部检查/);assert.match(visible,/查看内部复核记录/);
 assert.doesNotMatch(visible,/AUDIT_OBSERVATION|AUDIT_SUGGESTION/);
 assert.match(visible,/当前任务.*ORIGINAL_USER/s);
 assert.match(text(tree,true),/AUDIT_OBSERVATION/);assert.match(text(tree,true),/ORIGINAL_USER/);
});
test('selected conflict appears in the default sidebar instead of being hidden as audit',()=>{
 const visible=text(render({shouldNotify:true,findingIndexes:[0]}));
 assert.match(visible,/AUDIT_OBSERVATION/);assert.match(visible,/AUDIT_SUGGESTION/);assert.doesNotMatch(visible,/本次无需提醒/);
});
test('a clarification card labels its supervisor-only source and offers answer, later and dismiss actions',()=>{
 const card={id:'card',status:'pending',requirementIds:['goal'],evidenceIds:[],tradeoff:{basis:'execution',impact:'会影响交付范围',question:'优先速度还是完整性？'}};
 const visible=text(render({shouldNotify:false,findingIndexes:[]},card,{intent:{current:{goal:{text:'完成可读的登录分析'}},messages:[]}},true,'tradeoffs'));
 assert.match(visible,/需要你确认的取舍/);assert.match(visible,/优先速度还是完整性？/);assert.match(visible,/执行证据/);assert.match(visible,/不会发送给主 Agent/);assert.match(visible,/回答 稍后 忽略/);
 assert.match(visible,/完成可读的登录分析/);
});
test('card audit exposes stale evidence and capture failures without showing normal capture state',()=>{
 const card={id:'card',status:'answering',requirementIds:['goal'],evidenceIds:['e1'],tradeoff:{basis:'execution',impact:'范围改变',question:'选择哪个？'}};
 const history=[{id:'old',status:'stale',report_id:'report-1',main_version:2,through_seq:8,side_version:1,answer:'旧回答',answerStatus:'timeout'}];
 const visible=text(render({shouldNotify:false,findingIndexes:[]},card,{cardHistory:history,validationStatus:{status:'capture-failed'}},true,'tradeoffs'),true);
 assert.match(visible,/回答处理中/);assert.match(visible,/澄清卡片历史/);assert.match(visible,/旧回答/);assert.match(visible,/本地候选采集失败/);
 assert.doesNotMatch(text(render({shouldNotify:false,findingIndexes:[]},null,{validationStatus:{status:'captured'}})),/本地候选采集失败/);
});
test('incomplete assessment shows rejected positions but never exposes unvalidated raw output',()=>{
 const data={reports:[{id:'r',created:'2026-09-14T00:00:00Z',report:{status:'assessed-incomplete',result:{findings:[],notification:{shouldNotify:false,findingIndexes:[]},validation:{complete:false,rejected:[{kind:'progress',index:1,errorCode:'Invalid progress'}]},rawOutput:'UNVALIDATED_RAW_OUTPUT'}}}]};
 const visible=text(render({shouldNotify:false,findingIndexes:[]},null,data),true);
 assert.match(visible,/评估不完整/);assert.match(visible,/progress #1/);assert.match(visible,/Invalid progress/);
 assert.doesNotMatch(visible,/UNVALIDATED_RAW_OUTPUT/);
});
test('answer draft is keyed to both task and card and input remounts on a card change',()=>{
 const client=readFileSync(new URL('../plugins/taskwatch/client.source.mjs',import.meta.url),'utf8');
 assert.match(client,/const cardKey=card\?`\$\{data\?\.taskId\?\?''\}:\$\{card\.id\}`:null/);
 assert.match(client,/h\('textarea',\{key:card\.id,defaultValue:answerDraft\.current\.text/);
 assert.match(client,/answerDraft\.current\.key===cardKey\?answerDraft\.current\.text/);
});
test('an enabled project asks for task consent outside the collapsed sidebar',()=>{
 const tree=render({shouldNotify:false,findingIndexes:[]},null,{taskId:null,project:{enabled:true,path:'/project'},consent:{status:'pending'},sessionWorkspace:'/project',budget:{config:{enabled:true}}},false);
 const visible=text(tree);
 assert.match(visible,/是否在这个任务启用监督/);
 assert.match(visible,/启用监督/);
 assert.match(visible,/跳过本任务/);
 assert.equal(tree.children.some(node=>node?.props?.role==='dialog'),true);
});
test('status presents current intent and latest user task without a clarification card',()=>{
 const card={id:'card',status:'pending',requirementIds:['goal'],evidenceIds:[],tradeoff:{basis:'proposal',impact:'增加步骤',question:'要增加吗？'}};
 const intent={current:{goal:{text:'完成项目目标'}},messages:[{id:'u1',text:'先规划'},{id:'u2',text:'实现当前任务'}]};
 const tree=render({shouldNotify:false,findingIndexes:[]},card,{intent});
 const visible=text(tree);
 assert.match(visible,/取舍（1）/);
 assert.match(visible,/当前任务.*完成项目目标/s);
 assert.match(visible,/当前任务.*实现当前任务/s);
 assert.match(visible,/下一步 · 待回答的取舍.*要增加吗？.*查看取舍/s);
 assert.doesNotMatch(visible,/回答只更新监督理解/);
});
test('tradeoff tab owns the clarification card and gives repeated requirements stable distinct keys',()=>{
 const card={id:'card',status:'pending',requirementIds:['goal','requirements:0'],evidenceIds:[],tradeoff:{basis:'proposal',impact:'增加步骤',question:'要增加吗？'}};
 const intent={current:{goal:{text:'完成项目目标'},requirements:[{text:'保持简单'}]},messages:[{id:'u1',text:'实现当前任务'}]};
 const tree=render({shouldNotify:false,findingIndexes:[]},card,{intent},true,'tradeoffs');
 const visible=text(tree);
 assert.match(visible,/需要你确认的取舍.*要增加吗？/s);
 assert.match(visible,/整体目标.*完成项目目标/s);
 assert.doesNotMatch(visible,/goal ·|requirements:0 ·/);
 const related=nodes(tree,node=>node.type==='p'&&(/关联要求|整体目标/).test(text(node)));
 assert.equal(related.length,2);
 assert.equal(new Set(related.map(node=>node.props.key)).size,2);
 assert.doesNotMatch(visible,/当前执行证据|最近监督报告/);
});
test('status keeps a long latest task compact while preserving its full original on demand',()=>{
 const original='任务说明'.repeat(300)+'结束标记';
 const tree=render({shouldNotify:false,findingIndexes:[]},null,{intent:{current:{goal:{text:'完成目标'}},messages:[{id:'u1',text:original}]}});
 const visible=text(tree);
 assert.match(visible,/当前任务/);
 assert.match(visible,/查看完整用户消息/);
 assert.doesNotMatch(visible,/结束标记/);
 assert.match(text(tree,true),/结束标记/);
});
test('supervisor usage stays at the top across tabs and distinguishes measured from missing metrics',()=>{
 const task={calls:3,measuredCalls:2,unknownCalls:1,inputTokens:100,outputTokens:40,cacheReadTokens:50,cacheWriteTokens:10,cacheHitPercent:31.25,last:{firstTokenMs:250,tokensPerSecond:20}};
 const extra={budget:{config:{},requestsUsed:8},supervisorUsage:{task,global:task,recent:[{checkId:'one',category:'assessment',status:'completed',requests:1,inputTokens:100,outputTokens:40,cacheReadTokens:50,cacheWriteTokens:10,totalMs:2000,created:'2026-09-14T00:00:00Z'}]}};
 for(const tab of ['overview','chat']){
  const tree=render({shouldNotify:false,findingIndexes:[]},null,extra,true,tab);
  const visible=text(tree);
  assert.match(visible,/监督用量 · 当前任务/);
  assert.match(visible,/输入\s+160.*输出\s+40.*缓存命中¹\s+31\.3%.*调用\s+3.*首字\s+0\.3s.*速度\s+20\.0 tok\/s/s);
  assert.match(visible,/1 次用量未知/);
  assert.match(text(tree,true),/最近调用（1）.*执行审查/s);
  assert.equal(nodes(tree,node=>node.props?.['aria-label']==='监督模型用量').length,1);
 }
});
test('status shows the actual checkpoint reason, queue time and side correction wait',()=>{
 const checkpoint={lastReason:'assistant',lastCheckedAt:Date.parse('2026-09-20T12:00:00Z'),pendingReason:'tool-batch',nextCheckAt:Date.parse('2026-09-20T12:03:00Z'),waitingForCheckpoint:true};
 const visible=text(render({shouldNotify:false,findingIndexes:[]},null,{checkpoint}));
 assert.match(visible,/上次检查：公开回复/);assert.match(visible,/排队检查：工具批次 · 最早/);assert.match(visible,/监督理解已更新，等待下个检查点/);
});
test('three goal layers and a shared-change preview stay distinct in status',()=>{
 const goalHierarchy={project:{version:2,summary:'减少无用功',items:[{id:'p',collection:'成功标准',text:'发现跑偏'}]},phase:{id:'phase',version:1,name:'可靠验收',outcome:'验证监督器',items:[]},phaseHistory:[{id:'phase',version:1,name:'可靠验收',outcome:'验证监督器',status:'active'}],task:{formalGoal:'完成当前实现',supervisorRevision:1,supervisorOverlay:{goal:'只做离线验证'},supervisorCurrent:true}};
 const pendingGoalChange={id:'d',operations:[{tool:'set_summary',layer:'project',text:'守住整体目标',source:'项目主旨改为守住整体目标'}],preview:[{tool:'set_summary',layer:'project',before:'减少无用功',after:'守住整体目标',source:'项目主旨改为守住整体目标'}]},goalHistory=[{id:'h',layer:'project',version:2,source:'项目主旨改为减少无用功',created:'2026-09-21T00:00:00Z'}],goalDocument={privatePath:'/private/projects/hash/intent.md'};const extra={goalHierarchy,pendingGoalChange,goalHistory,goalDocument,project:{path:'/workspace',enabled:true}};const tree=render({shouldNotify:false,findingIndexes:[]},null,extra),visible=text(tree);assert.match(visible,/项目主旨.*减少无用功/s);assert.match(visible,/当前阶段.*可靠验收.*验证监督器/s);assert.match(visible,/当前任务.*完成当前实现.*只做离线验证.*未同步主 Agent/s);assert.match(visible,/下一步 · 待确认的目标修改.*查看目标修改/s);assert.doesNotMatch(visible,/确认修改.*驳回/s);assert.match(visible,/发布给项目 Agent/);const expanded=text(tree,true);assert.match(expanded,/写入路径.*\/workspace\/.taskwatch\/intent.md/s);assert.match(expanded,/确认发布给项目 Agent/);assert.match(expanded,/阶段历史（1）.*可靠验收/s);assert.match(expanded,/共享目标修改历史（1）.*原话：项目主旨改为减少无用功/s);assert.match(text(render({shouldNotify:false,findingIndexes:[]},null,extra,true,'goals')),/待确认的共享目标修改.*守住整体目标.*确认修改.*驳回/s);
});
test('next step prioritizes time-sensitive coach approval and navigates to its tab',()=>{
 const changes=[];
 const card={id:'card',status:'pending',requirementIds:[],evidenceIds:[],tradeoff:{basis:'proposal',impact:'增加步骤',question:'接受吗？'}};
 const extra={coach:{project:{enabled:true},taskConsented:true,suggestions:[{id:'s',risk:'approval',status:'approval',expires:4102444800000,text:'建议正文'}]},sharedGoalCandidates:[{id:'c',status:'pending',layer:'project',operations:[],preview:[]}]};
 const tree=render({shouldNotify:false,findingIndexes:[]},card,extra,true,'overview',changes);
 const next=nodes(tree,node=>node.props?.['aria-label']==='下一步')[0];
 assert.match(text(next),/待审批的纠偏建议/);
 assert.doesNotMatch(text(next),/需要你确认的取舍|项目主旨候选/);
 nodes(next,node=>node.type==='button')[0].props.onClick();
 assert.deepEqual(changes,['coach']);
 assert.match(text(tree),/目标（1）.*纠偏（1）/s);
});
test('next step routes tradeoffs and goal drafts while idle and incomplete states stay honest',()=>{
 const card={id:'card',status:'pending',requirementIds:[],evidenceIds:[],tradeoff:{basis:'proposal',impact:'增加步骤',question:'接受吗？'}};
 const changes=[];
 let tree=render({shouldNotify:false,findingIndexes:[]},card,{pendingGoalChange:{id:'d',operations:[],preview:[]}},true,'overview',changes);
 let next=nodes(tree,node=>node.props?.['aria-label']==='下一步')[0];
 assert.match(text(next),/待回答的取舍/);nodes(next,node=>node.type==='button')[0].props.onClick();assert.deepEqual(changes,['tradeoffs']);
 tree=render({shouldNotify:false,findingIndexes:[]},null,{pendingGoalChange:{id:'d',operations:[],preview:[]}});
 next=nodes(tree,node=>node.props?.['aria-label']==='下一步')[0];assert.match(text(next),/待确认的目标修改/);
 assert.doesNotMatch(text(tree),/待确认的共享目标修改.*确认修改/s);
 tree=render({shouldNotify:false,findingIndexes:[]},null,{reports:[{id:'r',created:'2026-09-14T00:00:00Z',report:{status:'assessed-incomplete',result:{findings:[],notification:{shouldNotify:false,findingIndexes:[]}}}}]});
 next=nodes(tree,node=>node.props?.['aria-label']==='下一步')[0];assert.match(text(next),/评估不完整/);
 tree=render({shouldNotify:false,findingIndexes:[]},null,{reports:[]});
 next=nodes(tree,node=>node.props?.['aria-label']==='下一步')[0];assert.match(text(next),/正在观察|等待下个检查点/);
});
test('consent modal stays the single task-enablement action',()=>{
 const tree=render({shouldNotify:false,findingIndexes:[]},null,{taskId:null,project:{enabled:true,path:'/project'},consent:{status:'pending'},sessionWorkspace:'/project',budget:{config:{enabled:true}}});
 assert.equal(nodes(tree,node=>node.props?.role==='dialog').length,1);
 assert.equal(nodes(tree,node=>node.props?.['aria-label']==='下一步').length,0);
});
test('goal page owns shared draft and renders candidate changes as readable differences with collapsed sources',()=>{
 const pendingGoalChange={id:'d',operations:[{tool:'set_summary',layer:'project',text:'守住整体目标',source:'修改主旨'}],preview:[{tool:'set_summary',layer:'project',before:'减少无用功',after:'守住整体目标',source:'修改主旨'}]};
 const candidate={id:'c',status:'pending',layer:'phase',basis:'explicit',operations:[{tool:'propose_phase_transition',name:'验收阶段',outcome:'验证任务',acceptance:['五个样本'],sources:[{taskId:'t',messageId:'m',quote:'用户原话标记'}]}],preview:[{tool:'propose_phase_transition',before:{name:'开发阶段',outcome:'完成实现'},after:{name:'验收阶段',outcome:'验证任务',acceptance:['五个样本']}}]};
 const tree=render({shouldNotify:false,findingIndexes:[]},null,{pendingGoalChange,sharedGoalCandidates:[candidate]},true,'goals');
 const visible=text(tree),expanded=text(tree,true);
 assert.match(visible,/待确认的共享目标修改.*减少无用功.*守住整体目标.*确认修改/s);
 assert.match(visible,/当前阶段候选.*用户明确表述.*开发阶段.*验收阶段.*五个样本/s);
 assert.match(visible,/仅更新监督目标.*未同步主 Agent/);
 assert.match(visible,/查看用户原话/);assert.doesNotMatch(visible,/用户原话标记/);
 assert.match(expanded,/用户原话标记/);
 assert.doesNotMatch(visible,/\{"name":/);
});
test('candidate difference labels additions removals and updates without raw JSON',()=>{
 const operations=[
  {tool:'add_item',layer:'project',collection:'constraints',text:'保留权限边界',sources:[{taskId:'t',messageId:'m',quote:'保留权限边界'}]},
  {tool:'update_item',layer:'project',itemId:'i',text:'优先体验',sources:[{taskId:'t',messageId:'m',quote:'优先体验'}]},
  {tool:'remove_item',layer:'project',itemId:'j',sources:[{taskId:'t',messageId:'m',quote:'撤销旧要求'}]}
 ];
 const preview=[{collection:'constraints',before:null,after:'保留权限边界'},{collection:'priorities',before:'优先速度',after:'优先体验'},{collection:'nonGoals',before:'旧要求',after:null}];
 const visible=text(render({shouldNotify:false,findingIndexes:[]},null,{sharedGoalCandidates:[{id:'c',status:'pending',layer:'project',basis:'inferred',operations,preview}]},true,'goals'));
 assert.match(visible,/跨任务归纳/);
 assert.match(visible,/新增持续约束.*保留权限边界/s);
 assert.match(visible,/更新优先级.*优先速度.*优先体验/s);
 assert.match(visible,/删除非目标.*旧要求/s);
 assert.doesNotMatch(visible,/constraints|priorities|nonGoals/);
});
test('coach header describes actual main-agent sending permission',()=>{
 const base={shouldNotify:false,findingIndexes:[]};
 assert.match(text(render(base,null,{coach:{project:{enabled:false},taskConsented:false}})),/仅观察，不向主 Agent 发送/);
 assert.match(text(render(base,null,{coach:{project:{enabled:true},taskConsented:false}})),/项目 coach 已开启.*本任务未同意/);
 assert.match(text(render(base,null,{coach:{project:{enabled:true},taskConsented:true}})),/可能向运行中的主 Agent 发送纠偏/);
});
test('expired or unauthorized coach suggestions are not presented as sendable approvals',()=>{
 const base={shouldNotify:false,findingIndexes:[]};
 const suggestion={id:'s',risk:'approval',status:'approval',expires:1,text:'旧建议'};
 let tree=render(base,null,{coach:{project:{enabled:true},taskConsented:true,suggestions:[suggestion]}},true,'coach');
 assert.doesNotMatch(text(tree),/纠偏（1）/);
 assert.match(text(tree),/已过期/);
 assert.equal(nodes(tree,node=>node.type==='button'&&text(node).includes('确认发送'))[0].props.disabled,true);
 tree=render(base,null,{coach:{project:{enabled:false},taskConsented:false,suggestions:[{...suggestion,expires:4102444800000}]}},true,'coach');
 assert.doesNotMatch(text(tree),/纠偏（1）/);
 assert.equal(nodes(tree,node=>node.type==='button'&&text(node).includes('确认发送'))[0].props.disabled,true);
});
test('next step never describes a paused or finished task as actively observing',()=>{
 const base={shouldNotify:false,findingIndexes:[]};
 const paused=render(base,null,{status:{status:'paused'},reports:[]});
 const finished=render(base,null,{status:{status:'completed'},reports:[]});
 assert.match(text(nodes(paused,node=>node.props?.['aria-label']==='下一步')[0]),/监督已暂停/);
 assert.match(text(nodes(finished,node=>node.props?.['aria-label']==='下一步')[0]),/任务已完成/);
 const disabled=render(base,null,{status:{status:'disabled'},reports:[]});
 assert.match(text(nodes(disabled,node=>node.props?.['aria-label']==='下一步')[0]),/监督未开启/);
});
test('settings lives in a header gear and toggles back to the prior content tab',()=>{
 const tabChanges=[];
 const tree=render({shouldNotify:false,findingIndexes:[]},null,{},true,'overview',tabChanges);
 const nav=nodes(tree,node=>node.type==='nav')[0];
 assert.doesNotMatch(text(nav),/设置/);
 const gears=nodes(tree,node=>node.type==='button'&&node.props?.['aria-label']==='设置');
 assert.equal(gears.length,1);
 const gear=gears[0];
 assert.ok(gear);
 assert.equal(gear.props.title,'设置');
 assert.equal(gear.props['aria-pressed'],false);
 gear.props.onClick();
 assert.deepEqual(tabChanges,['settings']);
 const settingsTree=tree.rerender();
 const selectedGear=nodes(settingsTree,node=>node.type==='button'&&node.props?.['aria-label']==='设置')[0];
 assert.equal(selectedGear.props['aria-pressed'],true);
 selectedGear.props.onClick();
 assert.deepEqual(tabChanges,['settings','overview']);
 assert.match(text(settingsTree.rerender()),/监督状态/);

 const directChanges=[];
 const disabledTree=render({shouldNotify:false,findingIndexes:[]},null,{status:{status:'disabled'},reports:[]},true,'overview',directChanges);
 nodes(disabledTree,node=>node.props?.['aria-label']==='下一步')[0].children.find(node=>node?.type==='button').props.onClick();
 assert.deepEqual(directChanges,['settings']);
});
test('settings gear returns to the selected nondefault content tab',()=>{
 const changes=[];let tree=render({shouldNotify:false,findingIndexes:[]},null,{},true,'overview',changes);
 const tab=nodes(tree,node=>node.type==='nav')[0].children.find(node=>text(node)==='目标');
 assert.ok(tab);tab.props.onClick();tree=tree.rerender();
 const gear=()=>nodes(tree,node=>node.props?.['aria-label']==='设置')[0];
 gear().props.onClick();tree=tree.rerender();
 assert.equal(gear().props['aria-pressed'],true);gear().props.onClick();tree=tree.rerender();
 assert.deepEqual(changes,['goals','settings','goals']);
 assert.equal(nodes(tree,node=>node.type==='nav')[0].children.find(node=>text(node)==='目标').props['aria-selected'],true);
});
test('open sidebar redraws static UI in English while retaining original user text',()=>{
 const original='用户原话';
 const visible=text(render({shouldNotify:false,findingIndexes:[]},null,{intent:{messages:[{id:'user',text:original}]}},true,'overview',[],'en'));
 assert.match(visible,/Status/);
 assert.match(visible,/Current task/);
 assert.match(visible,/用户原话/);
 assert.doesNotMatch(visible,/监督状态|当前任务|下一步/);
});
test('English consent modal contains English static copy',()=>{
 const tree=render({shouldNotify:false,findingIndexes:[]},null,{taskId:null,project:{enabled:true,path:'/project'},consent:{status:'pending'},sessionWorkspace:'/project',budget:{config:{enabled:true}}},false,'overview',[],'en');
 const visible=text(tree);
 assert.match(visible,/Enable supervision for this task\?/);
 assert.match(visible,/Enable supervision/);
 assert.doesNotMatch(visible,/是否在这个任务启用监督|启用监督/);
});

function accessibleText(tree){
 return text(tree,true)+' '+nodes(tree,()=>true).flatMap(node=>['aria-label','title','placeholder'].map(key=>node.props?.[key]??'')).join(' ');
}
const richEnglishData={
 project:{enabled:true,path:'/project',sharedExtractionEnabled:true},
 budget:{config:{enabled:true},requestsUsed:3},models:[{id:'model',name:'Model'}],
 checkpoint:{lastReason:'tool-batch',pendingReason:'stale-refresh',nextCheckAt:0,waitingForCheckpoint:true},
 supervisorUsage:{task:{measuredCalls:1,inputTokens:3,outputTokens:4,cacheReadTokens:2,cacheWriteTokens:1,calls:2,unknownCalls:1,last:{}},global:{inputTokens:3,outputTokens:4,cacheReadTokens:2,cacheWriteTokens:1,calls:2},recent:[{checkId:'check',created:0,category:'assessment',requests:1,status:'timeout',inputTokens:null,totalMs:null}]},
 goalHierarchy:{project:{summary:'Project source',version:1,items:[{id:'req',collection:'requirements',text:'Requirement source'}]},phase:{name:'Phase source',outcome:'Phase outcome',version:1},phaseHistory:[{id:'phase',name:'Past phase',status:'archived',version:1}],task:{formalGoal:'Task source',supervisorOverlay:{goal:'Correction source'}}},
 pendingGoalChange:{id:'draft',operations:[{tool:'set_summary',layer:'project'}],preview:[{before:'Before source',after:'After source',source:'Quoted source'}]},
 sharedGoalCandidates:[{id:'candidate',status:'pending',layer:'phase',basis:'inferred',question:'Question source',operations:[{tool:'propose_phase_transition',name:'New phase',sources:[{taskId:'task',messageId:'user',quote:'Quoted source'}]},{tool:'add_item',collection:'constraints'}],preview:[{before:{name:'Old phase'},after:{name:'New phase',acceptance:['Acceptance source']}},{before:null,after:'Constraint source'}]}],
 goalHistory:[{id:'history',layer:'project',version:1,created:0,sourceRefs:[{taskId:'task',messageId:'user',quote:'Quoted source'}]}],
 coach:{project:{enabled:true},taskConsented:true,suggestions:[{id:'coach',risk:'approval',status:'approval',expires:4102444800000,text:'Coach source',reportId:'report'}]},
 chat:{current:true,version:1,understanding:{requirements:['Requirement source'],constraints:['Constraint source']},questions:['Question source'],messages:[{id:'message',role:'user',text:'Chat source'},{id:'reply',role:'assistant',status:'stale',text:'Model source'}],revisions:[{version:1,understanding:{goal:'Historical source'}}]},
 validationStatus:{status:'capture-failed'},
 cardHistory:[{id:'past',status:'stale',report_id:'report',main_version:1,side_version:1,answer:'Answer source',answerStatus:'timeout'}],
};
for(const tab of ['overview','goals','tradeoffs','coach','chat','settings']){
 test(`rich English ${tab} renders all static copy and accessibility labels in English`,()=>{
  const card={id:'card',status:'pending',answer:'Answer source',answerStatus:'timeout',requirementIds:['goal'],evidenceIds:['event'],tradeoff:{question:'Question source',impact:'Impact source',basis:'execution'}};
  const tree=render({shouldNotify:true,findingIndexes:[0]},card,richEnglishData,true,tab,[],'en',{
   8:{model:'model',enabled:true},9:{event:{data:{truncated:true,text:'Evidence source'}}},
   10:{events:[{id:'event',seq:1,type:'tool'}],nextBeforeSeq:1},
   11:{tasks:[{taskId:'task',messageCount:1,knownTimeCount:1,sources:[{messageId:'user',text:'Source text'}]}],estimatedLayerCalls:2,estimatedSourceBytes:10,model:'model',note:'Scan note'},
  });
  assert.doesNotMatch(accessibleText(tree),/\p{Script=Han}|[（）：；、]/u);
  assert.match(accessibleText(tree),/Cache hit|First token/);
  assert.match(accessibleText(tree),/Settings/);
 });
}
test('locale subscription redraws the same open panel and preserves data and gear state',()=>{
 const tree=render(null,null,{intent:{messages:[{id:'user',text:'用户原话'}]},chat:{messages:[{id:'m',role:'assistant',text:'模型原文'}]}},true,'chat');
 assert.equal(tree.localeListeners.size,1);
 assert.match(text(tree),/模型原文/);
 const english=tree.switchLocale('en');
 assert.match(accessibleText(english),/Message to supervisor Agent/);
 assert.match(text(english),/模型原文/);
 assert.doesNotMatch(text(english).replace('模型原文',''),/\p{Script=Han}/u);
 nodes(english,node=>node.props?.['aria-label']==='Settings')[0].props.onClick();
 const chinese=english.switchLocale('zh');
 assert.equal(nodes(chinese,node=>node.props?.['aria-label']==='设置')[0].props['aria-pressed'],true);
});
test('both consent variants have no untranslated static English copy',()=>{
 for(const enabled of [true,false]){
  const tree=render(null,null,{taskId:null,project:{enabled:true,path:'/project'},consent:{status:'pending'},budget:{config:{enabled:true}},coach:{project:{enabled}}},false,'overview',[],'en');
  assert.doesNotMatch(accessibleText(tree),/\p{Script=Han}/u);
  assert.match(text(tree),/With consent, TaskWatch/);
 }
});
test('English errors and Chinese source evidence remain distinguishable',()=>{
 const original='真实用户原话';
 const tree=render(null,null,{status:{status:'failed'},intent:{messages:[{id:'user',text:original}]},reports:[{id:'r',created:0,report:{status:'assessed-incomplete',result:{errorCode:'INCOMPLETE_OUTPUT',validation:{complete:false,rejected:[{kind:'progress',index:0,errorCode:'REJECTED'}]},findings:[{observation:'模型观察原文',interpretation:'模型推断原文',suggestion:'模型建议原文',evidenceIds:['event'],userMessageIds:['user']}]}}}]},true,'overview',[],'en',{9:{event:{data:{text:'工具证据原文'}}}});
 const visible=accessibleText(tree);
 for(const source of [original,'模型观察原文','模型推断原文','模型建议原文','工具证据原文'])assert.ok(visible.includes(source));
 assert.match(visible,/The model response did not finish/);
 assert.match(visible,/Assessment incomplete/);
 assert.doesNotMatch(visible.replace(/真实用户原话|模型观察原文|模型推断原文|模型建议原文|工具证据原文/g,''),/\p{Script=Han}/u);
});

function alertText(tree){return text(nodes(tree,node=>node.props?.role==='alert'));}
for(const status of ['timeout','busy']){
 test(`visible ${status} alert follows later locale changes`,async()=>{
  const tree=render(null,null,{},true,'overview',[],'zh',{}, {call:async()=>({ok:true,value:{status}})});
  await nodes(tree,node=>node.type==='button'&&text(node)==='暂停观察')[0].props.onClick();
  assert.match(alertText(tree.rerender()),/请求超时|正在检查，请稍后重试/);
  assert.match(alertText(tree.switchLocale('en')),/Request timed out|Checking; please retry shortly/);
 });
}
test('pending action resolves local status using the current render locale',async()=>{
 let resolve;
 const tree=render(null,null,{},true,'overview',[],'zh',{}, {call:()=>new Promise(done=>{resolve=done;})});
 const pending=nodes(tree,node=>node.type==='button'&&text(node)==='暂停观察')[0].props.onClick();
 tree.switchLocale('en');
 resolve({ok:true,value:{status:'timeout'}});
 await pending;
 assert.equal(alertText(tree.rerender()),'Request timed out');
});
test('pending polling fallback and RPC failures follow the active locale',async()=>{
 const effects=[];let resolve;
 const tree=render(null,null,{},true,'overview',[],'zh',{}, {effects,call:()=>new Promise(done=>{resolve=done;})});
 const cleanup=effects[1]();
 tree.switchLocale('en');
 resolve({ok:false});
 await new Promise(done=>setImmediate(done));
 assert.equal(alertText(tree.rerender()),'Connection failed');
 assert.equal(alertText(tree.switchLocale('zh')),'连接失败');
 cleanup();
 const raw=render(null,null,{},true,'overview',[],'zh',{}, {call:async()=>({ok:false,error:{code:'unknown',message:'服务端原始错误'}})});
 await nodes(raw,node=>node.type==='button'&&text(node)==='暂停观察')[0].props.onClick();
 assert.equal(alertText(raw.switchLocale('en')),'TaskWatch request failed. Refresh and try again.');
 assert.equal(alertText(raw.switchLocale('zh')),'TaskWatch 请求失败，请刷新后重试。');
});

test('transport rejection is localized without exposing raw exception details',async()=>{
 const tree=render(null,null,{},true,'overview',[],'en',{}, {call:async()=>{throw new Error('transport failure /private/fixture HTTP 405');}});
 await nodes(tree,node=>node.type==='button'&&text(node)==='Pause observation')[0].props.onClick();
 assert.equal(alertText(tree.rerender()),'Connection failed');
 assert.equal(alertText(tree.switchLocale('zh')),'连接失败');
});

for(const transport of ['channel','api','unsupported',undefined])test(`client uses only the announced ${transport} transport`,async()=>{
 const calls=[];const tree=render(null,null,{},true,'overview',[],'en',{}, {transport,call:async(...args)=>{calls.push(args);return {ok:true,value:{}};}});
 await nodes(tree,node=>node.type==='button'&&text(node)==='Pause observation')[0].props.onClick();
 if(!['channel','api'].includes(transport)){assert.equal(calls.length,0);assert.equal(alertText(tree.rerender()),'Connection failed');}
 else assert.deepEqual(calls[0].slice(0,2),transport==='api'?['/api','taskwatch/pause']:['/taskwatch','pause']);
});
