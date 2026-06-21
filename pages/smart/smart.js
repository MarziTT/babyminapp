/**
 * 智能助手页 — 纯对话流 + 浮动确认卡片
 *
 * 流程：用户输入文字 → POST /api/ai/smart →
 *   intent=chat → 显示 AI 回复
 *   intent=record → 显示 AI 回复 + 内联确认卡片
 */

var { smartChat, createFeeding, createSleep, createDiaper, createGrowth, createMedication, createVaccination, createNote } = require('../../utils/api')
var { getBabyId, getFamilyId, getOpenId } = require('../../utils/baby')
var H = require('../../utils/helpers')

var TYPE_NAMES = {
  feeding: '喂奶',
  sleep: '睡眠',
  diaper: '尿布',
  growth: '成长',
  medication: '用药',
  vaccination: '疫苗',
  note: '随手记',
}

Page({
  data: {
    messages: [],
    inputText: '',
    loading: false,
    scrollIntoView: '',
  },

  _msgId: 0,
  _isSaving: false,
  _isUnloaded: false,

  onLoad: function () {
    this._isUnloaded = false
    this._isSaving = false
    this._msgId = 0
    // 检查是否已加入家庭
    var familyId = getFamilyId()
    if (!familyId) {
      wx.showToast({ title: '请先创建家庭', icon: 'none', duration: 1500 })
      setTimeout(function () {
        wx.switchTab({ url: '/pages/family/family' })
      }, 1500)
      return
    }
    // 欢迎消息
    var role = getMyRole()
    var roleLabel = role === 'mom' ? '妈妈' : role === 'dad' ? '爸爸' : ''
    var greeting = roleLabel ? '你好，' + roleLabel + '！' : '嗨！'
    this._addMessage('ai', greeting + '我是智能助手，可以直接告诉我宝宝的记录，也可以问我育儿问题。')
  },

  onUnload: function () {
    this._isUnloaded = true
  },

  _addMessage: function (role, text, extra) {
    this._msgId++
    var msg = { id: 'm' + this._msgId, role: role, text: text }
    if (extra) {
      Object.assign(msg, extra)
    }
    var messages = this.data.messages.concat([msg])
    this.setData({
      messages: messages,
      scrollIntoView: 'm' + this._msgId,
    })
    return msg
  },

  _updateMessage: function (msgId, updates) {
    var messages = this.data.messages.map(function (m) {
      if (m.id === msgId) {
        var copy = JSON.parse(JSON.stringify(m))
        for (var key in updates) {
          if (updates.hasOwnProperty(key)) {
            var parts = key.split('.')
            var target = copy
            for (var i = 0; i < parts.length - 1; i++) {
              if (!target[parts[i]]) target[parts[i]] = {}
              target = target[parts[i]]
            }
            target[parts[parts.length - 1]] = updates[key]
          }
        }
        return copy
      }
      return m
    })
    this.setData({ messages: messages })
  },

  onInput: function (e) {
    var val = e.detail.value || ''
    if (val.length > 200) val = val.slice(0, 200)
    this.setData({ inputText: val })
  },

  onSend: function () {
    var text = this.data.inputText.trim()
    if (!text || this.data.loading) return

    // 取消上一条未确认的卡片
    var messages = this.data.messages
    for (var i = messages.length - 1; i >= 0; i--) {
      if (messages[i].hasCard && !messages[i].cardConfirmed && messages[i].cardConfirmed !== 'cancelled') {
        messages[i].cardConfirmed = 'cancelled'
      }
    }

    this.setData({ inputText: '', loading: true, messages: messages })
    this._addMessage('user', text)

    var self = this
    self._doSmartChat(text, 0)
  },

  _doSmartChat: function (text, retryCount) {
    var self = this
    smartChat(text).then(function (result) {
      self.setData({ loading: false })

      var intent = result.intent || 'chat'
      var reply = result.reply || '收到啦～'
      var recType = result.record_type

      if (intent === 'record' && recType && recType !== 'unknown') {
        var cardData = result.parsed || {}
        // 初始化输入框显示文本
        if (cardData.amount_ml) cardData._amount_text = String(cardData.amount_ml)
        if (cardData.duration_minutes) {
          cardData._duration_text = String(cardData.duration_minutes)
          cardData._showDuration = true
        }
        if (cardData.height_cm) cardData._height_text = String(cardData.height_cm)
        if (cardData.weight_kg) cardData._weight_text = String(cardData.weight_kg)
        if (cardData.head_circumference_cm) cardData._head_text = String(cardData.head_circumference_cm)
        // 时间格式化（后端返回UTC，转本地时区）
        if (cardData.start_time) {
          cardData._time_display = H.formatDisplayTime(cardData.start_time)
        }
        if (cardData.end_time) {
          cardData._end_time_display = H.formatDisplayTime(cardData.end_time)
        }
        if (cardData.time) {
          cardData._time_display = H.formatDisplayTime(cardData.time)
        }
        self._addMessage('ai', reply, {
          hasCard: true,
          cardType: recType,
          cardLabel: TYPE_NAMES[recType] || recType,
          cardData: cardData,
          cardConfirmed: false,
          cardSaving: false,
        })
      } else {
        self._addMessage('ai', reply)
      }
    }).catch(function (err) {
      console.error('[Smart] 请求失败:', err)
      if (retryCount < 1) {
        // Render 冷启动重试一次
        console.log('[Smart] 重试中...')
        setTimeout(function () {
          self._doSmartChat(text, retryCount + 1)
        }, 2000)
      } else {
        self.setData({ loading: false })
        self._addMessage('ai', '网络不太稳定，请稍后再试～')
      }
    })
  },

  /* ===== 确认卡片操作 ===== */

  onCardSideSelect: function (e) {
    var msgId = e.currentTarget.dataset.msgid
    var side = e.currentTarget.dataset.side
    this._updateMessage(msgId, { 'cardData.side': side })
  },

  onCardDiaperSelect: function (e) {
    var msgId = e.currentTarget.dataset.msgid
    var dtype = e.currentTarget.dataset.dtype
    this._updateMessage(msgId, { 'cardData.diaper_type': dtype })
  },

  onCardToggleField: function (e) {
    var msgId = e.currentTarget.dataset.msgid
    var field = e.currentTarget.dataset.field
    var update = {}
    update['cardData.' + field] = true
    this._updateMessage(msgId, update)
  },

  onCardDurationPreset: function (e) {
    var msgId = e.currentTarget.dataset.msgid
    var val = parseInt(e.currentTarget.dataset.value) || 0
    var update = {}
    update['cardData.duration_minutes'] = val
    update['cardData._duration_text'] = String(val)
    this._updateMessage(msgId, update)
  },

  onCardNoteChip: function (e) {
    var msgId = e.currentTarget.dataset.msgid
    var idx = parseInt(e.currentTarget.dataset.idx)
    var NOTE_OPTS = ['正常', '溢奶', '胃口不好', '闹着吃', '吃着睡着']
    var note = NOTE_OPTS[idx]
    if (!note) return
    // 找到当前消息，取旧值做 toggle
    var msg = this.data.messages.filter(function (m) { return m.id === msgId })[0]
    if (!msg) return
    var oldChip = (msg.cardData && msg.cardData._noteChip) || ''
    var update = {}
    update['cardData._noteChip'] = oldChip === note ? '' : note
    this._updateMessage(msgId, update)
  },

  onCardFieldInput: function (e) {
    var msgId = e.currentTarget.dataset.msgid
    var field = e.currentTarget.dataset.field
    var value = e.detail.value
    // 数字字段
    if (['duration_minutes', 'amount_ml', 'height_cm', 'weight_kg', 'head_circumference_cm'].indexOf(field) > -1) {
      var numVal = parseFloat(value) || 0
      var textKey = '_' + field.replace(/_(cm|kg|ml|minutes)$/, '') + '_text'
      var update = {}
      update['cardData.' + field] = numVal
      update['cardData.' + textKey] = value
      this._updateMessage(msgId, update)
    // 时间字段：同时更新原始值 + 显示文本
    } else if (['start_time', 'end_time', 'time'].indexOf(field) > -1) {
      var timeUpdate = {}
      timeUpdate['cardData.' + field] = value
      timeUpdate['cardData._time_display'] = value
      if (field === 'end_time') {
        timeUpdate['cardData._end_time_display'] = value
      }
      this._updateMessage(msgId, timeUpdate)
    } else {
      var update2 = {}
      update2['cardData.' + field] = value
      this._updateMessage(msgId, update2)
    }
  },

  onCardConfirm: function (e) {
    var self = this
    var msgId = e.currentTarget.dataset.msgid
    if (self._isSaving) return

    var msg = self._findMsg(msgId)
    if (!msg || msg.cardConfirmed) return

    var recordType = msg.cardType

    // 喂奶必须选方式
    if (recordType === 'feeding' && !msg.cardData.side) {
      wx.showToast({ title: '请选择喂奶方式', icon: 'none' })
      return
    }

    var data = msg.cardData
    self._isSaving = true
    self._updateMessage(msgId, { cardSaving: true })
    self._doConfirm(msgId, recordType, data)
  },

  _doConfirm: function (msgId, recordType, data) {
    if (!getFamilyId()) { wx.showToast({ title: '请先创建家庭信息', icon: 'none', duration: 2000 }); return }
    var self = this
    data.baby_id = data.baby_id || getBabyId()

    var nowISO = H.getLocalISO()
    var payload = {}
    if (recordType === 'feeding') {
      payload.feed_type = data.side || 'right'
      payload.duration_minutes = data.duration_minutes || 0
      payload.amount_ml = data.amount_ml || 0
      payload.start_time = data.start_time || nowISO
      if (data.end_time) payload.end_time = data.end_time
      // 合并备注标签 + 自定义备注
      var noteParts = []
      if (data._noteChip) noteParts.push(data._noteChip)
      if (data._customNote && data._customNote.trim()) noteParts.push(data._customNote.trim())
      if (noteParts.length) payload.note = noteParts.join('，')
    } else if (recordType === 'sleep') {
      payload.duration_minutes = data.duration_minutes || 0
      payload.start_time = data.start_time || nowISO
      if (data.end_time) payload.end_time = data.end_time
    } else if (recordType === 'diaper') {
      payload.diaper_type = data.diaper_type || 'wet'
      payload.time = data.time || nowISO
    } else if (recordType === 'growth') {
      if (data.height_cm) payload.height_cm = data.height_cm
      if (data.weight_kg) payload.weight_kg = data.weight_kg
      if (data.head_circumference_cm) payload.head_circumference_cm = data.head_circumference_cm
      payload.record_date = data.record_date || H.nowDate()
    } else if (recordType === 'medication') {
      payload.medicine_name = data.medicine_name || '用药记录'
      payload.dosage = data.dosage || ''
      payload.unit = data.unit || ''
      payload.start_time = data.start_time || H.nowDate()
    } else if (recordType === 'vaccination') {
      payload.vaccine_name = data.vaccine_name || '疫苗接种'
      payload.scheduled_date = data.scheduled_date || H.nowDate()
      payload.status = data.status || 'completed'
    } else if (recordType === 'note') {
      payload.text = data.text || data.note || ''
      payload.time = data.time || H.nowDate()
    }

    payload.baby_id = data.baby_id
    payload.family_id = getFamilyId()
    payload.recorded_by = getOpenId()

    var apiMap = {
      feeding: createFeeding,
      sleep: createSleep,
      diaper: createDiaper,
      growth: createGrowth,
      medication: createMedication,
      vaccination: createVaccination,
      note: createNote,
    }

    var api = apiMap[recordType]
    if (!api) {
      self._isSaving = false
      self._updateMessage(msgId, { cardSaving: false })
      wx.showToast({ title: '暂不支持此类型', icon: 'none' })
      return
    }

    api(payload).then(function () {
      self._isSaving = false
      self._updateMessage(msgId, { cardConfirmed: true, cardSaving: false })
      wx.showToast({ title: '保存成功', icon: 'success' })
    }).catch(function (err) {
      console.error('[Smart] 保存失败:', err)
      self._isSaving = false
      self._updateMessage(msgId, { cardSaving: false })
      wx.showToast({ title: '保存失败，请重试', icon: 'none' })
    })
  },

  onCardCancel: function (e) {
    var msgId = e.currentTarget.dataset.msgid
    this._updateMessage(msgId, { cardConfirmed: 'cancelled' })
  },

  _findMsg: function (msgId) {
    var list = this.data.messages
    for (var i = list.length - 1; i >= 0; i--) {
      if (list[i].id === msgId) return list[i]
    }
    return null
  },
})
