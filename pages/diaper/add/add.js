var api = require('../../../utils/api')
var { getBabyId, getOpenId, getFamilyId } = require('../../../utils/baby')
var H = require('../../../utils/helpers')

Page({
  data: {
    mode: 'add',
    recordId: '',
    diaperType: 'wet',
    recordDate: H.nowDate(),
    recordTime: H.nowTime(),
    note: '',
    noteOptions: ['正常', '偏稀', '偏干', '有奶瓣', '颜色偏绿'],
    selectedNote: '',
    customNote: '',
    showCustomInput: false,
  },

  onLoad: function(options) {
    var self = this
    if (options && options.mode === 'edit') {
      var record = getApp().globalData.editRecord || wx.getStorageSync('editRecord_diaper')
      if (record && record.id === options.id) {
        this.fillForm(record)
      } else if (options.id) {
        api.getDiaperRecord(options.id).then(function(record) {
          self.fillForm(record)
        }).catch(function() {
          wx.showToast({ title: '记录数据丢失', icon: 'none' })
          setTimeout(function() { wx.navigateBack() }, 1000)
        })
      }
    } else if (options && options.from === 'voice') {
      self._fromVoice = true
      var vp = getApp().globalData.voicePreFill
      if (vp && vp.type === 'diaper') {
        this.setData({
          diaperType: vp.data.diaper_type || 'wet',
        })
        getApp().globalData.voicePreFill = null
      }
    }
    if (options && options.id) {
      this.setData({ recordId: options.id })
    }
  },

  fillForm: function(record) {
    var time = record.time || ''
    var date = time ? time.substring(0, 10) : H.nowDate()
    var timeVal = time ? time.substring(11, 16) : H.nowTime()
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
      diaperType: record.diaper_type || 'wet',
      recordDate: date,
      recordTime: timeVal,
      note: record.note || '',
      selectedNote: selectedNote,
      customNote: customNote,
      showCustomInput: !!customNote,
    })
  },

  switchType: function(e) {
    this.setData({ diaperType: e.currentTarget.dataset.type })
  },

  onDateChange: function(e) {
    this.setData({ recordDate: e.detail.value })
  },

  onTimeChange: function(e) {
    this.setData({ recordTime: e.detail.value })
  },

  onToggleNote: function(e) {
    var idx = e.currentTarget.dataset.idx
    var label = this.data.noteOptions[idx]
    if (label === undefined) return
    var current = this.data.selectedNote
    // 互斥：选预设则关闭自定义
    if (current === label) {
      this.setData({ selectedNote: '', showCustomInput: false })
    } else {
      this.setData({ selectedNote: label, showCustomInput: false, customNote: '' })
    }
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

  onSubmit: function() {
    if (!getFamilyId()) { wx.showToast({ title: '请先创建家庭信息', icon: 'none', duration: 2000 }); return }
    var self = this
    var note = this.data.selectedNote
    if (this.data.customNote.trim()) {
      note = note ? note + '，' + this.data.customNote.trim() : this.data.customNote.trim()
    }

    var babyId = getBabyId() || 'baby-001'

    var record = {
      baby_id: babyId,
      family_id: getFamilyId(),
      diaper_type: this.data.diaperType,
      time: this.data.recordDate + 'T' + this.data.recordTime + ':00',
      note: note,
      recorded_by: getOpenId(),
    }

    var promise
    if (this.data.mode === 'edit') {
      promise = api.updateDiaper(this.data.recordId, record)
    } else {
      promise = api.createDiaper(record)
    }

    promise.then(function() {
      wx.showToast({ title: '保存成功', icon: 'success' })
      getApp().globalData.editRecord = null
      wx.removeStorageSync('editRecord_diaper')
      if (self._fromVoice) {
        getApp().globalData.voiceSaveCompleted = true
      }
      setTimeout(function() { wx.navigateBack() }, 800)
    }).catch(function(e) {
      wx.showToast({ title: (e && e.message) || '操作失败', icon: 'none' })
      console.error('diaper error:', e)
    })
  },
})
