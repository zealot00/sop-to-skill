# CRO 公司多 Agent SOP 模拟场景

**目标**：通过多 Agent 协作创建、审核、使用 SOP，生成可执行 Skill，验证 meta-skill 能力  
**日期**：2026-03-19

---

## 一、CRO 公司角色定义

| 角色 | Agent ID | 职责 |
|------|----------|------|
| **QA Manager** | `qa-manager` | SOP 创建者，负责起草 GxP 相关 SOP |
| **Project Manager** | `pm` | SOP 使用者，按照 SOP 执行项目 |
| **CRA (Clinical Research Associate)** | `cra` | 现场执行者，按照 SOP 进行监查 |
| **Data Manager** | `dm` | 数据管理，遵守数据相关 SOP |
| **Auditor** | `auditor` | 对抗性评估者，找出 SOP 的漏洞 |
| **Regulatory Affairs** | `ra` | 法规审核，确保 SOP 符合监管要求 |

---

## 二、模拟场景

### 场景：临床试验数据管理 SOP 的全生命周期

#### Phase 1: SOP 创建（QA Manager + RA）

**QA Manager** 根据 GxP 要求起草 SOP：
- 数据录入规范
- 数据核查流程
- 数据锁定程序
- 方案偏离处理

**RA** 审核法规符合性：
- 21 CFR Part 11
- EU Annex 11
- ALCOA+ 原则

**输出**：
- `SOP-DM-001_数据录入规范.md`
- `SOP-DM-002_数据核查流程.md`
- `SOP-DM-003_数据锁定程序.md`
- `SOP-DM-004_方案偏离处理.md`

#### Phase 2: SOP 执行（PM + CRA + DM）

**场景 1**：PM 安排 CRA 执行数据核查

**CRA** 按照 SOP 执行：
- 检查数据录入完整性
- 发现方案偏离
- 填写偏离报告

**DM** 按照 SOP 处理数据：
- 执行数据核查
- 处理数据质疑
- 锁定数据

**输出**：
- 执行记录（audit trail）
- 偏离记录
- 数据质疑记录

#### Phase 3: SOP → Skill 生成（sop-to-skill）

使用 `sop-to-skill` 工具：
1. 从 SOP 文档提取规则
2. 生成符合 Skill 规范的包
3. 验证生成的 Skill

**输出**：
- `skill-data-entry/`
- `skill-data-lock/`
- `skill-protocol-deviation/`

#### Phase 4: 对抗性评估（Auditor）

**Auditor** 执行对抗性测试：

1. **合规性测试**：
   - Skill 是否覆盖所有 GxP 要求？
   - 约束规则是否正确？

2. **边界测试**：
   - 输入边界条件是否完整？
   - 模糊场景是否有处理？

3. **冲突测试**：
   - 不同 Skill 之间是否有规则冲突？
   - 优先级是否正确？

4. **可执行性测试**：
   - 生成的代码是否真的能运行？
   - 执行结果是否符合预期？

---

## 三、多 Agent 对抗性评估矩阵

| 评估维度 | Auditor 检查项 | 期望结果 |
|----------|--------------|----------|
| **完整性** | SOP 中每条规则是否都有对应的 Skill 约束？ | 100% 覆盖 |
| **准确性** | Skill 约束与 SOP 原文语义是否一致？ | ≥ 95% 一致 |
| **可执行性** | Skill 中的规则是否可以执行？ | 代码可运行 |
| **一致性** | 同类约束在不同文档中表述是否统一？ | 无矛盾 |
| **冲突检测** | 规则之间是否有逻辑冲突？ | 0 个冲突 |
| **边界覆盖** | 边界条件是否完整？ | 无遗漏 |
| **合规映射** | 每条 GxP 要求是否都有对应规则？ | 100% 映射 |

---

## 四、执行计划

### Step 1: 创建 SOP（QA Manager + RA）
- Agent: `qa-manager` + `ra`
- 输出: 4 个 SOP Markdown 文件

### Step 2: 执行 SOP（PM + CRA + DM）
- Agent: `pm` + `cra` + `dm`
- 输出: 执行记录、偏离记录、审计日志

### Step 3: 生成 Skill（sop-to-skill）
- 工具: `/home/zealot/Code/sop-to-skill/scripts/cli.py`
- 输出: 3 个 Skill 包

### Step 4: 对抗性评估（Auditor）
- Agent: `auditor`
- 输出: 评估报告

---

## 五、预期交付物

1. **SOP 文档集**（4 个文件）
2. **执行记录集**（审计日志）
3. **Skill 包**（3 个 Skill）
4. **对抗性评估报告**

---

## 六、Agent 协作流程

```
QA Manager (起草)
    ↓
RA (法规审核)
    ↓
SOP 文档集
    ↓
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  PM (使用)  ←→  CRA (执行)  ←→  DM (处理)           │
│                                                         │
└─────────────────────────────────────────────────────────┘
    ↓
执行记录集（审计日志）
    ↓
sop-to-skill（自动生成）
    ↓
Skill 包
    ↓
Auditor（对抗性评估）
    ↓
评估报告（依从性 + 准确性）
```
