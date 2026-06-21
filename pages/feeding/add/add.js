var { createFeeding, updateFeeding, getFeedingRecord } = require('../../../utils/api')
var { getBabyId, getOpenId, getFamilyId } = require('../../../utils/baby')
var H = require('../../../utils/helpers')

Page({
  data: {
    mode: 'add',
    isEdit: false,
    recordId: '',
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
  },

  onLoad: function(options) {
    var self = this
    if (options && options.from === 'timer') {
      // 从计时器页面过来：已有时长
      var startTime = decodeURIComponent(options.startTime || '')
      var endTime = decodeURIComponent(options.endTime || '')
      var durMin = parseInt(options.duration) || 0
      this.setData({ showTimePickers: true, })
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
        var durMin = d.duration_minutes || 0
        var now = new Date()
        var startMs = now.getTime() - durMin * 60 * 1000
        var sd = new Date(startMs)
        var ed = new Date(now)
        this.setData({
          showTimePickers: true,
          feedType: d.side || 'bottle',
          feedTypeLabel: labels[d.side] || '瓶喂',
          amountMl: d.amount_ml ? String(d.amount_ml) : '',
          startDate: sd.getFullYear() + '-' + H.pad2(sd.getMonth() + 1) + '-' + H.pad2(sd.getDate()),
          startTimeVal: H.pad2(sd.getHours()) + ':' + H.pad2(sd.getMinutes()),
          endDate: ed.getFullYear() + '-' + H.pad2(ed.getMonth() + 1) + '-' + H.pad2(ed.getDate()),
          endTimeVal: H.pad2(ed.getHours()) + ':' + H.pad2(ed.getMinutes()),
          durationMinutes: durMin,
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

  goTimer: function () {
    wx.navigateTo({ url: '/pages/feeding/timer/timer' })
  },

  onTimerResult: function (durationSeconds) {
    var durMin = Math.round(durationSeconds / 60)
    var now = new Date()
    var startMs = now.getTime() - durationSeconds * 1000
    var sd = new Date(startMs)
    this.setData({
      durationMinutes: durMin,
      startDate: sd.getFullYear() + '-' + H.pad2(sd.getMonth() + 1) + '-' + H.pad2(sd.getDate()),
      startTimeVal: H.pad2(sd.getHours()) + ':' + H.pad2(sd.getMinutes()),
      endDate: H.nowDate(),
      endTimeVal: H.nowTime(),
      showTimePickers: true
    })
  },

  onUnload: function() {
  },

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

  onToggleNote: function(e) {
    var idx = e.currentTarget.dataset.idx
    var label = this.data.noteOptions[idx]
    if (label === undefined) return
    var current = this.data.selectedNote
    // 互斥：选预设则关闭自定义
    this.setData({ selectedNote: current === label ? '' : label, showCustomInput: false, customNote: '' })
  },

  onCustomNoteInput: function(e) {
    this.setData({ customNote: e.detail.value })
  },

  toggleCustomInput: function() {
    // 互斥：开自定义则清预设
    if (!this.data.showCustomInput) {
      this.setData({ showCustomInput: true, selectedNote: '' })
    } else {
      this.setData({ showCustomInput: false, customNote: '' })
    }
  },


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

  onSubmit: function() {
    if (!getFamilyId()) { wx.showToast({ title: '请先创建家庭信息', icon: 'none', duration: 2000 }); return }
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
      // 从语音页来的：设标志让语音页清卡片并回首页
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
