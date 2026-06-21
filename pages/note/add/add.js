var { createNote, getNote, updateNote } = require('../../../utils/api')
var { getBabyId, getOpenId, getFamilyId } = require('../../../utils/baby')
var H = require('../../../utils/helpers')

Page({
  data: {
    mode: 'add',
    recordId: '',
    text: '',
    note: '',
    time: '',
    timeDisplay: ''
  },

  onLoad: function (options) {
    var self = this
    var timeStr = H.nowTime()

    if (options && options.from === 'voice') {
      if (options.text) {
        self.setData({ text: options.text, time: H.getLocalISO(), timeDisplay: timeStr })
      }
      return
    }

    if (options && options.mode === 'edit') {
      var record = getApp().globalData.editRecord
      if (record && record.id === options.id) {
        self.fillForm(record)
        return
      }
      if (options.id) {
        getNote(options.id).then(function (r) {
          self.fillForm(r)
        }).catch(function (e) {
          console.error('[NoteAdd] 获取记录失败:', e)
          wx.showToast({ title: '记录数据丢失', icon: 'none' })
          setTimeout(function () { wx.navigateBack() }, 1000)
        })
        return
      }
    }

    this.setData({ time: H.getLocalISO(), timeDisplay: timeStr })
  },

  fillForm: function (record) {
    if (!record) return
    var timeDisplay = record.time
    if (timeDisplay && timeDisplay.length >= 16) {
      timeDisplay = timeDisplay.slice(11, 16)
    }
    this.setData({
      mode: 'edit',
      recordId: record.id,
      text: record.text || '',
      note: record.note || '',
      time: record.time || H.getLocalISO(),
      timeDisplay: timeDisplay || H.nowTime()
    })
  },

  onTextInput: function (e) {
    this.setData({ text: e.detail.value })
  },

  onNoteInput: function (e) {
    this.setData({ note: e.detail.value })
  },

  onTimeChange: function (e) {
    var val = e.detail.value
    var d = new Date()
    var parts = val.split(':')
    d.setHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0)
    this.setData({
      time: H.getLocalISO(d),
      timeDisplay: val
    })
  },

  onSubmit: function () {
    if (!getFamilyId()) { wx.showToast({ title: '请先创建家庭信息', icon: 'none', duration: 2000 }); return }
    var self = this
    var babyId = getBabyId() || 'baby-001'
    var text = self.data.text.trim()
    var note = self.data.note.trim()

    if (!text && !note) {
      wx.showToast({ title: '请输入内容', icon: 'none' })
      return
    }

    var record = {
      baby_id: babyId,
      family_id: getFamilyId(),
      text: text,
      note: note,
      time: self.data.time || H.getLocalISO(),
      recorded_by: getOpenId()
    }

    if (self.data.mode === 'edit' && self.data.recordId) {
      updateNote(self.data.recordId, record).then(function () {
        wx.showToast({ title: '更新成功', icon: 'success' })
        setTimeout(function () { wx.navigateBack() }, 800)
      }).catch(function (e) {
        console.error('[NoteAdd] 更新失败:', e)
        wx.showToast({ title: (e && e.message) || '更新失败', icon: 'none' })
      })
    } else {
      createNote(record).then(function () {
        wx.showToast({ title: '记录成功', icon: 'success' })
        setTimeout(function () { wx.navigateBack() }, 800)
      }).catch(function (e) {
        console.error('[NoteAdd] 保存失败:', e)
        wx.showToast({ title: (e && e.message) || '记录失败', icon: 'none' })
      })
    }
  }
})
