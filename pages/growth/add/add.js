var { createGrowth, updateGrowth, getGrowthRecord } = require('../../../utils/api')
var { getBabyId, getOpenId, getFamilyId } = require('../../../utils/baby')
var H = require('../../../utils/helpers')

Page({
  data: {
    mode: 'add',
    recordId: '',
    recordDate: H.nowDate(),
    heightCm: '',
    weightKg: '',
    headCm: '',
    note: ''
  },

  onLoad: function (options) {
    var self = this
    if (options && options.id) {
      this.setData({ recordId: options.id })
    }
    if (options && options.mode === 'edit') {
      var gRecord = getApp().globalData.editRecord
      var sRecord = wx.getStorageSync('editRecord_growth')
      var record = gRecord || sRecord
      if (record && record.id === options.id) {
        this.fillForm(record)
      } else if (options.id) {
        getGrowthRecord(options.id).then(function (record) {
          self.fillForm(record)
        }).catch(function (e) {
          console.error('[GrowthAdd] 获取记录失败:', e)
          wx.showToast({ title: '记录数据丢失', icon: 'none' })
          setTimeout(function () { wx.navigateBack() }, 1000)
        })
      }
    } else if (options && options.from === 'voice') {
      self._fromVoice = true
      var vp = getApp().globalData.voicePreFill
      if (vp && vp.type === 'growth') {
        var d = vp.data
        this.setData({
          recordDate: d.record_date || H.nowDate(),
          heightCm: d.height_cm ? String(d.height_cm) : '',
          weightKg: d.weight_kg ? String(d.weight_kg) : '',
          headCm: d.head_circumference_cm ? String(d.head_circumference_cm) : '',
          note: d.note || ''
        })
        getApp().globalData.voicePreFill = null
      }
    }
  },

  onDateChange: function (e) {
    this.setData({ recordDate: e.detail.value })
  },

  onHeightInput: function (e) {
    this.setData({ heightCm: e.detail.value })
  },

  onWeightInput: function (e) {
    this.setData({ weightKg: e.detail.value })
  },

  onHeadInput: function (e) {
    this.setData({ headCm: e.detail.value })
  },

  onNoteInput: function (e) {
    this.setData({ note: e.detail.value })
  },

  fillForm: function(record) {
    this.setData({
      mode: 'edit',
      recordId: record.id,
      recordDate: record.record_date || H.nowDate(),
      heightCm: record.height_cm ? String(record.height_cm) : '',
      weightKg: record.weight_kg ? String(record.weight_kg) : '',
      headCm: record.head_circumference_cm ? String(record.head_circumference_cm) : '',
      note: record.note || ''
    })
  },

  onSubmit: function () {
    if (!getFamilyId()) { wx.showToast({ title: '请先创建家庭信息', icon: 'none', duration: 2000 }); return }
    var self = this
    var babyId = getBabyId() || 'baby-001'

    var height = self.data.heightCm ? Number(self.data.heightCm) : null
    var weight = self.data.weightKg ? Number(self.data.weightKg) : null
    var head = self.data.headCm ? Number(self.data.headCm) : null

    if (!height && !weight && !head) {
      wx.showToast({ title: '请至少填写一项数据', icon: 'none' })
      return
    }

    var record = {
      baby_id: babyId,
      family_id: getFamilyId(),
      record_date: self.data.recordDate,
      height_cm: height,
      weight_kg: weight,
      head_circumference_cm: head,
      note: self.data.note,
      recorded_by: getOpenId(),
    }

    var promise
    if (this.data.mode === 'edit') {
      promise = updateGrowth(this.data.recordId, record)
    } else {
      promise = createGrowth(record)
    }
    promise.then(function () {
      wx.showToast({ title: '保存成功', icon: 'success' })
      getApp().globalData.editRecord = null
      wx.removeStorageSync('editRecord_growth')
      if (self._fromVoice) {
        getApp().globalData.voiceSaveCompleted = true
      }
      setTimeout(function () { wx.navigateBack() }, 800)
    }).catch(function (e) {
      wx.showToast({ title: (e && e.message) || '操作失败', icon: 'none' })
    })
  }
})
