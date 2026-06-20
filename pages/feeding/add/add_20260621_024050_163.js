var { createFeeding, updateFeeding, getFeedingRecord } = require('../../../utils/api')
var { getBabyId, getOpenId, getFamilyId } = require('../../../utils/baby')
var H = require('../../../utils/helpers')

Page({
  data: {
    mode: 'add',
    isEdit: false,
    recordId: '',
    activeTab: 'timer',         // 'timer' | 'manual'
    feedType: 'left',
    feedTypeLabel: '左侧亲喂',
    amountMl: '',
    note: '',
    noteOptions: ['正常', '溢奶', '胃口不好', '闹着吃', '吃着睡着'],
    selectedNote: '',
    customNote: '',
    showCustomInput: false,
    showTimePickers: true,
    startDate: H.nowDate(),
    startTimeVal: H.nowTime(),
    endDate: H.nowDate(),
    endTimeVal: H.nowTime(),
    durationMinutes: 0,

    // 计时器
    isRunning: false,
    isPaused: false,
    elapsedSeconds: 0,
    timerDisplay: '00:00',
    _timer: null
  },

  onLoad: function(options) {
    var self = this
    if (options && options.from === 'timer') {
      var startTime = decodeURIComponent(options.startTime || '')
      var endTime = decodeURIComponent(options.endTime || '')
      var durMin = parseInt(options.duration) || 0
      this.setData({ activeTab: 'manual', showTimePickers: true })
      if (startTime) {
        var sp = startTime.split('T')
        this.setData({ startDate: sp[0], startTimeVal: sp[1].substring(0, 5) })
      }
      if (endTime) {
        var ep = endTime.split('T')
        this.setData({ endDate: ep[0], endTimeVal: ep[1].substring(0, 5) })
      }
      if (durMin > 0) this.setData({ durationMinutes: durMin })
      return
    }
    if (options && options.from === 'voice') {
      self._fromVoice = true
    }
    if (options && options.mode === 'edit') {
      var gRecord = getApp().globalData.editRecord
      var sRecord = wx.getStorageSync('editRecord_feeding')
      var record = gRecord || sRecord
      if (record && record.id === options.id) {
        this.fillForm(record)
      } else if (options.id) {
        getFeedingRecord(options.id).then(function(record) {
          self.fillForm(record)
        }).catch(function(e) {
          console.error('[FeedingAdd] 获取记录失败:', e)
          wx.showToast({ title: '记录数据丢失', icon: 'none' })
          setTimeout(function() { wx.navigateBack() }, 1000)
        })
      }
    } else if (options && options.from === 'voice') {
      var vp = getApp().globalData.voicePreFill
      if (vp && vp.type === 'feeding') {
        var d = vp.data
        var labels = { left: '左侧亲喂', right: '右侧亲喂', bottle: '瓶喂' }
        var durMin2 = d.duration_minutes || 0
        var now = new Date()
        var startMs = now.getTime() - durMin2 * 60 * 1000
        var sd = new Date(startMs)
        var ed = new Date(now)
        this.setData({
          activeTab: 'manual',
          showTimePickers: true,
          feedType: d.side || 'bottle',
          feedTypeLabel: labels[d.side] || '瓶喂',
          amountMl: d.amount_ml ? String(d.amount_ml) : '',
          startDate: sd.getFullYear() + '-' + H.pad2(sd.getMonth() + 1) + '-' + H.pad2(sd.getDate()),
          startTimeVal: H.pad2(sd.getHours()) + ':' + H.pad2(sd.getMinutes()),
          endDate: ed.getFullYear() + '-' + H.pad2(ed.getMonth() + 1) + '-' + H.pad2(ed.getDate()),
          endTimeVal: H.pad2(ed.getHours()) + ':' + H.pad2(ed.getMinutes()),
          durationMinutes: durMin2,
        })
        getApp().globalData.voicePreFill = null
      }
    }
    if (options && options.id) {
      this.setData({ recordId: options.id })
    }
  },

  fillForm: function(record) {
    var labels = { left: '左侧亲喂', right: '右侧亲喂', bottle: '瓶喂' }
    var startStr = record.start_time || ''
    var durMin = record.duration_minutes || 0
    var sd = startStr ? H.isoToTimeParts(startStr) : { date: H.nowDate(), timeVal: H.nowTime() }
    var endDate, endTimeVal
    if (startStr) {
      var startMs = new Date(startStr).getTime()
      var endMs = startMs + durMin * 60 * 1000
      var ed = new Date(endMs)
      endDate = ed.getFullYear() + '-' + H.pad2(ed.getMonth() + 1) + '-' + H.pad2(ed.getDate())
      endTimeVal = H.pad2(ed.getHours()) + ':' + H.pad2(ed.getMinutes())
    } else {
      endDate = H.nowDate()
      endTimeVal = H.nowTime()
    }
    var oldNote = record.note || ''
    var selectedNote = ''
    var customNote = ''
    if (oldNote) {
      var parts = oldNote.split(/[，,、]/)
      var presetOpts = this.data.noteOptions
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i].trim()
        if (p && presetOpts.indexOf(p) > -1 && !selectedNote) {
          selectedNote = p
        } else if (p) {
          customNote += (customNote ? '，' : '') + p
        }
      }
    }
    this.setData({
      mode: 'edit',
      isEdit: true,
      recordId: record.id,
      activeTab: 'manual',
      showTimePickers: true,
      feedType: record.feed_type || 'left',
      feedTypeLabel: labels[record.feed_type] || '左侧亲喂',
      amountMl: record.amount_ml ? String(record.amount_ml) : '',
      note: record.note || '',
      selectedNote: selectedNote,
      customNote: customNote,
      showCustomInput: !!customNote,
      startDate: sd.date,
      startTimeVal: sd.timeVal,
      endDate: endDate,
      endTimeVal: endTimeVal,
      durationMinutes: durMin,
    })
  },

  /* ===== Tab 切换 ===== */

  switchTab: function(e) {
    var tab = e.currentTarget.dataset.tab
    if (tab === this.data.activeTab) return
    if (this.data.activeTab === 'timer') {
      this.clearTimer()
      this.setData({ isRunning: false, isPaused: false, elapsedSeconds: 0, timerDisplay: '00:00' })
    }
    this.setData({ activeTab: tab })
  },

  /* ===== 计时器 ===== */

  onUnload: function() {
    this.clearTimer()
  },

  startTimer: function() {
    var self = this
    this.setData({ isRunning: true, isPaused: false, elapsedSeconds: 0, timerDisplay: '00:00' })
    this.data._timer = setInterval(function() {
      var elapsed = self.data.elapsedSeconds + 1
      var m = Math.floor(elapsed / 60)
      var s = elapsed % 60
      self.setData({
        elapsedSeconds: elapsed,
        timerDisplay: H.pad2(m) + ':' + H.pad2(s)
      })
    }, 1000)
  },

  pauseTimer: function() {
    this.clearInterval()
    this.setData({ isPaused: true })
  },

  resumeTimer: function() {
    var self = this
    this.setData({ isPaused: false })
    this.data._timer = setInterval(function() {
      var elapsed = self.data.elapsedSeconds + 1
      var m = Math.floor(elapsed / 60)
      var s = elapsed % 60
      self.setData({
        elapsedSeconds: elapsed,
        timerDisplay: H.pad2(m) + ':' + H.pad2(s)
      })
    }, 1000)
  },

  resetTimer: function() {
    this.clearInterval()
    this.setData({
      isRunning: false,
      isPaused: false,
      elapsedSeconds: 0,
      timerDisplay: '00:00'
    })
  },

  clearInterval: function() {
    if (this.data._timer) {
      clearInterval(this.data._timer)
      this.data._timer = null
    }
  },

  clearTimer: function() {
    this.clearInterval()
  },

  onTimerSave: function() {
    var self = this
    var durationSeconds = this.data.elapsedSeconds

    if (durationSeconds < 10) {
      wx.showToast({ title: '记录时间太短', icon: 'none' })
      return
    }

    var feedType = this.data.feedType
    var amountMl = this.data.amountMl

    if (feedType === 'bottle' && !Number(amountMl)) {
      wx.showToast({ title: '请输入奶量', icon: 'none' })
      return
    }

    var now = new Date()
    var startMs = now.getTime() - durationSeconds * 1000
    var sd = new Date(startMs)
    var ed = now
    var startTime = sd.getFullYear() + '-' + H.pad2(sd.getMonth() + 1) + '-' + H.pad2(sd.getDate()) + 'T' + H.pad2(sd.getHours()) + ':' + H.pad2(sd.getMinutes()) + ':00'
    var endTime = ed.getFullYear() + '-' + H.pad2(ed.getMonth() + 1) + '-' + H.pad2(ed.getDate()) + 'T' + H.pad2(ed.getHours()) + ':' + H.pad2(ed.getMinutes()) + ':00'
    var durMin = Math.round(durationSeconds / 60)

    var note = this.data.selectedNote
    if (this.data.customNote.trim()) {
      note = note ? note + '，' + this.data.customNote.trim() : this.data.customNote.trim()
    }

    var babyId = getBabyId() || 'baby-001'

    var record = {
      baby_id: babyId,
      family_id: getFamilyId(),
      feed_type: feedType,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durMin,
      amount_ml: feedType === 'bottle' ? Number(amountMl) || 0 : 0,
      note: note,
      recorded_by: getOpenId(),
    }

    var promise
    if (this.data.mode === 'edit') {
      promise = updateFeeding(this.data.recordId, record)
    } else {
      promise = createFeeding(record)
    }

    this.clearTimer()
    this.setData({ isRunning: false, isPaused: false })

    promise.then(function() {
      wx.showToast({ title: '保存成功', icon: 'success' })
      getApp().globalData.editRecord = null
      wx.removeStorageSync('editRecord_feeding')
      if (self._fromVoice) {
        getApp().globalData.voiceSaveCompleted = true
      }
      setTimeout(function() { wx.navigateBack() }, 1500)
    }).catch(function(e) {
      console.error('[FeedingAdd] 保存失败:', e)
      wx.showToast({ title: (e && e.message) || '操作失败', icon: 'none' })
    })
  },

  goTimer: function() {
    wx.navigateTo({ url: '/pages/feeding/timer/timer' })
  },

  /* ===== 类型切换 ===== */

  switchType: function(e) {
    var type = e.currentTarget.dataset.type
    var labels = { left: '左侧亲喂', right: '右侧亲喂', bottle: '瓶喂' }
    this.setData({ feedType: type, feedTypeLabel: labels[type] || type })
  },

  onAmountInput: function(e) {
    var val = e.detail.value
    if (val === undefined) {
      val = e.currentTarget.dataset.value
    }
    this.setData({ amountMl: val })
  },

  /* ===== 备注 ===== */

  onToggleNote: function(e) {
    var idx = e.currentTarget.dataset.idx
    var label = this.data.noteOptions[idx]
    if (label === undefined) return
    var current = this.data.selectedNote
    this.setData({ selectedNote: current === label ? '' : label, showCustomInput: false, customNote: '' })
  },

  onCustomNoteInput: function(e) {
    this.setData({ customNote: e.detail.value })
  },

  toggleCustomInput: function() {
    if (!this.data.showCustomInput) {
      this.setData({ showCustomInput: true, selectedNote: '' })
    } else {
      this.setData({ showCustomInput: false, customNote: '' })
    }
  },

  /* ===== 手动模式时间选择 ===== */

  onStartDateChange: function(e) {
    this.setData({ startDate: e.detail.value })
    this.calcDuration()
  },

  onStartTimeChange: function(e) {
    this.setData({ startTimeVal: e.detail.value })
    this.calcDuration()
  },

  onEndDateChange: function(e) {
    this.setData({ endDate: e.detail.value })
    this.calcDuration()
  },

  onEndTimeChange: function(e) {
    this.setData({ endTimeVal: e.detail.value })
    this.calcDuration()
  },

  calcDuration: function() {
    var start = new Date(this.data.startDate + 'T' + this.data.startTimeVal + ':00')
    var end = new Date(this.data.endDate + 'T' + this.data.endTimeVal + ':00')
    var diff = Math.round((end - start) / 60000)
    this.setData({ durationMinutes: diff > 0 ? diff : 0 })
  },

  /* ===== 手动模式提交 ===== */

  onSubmit: function() {
    var self = this
    var feedType = this.data.feedType
    var amountMl = this.data.amountMl

    var startTime = this.data.startDate + 'T' + this.data.startTimeVal + ':00'
    var endTime = this.data.endDate + 'T' + this.data.endTimeVal + ':00'
    var durationMinutes = this.data.durationMinutes

    if (durationMinutes <= 0) {
      wx.showToast({ title: '结束时间不能早于开始时间', icon: 'none' })
      return
    }

    var note = this.data.selectedNote
    if (this.data.customNote.trim()) {
      note = note ? note + '，' + this.data.customNote.trim() : this.data.customNote.trim()
    }

    var babyId = getBabyId() || 'baby-001'

    var record = {
      baby_id: babyId,
      family_id: getFamilyId(),
      feed_type: feedType,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      amount_ml: feedType === 'bottle' ? Number(amountMl) || 0 : 0,
      note: note,
      recorded_by: getOpenId(),
    }

    if (feedType === 'bottle' && !record.amount_ml) {
      wx.showToast({ title: '请输入奶量', icon: 'none' })
      return
    }

    var promise
    if (this.data.mode === 'edit') {
      promise = updateFeeding(this.data.recordId, record)
    } else {
      promise = createFeeding(record)
    }

    promise.then(function() {
      wx.showToast({ title: '保存成功', icon: 'success' })
      getApp().globalData.editRecord = null
      wx.removeStorageSync('editRecord_feeding')
      if (self._fromVoice) {
        getApp().globalData.voiceSaveCompleted = true
      }
      setTimeout(function() { wx.navigateBack() }, 1500)
    }).catch(function(e) {
      console.error('[FeedingAdd] 保存失败:', e)
      wx.showToast({ title: (e && e.message) || '操作失败', icon: 'none' })
    })
  },
})
