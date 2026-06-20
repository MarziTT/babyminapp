var { createVaccination } = require('../../../utils/api')
var { getBabyId, getOpenId, getFamilyId } = require('../../../utils/baby')
var H = require('../../../utils/helpers')

Page({
  data: {
    vaccineName: '',
    scheduledDate: H.nowDate(),
    note: ''
  },

  onLoad: function(options) {
    if (options && options.preset) {
      var name = decodeURIComponent(options.preset)
      this.setData({ vaccineName: name })
    }
  },

  onNameInput: function (e) {
    this.setData({ vaccineName: e.detail.value })
  },

  onDateChange: function (e) {
    this.setData({ scheduledDate: e.detail.value })
  },

  onNoteInput: function (e) {
    this.setData({ note: e.detail.value })
  },

  onSubmit: function () {
    var self = this
    var babyId = getBabyId() || 'baby-001'

    if (!self.data.vaccineName.trim()) {
      wx.showToast({ title: '请输入疫苗名称', icon: 'none' })
      return
    }

    var record = {
      baby_id: babyId,
      family_id: getFamilyId(),
      vaccine_name: self.data.vaccineName.trim(),
      scheduled_date: self.data.scheduledDate,
      note: self.data.note,
      recorded_by: getOpenId(),
    }

    createVaccination(record).then(function () {
      wx.showToast({ title: '添加成功', icon: 'success' })
      setTimeout(function () { wx.navigateBack() }, 800)
    }).catch(function (e) {
      wx.showToast({ title: (e && e.message) || '添加失败', icon: 'none' })
    })
  }
})
