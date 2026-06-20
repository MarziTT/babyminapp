/**
 * 一句话录入页面
 *
 * 流程：输入文字（打字或微信语音输入）→ AI 解析为结构化记录 →
 *       展示确认卡片 → 用户确认后写入对应记录
 *
 * 微信内置语音输入完全免费，无需第三方 ASR。
 */

var { parseVoiceText, createFeeding, createSleep, createDiaper, createGrowth, createMedication, createVaccination, createNote } = require('../../utils/api')
var { getBabyId, getFamilyId } = require('../../utils/baby')
var H = require('../../utils/helpers')

Page({
  data: {
    inputText: '',
    rawText: '',
    isParsing: false,
    showConfirm: false,
    confirmType: '',
    confirmData: {},
    _recordType: '',
    _isSaving: false,    // 防双击 + 保存中禁用按钮
    _isUnloaded: false,  // 页面卸载标记，防止回调报错
  },

  onLoad: function () {
    this._isUnloaded = false
    this._isSaving = false
  },

  onUnload: function () {
    this._isUnloaded = true
  },

  onShow: function () {
    if (getApp().globalData.voiceSaveCompleted) {
      getApp().globalData.voiceSaveCompleted = false
      this._resetPage()
      wx.switchTab({ url: '/pages/index/index' })
    }
  },

  onTextInput: function (e) {
    var val = (e.detail && e.detail.value) || ''
    // 字数限制 200
    if (val.length > 200) {
      val = val.slice(0, 200)
      wx.showToast({ title: '最多输入200字', icon: 'none', duration: 1500 })
    }
    this.setData({ inputText: val })
  },

  onTapMic: function () {
    // 弹出提示引导用户使用键盘语音
    wx.showModal({
      title: '语音输入指引',
      content: '点击确定后，下方会弹出键盘。请点击键盘上的话筒图标🎙️开始说话，说完后文字会自动填入输入框。',
      showCancel: false,
      confirmText: '知道了',
      success: function () {
        // 不自动聚焦输入框，让用户手动点击输入框来触发键盘
        // 因为 wx.pageScrollTo 在有些机型上不可靠
      }
    })
  },

  onSendText: function () {
    var text = this.data.inputText.trim()
    if (!text || this.data.isParsing) return
    this._parseAndShow(text)
  },

  onQuickExample: function (e) {
    if (this.data.isParsing) return
    var text = e.currentTarget.dataset.text
    this.setData({ inputText: text })
    this._parseAndShow(text)
  },

  _parseAndShow: function (text) {
    var self = this

    self.setData({ isParsing: true, rawText: text, inputText: '' })

    parseVoiceText(text)
      .then(function (result) {
        console.log('[Voice] 解析结果:', result)

        var recordType = result.record_type || 'unknown'
        var parsed = result.parsed || {}

        if (recordType === 'unknown') {
          self.setData({ isParsing: false })
          wx.showToast({ title: '未能识别，请换种说法', icon: 'none' })
          return
        }

        var typeMap = {
          feeding: '喂奶',
          sleep: '睡眠',
          diaper: '尿布',
          growth: '成长',
          medication: '用药',
          vaccination: '疫苗',
          note: '随手记',
        }

        self.setData({
          isParsing: false,
          showConfirm: true,
          confirmType: typeMap[recordType] || recordType,
          confirmData: parsed,
          _recordType: recordType,
          'confirmData._time_display': H.formatDisplayTime(parsed.start_time || parsed.time || ''),
          'confirmData._end_time_display': H.formatDisplayTime(parsed.end_time || ''),
        })
      })
      .catch(function (err) {
        console.error('[Voice] 解析失败:', err)
        self.setData({ isParsing: false })
        wx.showToast({ title: '解析失败，请重试', icon: 'none' })
      })
  },

  /* ===== 确认 / 取消 ===== */

  onConfirm: function () {
    var self = this

    // 防双击
    if (self._isSaving) {
      console.log('[voice] onConfirm blocked: already saving')
      return
    }

    var recordType = self.data._recordType
    var data = JSON.parse(JSON.stringify(self.data.confirmData))

    // 喂奶缺 side → 弹窗选择
    if (recordType === 'feeding' && !data.side) {
      self._isSaving = true
      self.setData({ _isSaving: true })
      wx.showActionSheet({
        itemList: ['左侧', '右侧', '瓶喂'],
        success: function (res) {
          var sides = ['left', 'right', 'bottle']
          data.side = sides[res.tapIndex]
          self.setData({ 'confirmData.side': data.side })
          self._doConfirm(recordType, data)
        },
        fail: function () {
          // 取消选择 → 恢复按钮，留在卡片
          self._isSaving = false
          self.setData({ _isSaving: false })
        }
      })
      return
    }

    self._isSaving = true
    self.setData({ _isSaving: true })
    self._doConfirm(recordType, data)
  },

  _doConfirm: function (recordType, data) {
    var self = this
    data.baby_id = data.baby_id || getBabyId()

    // 映射字段：voice-parse 返回的字段 → 记录 API 字段
    var payload = {}
    if (recordType === 'feeding') {
      payload.feed_type = data.side || 'right'
      payload.duration_minutes = data.duration_minutes || 0
      payload.amount_ml = data.amount_ml || 0
      if (data.start_time) payload.start_time = data.start_time
      if (data.end_time) payload.end_time = data.end_time
    } else if (recordType === 'sleep') {
      payload.duration_minutes = data.duration_minutes || 0
      if (data.start_time) payload.start_time = data.start_time
      if (data.end_time) payload.end_time = data.end_time
    } else if (recordType === 'diaper') {
      payload.diaper_type = data.diaper_type || 'wet'
      if (data.time) payload.time = data.time
    } else if (recordType === 'growth') {
      if (data.height_cm) payload.height_cm = data.height_cm
      if (data.weight_kg) payload.weight_kg = data.weight_kg
      if (data.head_circumference_cm) payload.head_circumference_cm = data.head_circumference_cm
      payload.record_date = data.record_date || new Date().toISOString().slice(0, 10)
    } else if (recordType === 'medication') {
      payload.medicine_name = data.medicine_name || '用药记录'
      payload.dosage = data.dosage || ''
      payload.unit = data.unit || ''
      payload.start_time = data.start_time || new Date().toISOString().slice(0, 10)
    } else if (recordType === 'vaccination') {
      payload.vaccine_name = data.vaccine_name || '疫苗接种'
      payload.scheduled_date = data.scheduled_date || new Date().toISOString().slice(0, 10)
      payload.status = data.status || 'completed'
    } else if (recordType === 'note') {
      payload.text = data.text || data.note || ''
      payload.time = data.time || new Date().toISOString().slice(0, 10)
    }
    payload.baby_id = data.baby_id
    payload.family_id = getFamilyId()

    console.log('[Voice onConfirm] recordType:', recordType, 'payload:', JSON.stringify(payload))

    var apiMap = {
      feeding: createFeeding,
      sleep: createSleep,
      diaper: createDiaper,
      growth: createGrowth,
      medication: createMedication,
      vaccination: createVaccination,
      note: createNote,
    }

    var createFn = apiMap[recordType]
    if (!createFn) {
      if (!self._isUnloaded) {
        wx.showToast({ title: '未知记录类型', icon: 'none' })
      }
      self._isSaving = false
      self.setData({ _isSaving: false })
      return
    }

    wx.showLoading({ title: '保存中...', mask: true })

    createFn(payload)
      .then(function (res) {
        console.log('[Voice onConfirm] success:', JSON.stringify(res))
        wx.hideLoading()
        if (self._isUnloaded) return
        wx.showToast({ title: '记录保存成功', icon: 'success' })
        self._resetPage()
      })
      .catch(function (err) {
        console.error('[Voice onConfirm] fail:', err.message || err)
        wx.hideLoading()
        if (self._isUnloaded) return
        // 保存失败 → 保留卡片，恢复按钮供重试
        wx.showToast({ title: '保存失败，请重试', icon: 'none' })
        self._isSaving = false
        self.setData({ _isSaving: false })
      })
  },

  /* 修改 → 跳转详情页手动编辑 */
  onEdit: function () {
    var recordType = this.data._recordType
    var parsed = this.data.confirmData

    getApp().globalData.voicePreFill = {
      type: recordType,
      data: parsed
    }

    var pageMap = {
      feeding: '/pages/feeding/add/add',
      sleep: '/pages/sleep/add/add',
      diaper: '/pages/diaper/add/add',
      growth: '/pages/growth/add/add',
      medication: '/pages/medication/add/add',
      vaccination: '/pages/vaccination/add/add',
      note: '/pages/note/add/add'
    }

    var page = pageMap[recordType]
    if (page) {
      wx.navigateTo({ url: page + '?mode=add&from=voice' })
    } else {
      this._resetPage()
    }
  },

  /* 取消 → 关闭卡片，回到输入状态 */
  onCancelConfirm: function () {
    this.setData({
      showConfirm: false,
      inputText: this.data.rawText,
    })
  },

  _resetPage: function () {
    this.setData({
      inputText: '',
      rawText: '',
      isParsing: false,
      showConfirm: false,
      confirmType: '',
      confirmData: {},
      _recordType: '',
    })
  },
})
