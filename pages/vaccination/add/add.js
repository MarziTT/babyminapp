var { getVaccination, createVaccination, updateVaccination } = require('../../../utils/api')
var { getBabyId, getOpenId, getFamilyId } = require('../../../utils/baby')
var H = require('../../../utils/helpers')

var VACCINE_OPTIONS = [
  '乙肝疫苗', '卡介苗', '脊灰疫苗', '百白破',
  '麻疹疫苗', '流感疫苗', '水痘疫苗', '肺炎疫苗',
  '轮状病毒疫苗', '麻腮风疫苗', '乙脑疫苗', '甲肝疫苗',
  'A群流脑疫苗', 'A+C群流脑疫苗', '白破疫苗', '手足口病疫苗',
  '自定义'
]

var STATUS_OPTIONS = ['待接种', '已完成']

Page({
  data: {
    mode: 'add',
    recordId: '',
    vaccineName: '',
    scheduledDate: H.nowDate(),
    status: 'upcoming',
    note: '',
    vaccineOptions: VACCINE_OPTIONS,
    statusOptions: STATUS_OPTIONS,
    showCustomInput: false,
    customVaccineName: ''
  },

  onLoad: function (options) {
    var self = this
    if (options && options.preset) {
      var name = decodeURIComponent(options.preset)
      this.setData({ vaccineName: name })
    }
    if (options && options.id) {
      this.setData({ recordId: options.id })
    }
    if (options && options.mode === 'edit') {
      var gRecord = getApp().globalData.editRecord
      var sRecord = wx.getStorageSync('editRecord_vaccination')
      var record = gRecord || sRecord
      if (record && record.id === options.id) {
        this.fillForm(record)
      } else if (options.id) {
        getVaccination(options.id).then(function (record) {
          self.fillForm(record)
        }).catch(function (e) {
          console.error('[VaccinationAdd] 获取记录失败:', e)
          wx.showToast({ title: '记录数据丢失', icon: 'none' })
          setTimeout(function () { wx.navigateBack() }, 1000)
        })
      }
    }
  },

  fillForm: function (record) {
    var vaccineName = record.vaccine_name || ''
    var isCustom = VACCINE_OPTIONS.indexOf(vaccineName) === -1
    var statusLabel = record.status === 'completed' ? '已完成' : '待接种'
    this.setData({
      mode: 'edit',
      recordId: record.id,
      vaccineName: vaccineName,
      scheduledDate: record.scheduled_date || H.nowDate(),
      status: record.status || 'upcoming',
      note: record.note || '',
      showCustomInput: isCustom,
      customVaccineName: isCustom ? vaccineName : ''
    })
  },

  onVaccineSelect: function (e) {
    var index = e.detail.value
    var name = VACCINE_OPTIONS[index]
    if (name === '自定义') {
      this.setData({ showCustomInput: true, vaccineName: '' })
    } else {
      this.setData({ showCustomInput: false, vaccineName: name, customVaccineName: '' })
    }
  },

  onCustomNameInput: function (e) {
    this.setData({ customVaccineName: e.detail.value, vaccineName: e.detail.value })
  },

  onStatusSelect: function (e) {
    var index = e.detail.value
    var label = STATUS_OPTIONS[index]
    var status = label === '已完成' ? 'completed' : 'upcoming'
    this.setData({ status: status })
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

    var vaccineName = self.data.vaccineName.trim()
    if (!vaccineName) {
      wx.showToast({ title: '请选择或输入疫苗名称', icon: 'none' })
      return
    }

    var record = {
      baby_id: babyId,
      family_id: getFamilyId(),
      vaccine_name: vaccineName,
      scheduled_date: self.data.scheduledDate,
      status: self.data.status,
      note: self.data.note,
      recorded_by: getOpenId(),
    }

    var promise
    if (self.data.mode === 'edit') {
      promise = updateVaccination(self.data.recordId, record)
    } else {
      promise = createVaccination(record)
    }

    promise.then(function () {
      wx.showToast({ title: '保存成功', icon: 'success' })
      getApp().globalData.editRecord = null
      wx.removeStorageSync('editRecord_vaccination')
      setTimeout(function () { wx.navigateBack() }, 800)
    }).catch(function (e) {
      wx.showToast({ title: (e && e.message) || '保存失败', icon: 'none' })
    })
  }
})
