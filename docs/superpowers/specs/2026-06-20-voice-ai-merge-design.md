# Voice + AI Merge Design

**日期**: 2026-06-20
**状态**: 已确认

## 概述

将语音录入页（pages/voice/voice）和 AI 顾问能力融合为一个统一入口——「智能助手」页（pages/smart/smart），替换现有「语音」Tab。AI 自动判断用户输入意图：记录类 → 解析字段并弹出确认卡片；问答类 → 对话回复。

## 架构变更

| 类型 | 路径 | 说明 |
|------|------|------|
| 新增 | pages/smart/smart.* | 智能助手页面（js/wxml/wxss/json） |
| 新增 | /api/ai/smart | 统一意图判断 + 解析/回复端点 |
| 废弃 | pages/voice/voice.* | 原语音页，文件可删除 |
| 修改 | app.json | tabBar: voice → smart，名称 "语音" → "智能助手" |
| 修改 | pages/index/index.js | quickActions 中「语音」项 page + label 更新 |
| 保留 | pages/ai/ai.* | AI 顾问独立保留不受影响 |

## 页面交互模型

**纯对话流 + 浮动确认卡（方案 C）**：
- 默认是类聊天消息界面，用户输入（文字或语音）在右侧显示
- 调用 `/api/ai/smart` 获取 AI 判断结果
- 若 intent=record：底部弹出浮动确认卡片（overlay），展示解析字段 + 确认/修改/取消按钮
- 若 intent=chat：AI 回复以消息气泡形式追加到对话流
- 若 intent=unknown：toast 提示"没太明白"

## 数据流

```
用户输入 "左边喂了15分钟"
  → POST /api/ai/smart { text: "左边喂了15分钟" }
  → AI 判断 intent=record
  → 返回 { intent: "record", type: "feeding", parsed: { side: "left", duration_minutes: 15 } }
  → 前端弹出浮动确认卡片
  → 用户确认 → 调用 createFeeding(payload) → 保存成功 toast

用户输入 "宝宝最近奶量减少了正常吗"
  → POST /api/ai/smart { text: "宝宝最近奶量减少了正常吗" }
  → AI 判断 intent=chat
  → 返回 { intent: "chat", reply: "奶量波动很正常..." }
  → 前端追加 AI 回复到消息流
```

## 后端接口

### POST /api/ai/smart

**请求**：
```json
{
  "text": "用户输入的文本"
}
```

**响应 - 记录意图**：
```json
{
  "intent": "record",
  "type": "feeding",
  "parsed": {
    "side": "left",
    "duration_minutes": 15,
    "amount_ml": 120,
    "start_time": "2026-06-20 14:30"
  }
}
```

**响应 - 问答意图**：
```json
{
  "intent": "chat",
  "reply": "AI 回复的文本内容"
}
```

**响应 - 无法识别**：
```json
{
  "intent": "unknown"
}
```

## 状态机

```
idle → sending → record → showConfirm → confirmed → save → idle
                              ↘ cancelled → idle
                              ↘ edit → navigateTo detail page
              → chat → appendReply → idle
              → unknown → toast → idle
```

## 确认卡片字段

沿用 voice.js 现有的 `_doConfirm` 逻辑，7 种记录类型的字段映射不变：
- feeding: side / duration_minutes / amount_ml / start_time / end_time
- sleep: duration_minutes / start_time / end_time
- diaper: diaper_type / time
- growth: height_cm / weight_kg / head_circumference_cm / record_date
- medication: medicine_name / dosage / unit / start_time
- vaccination: vaccine_name / scheduled_date / status
- note: text / time

## 与快捷操作的衔接

- 首页 `quickActions` 中「语音」项修改为 `{ label: '智能助手', page: '/pages/smart/smart' }`
- 「快速补录」卡片同样跳转到智能助手页
- 首页 `onTapReminder` 中的 `wx.switchTab({ url: '/pages/voice/voice' })` 改为 `/pages/smart/smart`

## 部署

后端代码推送到 GitHub → Render 自动部署。
