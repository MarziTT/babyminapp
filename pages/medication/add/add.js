var { createMedication, updateMedication, getMedication } = require('../../../utils/api')
var { getBabyId, getOpenId, getFamilyId } = require('../../../utils/baby')

Page({
  data: {
    mode: 'add',
    recordId: '',
    medicineName: '',
    dosage: '',
    unit: 'ml',
    frequency: '',
    note: '',
    freqOptions: ['每日1次', '每日2次', '每日3次', '每4小时', '每6小时', '每8小时', '每12小时', '必要时']
  },

  onLoad: function (options) {
    var self = this
    if (options && options.id) {
      this.setData({ recordId: options.id })
    }
    if (options && options.mode === 'edit') {
      var gRecord = getApp().globalData.editRecord
      var sRecord = wx.getStorageSync('editRecord_medication')
      var record = gRecord || sRecord
      if (record && record.id === options.id) {
        this.fillForm(record)
      } else if (options.id) {
        getMedication(options.id).then(function (record) {
          self.fillForm(record)
        }).catch(function (e) {
          console.error('[MedicationAdd] 获取记录失败:', e)
          wx.showToast({ title: '记录数据丢失', icon: 'none' })
          setTimeout(function () { wx.navigateBack() }, 1000)
        })
      }
    } else if (options && options.from === 'voice') {
      self._fromVoice = true
      var vp = getApp().globalData.voicePreFill
      if (vp && vp.type === 'medication') {
        var d = vp.data
        this.setData({
          medicineName: d.medicine_name || '',
          dosage: d.dosage || '',
          unit: d.unit || 'ml',
          frequency: d.frequency || '',
          note: d.note || ''
        })
        getApp().globalData.voicePreFill = null
      }
    }
  },

  fillForm: function (record) {
    this.setData({
      mode: 'edit',
      recordId: record.id,
      medicineName: record.medicine_name || '',
      dosage: record.dosage || '',
      unit: record.unit || 'ml',
      frequency: record.frequency || '',
      note: record.note || ''
    })
  },

  onNameInput: function (e) {
    this.setData({ medicineName: e.detail.value })
  },

  onDosageInput: function (e) {
    this.setData({ dosage: e.detail.value })
  },

  onUnitInput: function (e) {
    this.setData({ unit: e.detail.value })
  },

  onFrequencySelect: function (e) {
    var index = e.detail.value
    this.setData({ frequency: this.data.freqOptions[index] })
  },

  onNoteInput: function (e) {
    this.setData({ note: e.detail.value })
  },

  getLocalISO: function () {
    var d = new Date()
    var Y = d.getFullYear()
    var M = d.getMonth() + 1
    var DD = d.getDate()
    var h = d.getHours()
    var mi = d.getMinutes()
    var s = d.getSeconds()
    return Y + '-' + (M < 10 ? '0' : '') + M + '-' + (DD < 10 ? '0' : '') + DD + 'T' + (h < 10 ? '0' : '') + h + ':' + (mi < 10 ? '0' : '') + mi + ':' + (s < 10 ? '0' : '') + s
  },

  onSubmit: function () {
    var self = this
    var babyId = getBabyId() || 'baby-001'

    if (!self.data.medicineName.trim()) {
      wx.showToast({ title: '请输入药品名称', icon: 'none' })
      return
    }

    var record = {
      baby_id: babyId,
      family_id: getFamilyId(),
      medicine_name: self.data.medicineName.trim(),
      dosage: self.data.dosage,
      unit: self.data.unit,
      start_time: self.getLocalISO(),
      frequency: self.data.frequency,
      note: self.data.note,
      recorded_by: getOpenId(),
    }

    var promise
    if (self.data.mode === 'edit') {
      promise = updateMedication(self.data.recordId, record)
    } else {
      promise = createMedication(record)
    }

    promise.then(function () {
      wx.showToast({ title: '保存成功', icon: 'success' })
      getApp().globalData.editRecord = null
      wx.removeStorageSync('editRecord_medication')
      if (self._fromVoice) {
        getApp().globalData.voiceSaveCompleted = true
      }
      setTimeout(function () { wx.navigateBack() }, 800)
    }).catch(function (e) {
      wx.showToast({ title: (e && e.message) || '保存失败', icon: 'none' })
    })
  }
})
