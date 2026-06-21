var api = require('../../../utils/api')
var { getBabyId, getOpenId, getFamilyId } = require('../../../utils/baby')
var H = require('../../../utils/helpers')

Page({
  data: {
    mode: 'add',
    recordId: '',
    isEdit: false,
    showTimePickers: true,
    // 时间模式：'range' = 开始/结束时间，'duration' = 开始时间+时长
    timeMode: 'range',
    startDate: H.nowDate(),
    startTimeVal: H.nowTime(),
    endDate: H.nowDate(),
    endTimeVal: H.nowTime(),
    durationMinutes: 0,
    // 时长模式下的预设选项
    durationPresets: [10, 20, 30, 45, 60, 90, 120],
    selectedPreset: 0,
    customDuration: '',
    note: '',
    noteOptions: ['自主入睡', '哄睡', '奶睡', '入睡困难', '浅睡易醒', '睡得踏实'],
    selectedNote: '',
    customNote: '',
    showCustomInput: false,
  },

  onLoad: function(options) {
    var self = this
    if (options && options.mode === 'edit') {
      this.setData({ isEdit: true })
      var record = getApp().globalData.editRecord || wx.getStorageSync('editRecord_sleep')
      if (record && record.id === options.id) {
        this.fillForm(record)
      } else if (options.id) {
        api.getSleepRecord(options.id).then(function(record) {
          self.fillForm(record)
        }).catch(function() {
          wx.showToast({ title: '记录数据丢失', icon: 'none' })
          setTimeout(function() { wx.navigateBack() }, 1000)
        })
      }
    } else if (options && options.from === 'voice') {
      self._fromVoice = true
      var vp = getApp().globalData.voicePreFill
      if (vp && vp.type === 'sleep') {
        var durMin = vp.data.duration_minutes || 0
        var now = new Date()
        var startMs = now.getTime() - durMin * 60 * 1000
        var sd = new Date(startMs)
        var ed = new Date(now)
        this.setData({
          startDate: sd.getFullYear() + '-' + H.pad2(sd.getMonth() + 1) + '-' + H.pad2(sd.getDate()),
          startTimeVal: H.pad2(sd.getHours()) + ':' + H.pad2(sd.getMinutes()),
          endDate: ed.getFullYear() + '-' + H.pad2(ed.getMonth() + 1) + '-' + H.pad2(ed.getDate()),
          endTimeVal: H.pad2(ed.getHours()) + ':' + H.pad2(ed.getMinutes()),
          durationMinutes: durMin,
        })
        getApp().globalData.voicePreFill = null
      }
    }
    if (options && options.from === 'timer' && options.startTime && options.endTime) {
      var st = decodeURIComponent(options.startTime)
      var et = decodeURIComponent(options.endTime)
      var dur = parseInt(options.duration) || 0
      var startDate = new Date(st)
      var endDate = new Date(et)
      this.setData({
        startDate: startDate.getFullYear() + '-' + H.pad2(startDate.getMonth() + 1) + '-' + H.pad2(startDate.getDate()),
        startTimeVal: H.pad2(startDate.getHours()) + ':' + H.pad2(startDate.getMinutes()),
        endDate: endDate.getFullYear() + '-' + H.pad2(endDate.getMonth() + 1) + '-' + H.pad2(endDate.getDate()),
        endTimeVal: H.pad2(endDate.getHours()) + ':' + H.pad2(endDate.getMinutes()),
        durationMinutes: dur,
      })
    }
    if (options && options.id) {
      this.setData({ recordId: options.id })
    }
  },

  fillForm: function(record) {
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
      recordId: record.id,
      showTimePickers: true,
      timeMode: 'range',
      startDate: sd.date,
      startTimeVal: sd.timeVal,
      endDate: endDate,
      endTimeVal: endTimeVal,
      durationMinutes: durMin,
      note: record.note || '',
      selectedNote: selectedNote,
      customNote: customNote,
      showCustomInput: !!customNote,
      selectedPreset: 0,
      customDuration: '',
    })
  },

  /* ===== 时间模式切换 ===== */

  switchTimeMode: function(e) {
    var newMode = e.currentTarget.dataset.mode
    if (newMode === this.data.timeMode) return
    this.setData({ timeMode: newMode })
    if (newMode === 'duration') {
      this.calcDurationFromPreset()
    } else {
      this.recalcEndFromDuration()
    }
  },

  /* ===== 时长模式：预设选择 ===== */

  onPresetSelect: function(e) {
    var val = parseInt(e.currentTarget.dataset.value) || 0
    this.setData({
      selectedPreset: val,
      customDuration: '',
      durationMinutes: val
    })
    this.recalcEndFromDuration()
  },

  onCustomDurationInput: function(e) {
    var val = parseInt(e.detail.value) || 0
    this.setData({
      customDuration: e.detail.value,
      selectedPreset: 0,
      durationMinutes: val > 0 ? val : 0
    })
    if (val > 0) this.recalcEndFromDuration()
  },

  recalcEndFromDuration: function() {
    var durMin = this.data.durationMinutes
    if (durMin <= 0) return
    var start = new Date(this.data.startDate + 'T' + this.data.startTimeVal + ':00')
    var end = new Date(start.getTime() + durMin * 60 * 1000)
    this.setData({
      endDate: end.getFullYear() + '-' + H.pad2(end.getMonth() + 1) + '-' + H.pad2(end.getDate()),
      endTimeVal: H.pad2(end.getHours()) + ':' + H.pad2(end.getMinutes()),
      durationMinutes: durMin
    })
  },

  calcDurationFromPreset: function() {
    var dur = this.data.selectedPreset
    if (!dur && this.data.customDuration) {
      dur = parseInt(this.data.customDuration) || 0
    }
    if (dur > 0) {
      this.setData({ durationMinutes: dur })
      this.recalcEndFromDuration()
    }
  },

  /* ===== 时间选择器 ===== */

  onStartDateChange: function(e) {
    this.setData({ startDate: e.detail.value })
    if (this.data.timeMode === 'range') {
      this.calcDuration()
    } else {
      this.recalcEndFromDuration()
    }
  },

  onStartTimeChange: function(e) {
    this.setData({ startTimeVal: e.detail.value })
    if (this.data.timeMode === 'range') {
      this.calcDuration()
    } else {
      this.recalcEndFromDuration()
    }
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

  /* ===== 提交 ===== */

  onSubmit: function() {
    if (!getFamilyId()) { wx.showToast({ title: '请先创建家庭信息', icon: 'none', duration: 2000 }); return }
    var self = this
    var note = this.data.selectedNote
    if (this.data.customNote.trim()) {
      note = note ? note + '，' + this.data.customNote.trim() : this.data.customNote.trim()
    }

    var startTime, endTime, durationMinutes

    if (this.data.timeMode === 'duration') {
      // 时长模式：开始时间自动取当前时间，结束时间 = now + 所选时长
      var now = new Date()
      var startDate = now.getFullYear() + '-' + H.pad2(now.getMonth() + 1) + '-' + H.pad2(now.getDate())
      var startTimeVal = H.pad2(now.getHours()) + ':' + H.pad2(now.getMinutes())
      startTime = startDate + 'T' + startTimeVal + ':00'
      durationMinutes = this.data.durationMinutes
      var endDate = new Date(now.getTime() + durationMinutes * 60 * 1000)
      endTime = endDate.getFullYear() + '-' + H.pad2(endDate.getMonth() + 1) + '-' + H.pad2(endDate.getDate()) + 'T' + H.pad2(endDate.getHours()) + ':' + H.pad2(endDate.getMinutes()) + ':00'
    } else {
      startTime = this.data.startDate + 'T' + this.data.startTimeVal + ':00'
      endTime = this.data.endDate + 'T' + this.data.endTimeVal + ':00'
      durationMinutes = this.data.durationMinutes
    }

    if (durationMinutes <= 0) {
      wx.showToast({ title: '请选择有效的时间范围', icon: 'none' })
      return
    }

    if (this.data.mode !== 'edit') {
      var now = new Date()
      var startDate = new Date(startTime)
      var endDate = new Date(endTime)
      if (startDate > now || endDate > now) {
        wx.showToast({ title: '不能录入未来的记录', icon: 'none' })
        return
      }

      var babyId = getBabyId() || getFamilyId()
      var checkDate = startDate.getFullYear() + '-' + H.pad2(startDate.getMonth() + 1) + '-' + H.pad2(startDate.getDate())
      api.getSleepRecords(babyId, checkDate).then(function(existing) {
        var conflict = false
        var sMs = startDate.getTime()
        var eMs = new Date(endTime).getTime()
        for (var i = 0; i < existing.length; i++) {
          var exS = new Date(existing[i].start_time).getTime()
          var exE = new Date(existing[i].end_time).getTime()
          if (!(eMs + 60000 < exS || sMs - 60000 > exE)) {
            conflict = true
            break
          }
        }
        if (conflict) {
          wx.showToast({ title: '该时段已有睡眠记录', icon: 'none' })
          return
        }
        self.doSubmit(babyId, startTime, endTime, durationMinutes, note)
      }).catch(function() {
        self.doSubmit(babyId, startTime, endTime, durationMinutes, note)
      })
      return
    }

    var babyId = getBabyId() || 'baby-001'
    this.doSubmit(babyId, startTime, endTime, durationMinutes, note)
  },

  goTimer: function () {
    wx.navigateTo({ url: '/pages/sleep/timer/timer' })
  },

  doSubmit: function(babyId, startTime, endTime, durationMinutes, note) {
    var self = this

    var record = {
      baby_id: babyId,
      family_id: getFamilyId(),
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      note: note,
      recorded_by: getOpenId(),
    }

    if (record.duration_minutes <= 0) {
      wx.showToast({ title: '请先选择时间范围', icon: 'none' })
      return
    }

    var promise
    if (this.data.mode === 'edit') {
      promise = api.updateSleep(this.data.recordId, record)
    } else {
      promise = api.createSleep(record)
    }

    promise.then(function() {
      wx.showToast({ title: '保存成功', icon: 'success' })
      getApp().globalData.editRecord = null
      wx.removeStorageSync('editRecord_sleep')
      if (self._fromVoice) {
        getApp().globalData.voiceSaveCompleted = true
      }
      setTimeout(function() { wx.navigateBack() }, 800)
    }).catch(function(e) {
      wx.showToast({ title: (e && e.message) || '操作失败', icon: 'none' })
      console.error('sleep error:', e)
    })
  },
})
