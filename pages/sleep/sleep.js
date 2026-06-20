var H = require('../../utils/helpers')
var { getSleepRecords, deleteSleep } = require('../../utils/api')
var { getBabyId } = require('../../utils/baby')

function formatDateDisplay(dateStr) {
  var today = H.nowDate()
  var d = new Date()
  d.setDate(d.getDate() - 1)
  var yesterday = d.getFullYear() + '-' + H.pad2(d.getMonth() + 1) + '-' + H.pad2(d.getDate())
  if (dateStr === today) return '今天'
  if (dateStr === yesterday) return '昨天'
  return dateStr
}

Page({
  data: {
    records: [],
    targetDate: H.nowDate(),
    dateDisplay: '今天'
  },

  onLoad: function () {
    // babyId from centralized utils
  },

  onShow: function () {
    this.loadRecords()
  },

  loadRecords: function () {
    var self = this
    var babyId = getBabyId()
    if (!babyId) {
      console.error('sleep: getBabyId() is empty')
      return
    }
    getSleepRecords(babyId, self.data.targetDate).then(function (data) {
      var records = (data || []).map(function (r) {
        r.displayTime = H.formatDisplayTime(r.start_time || r.time || '')
        return r
      })
      self.setData({ records: records })
    }).catch(function (err) {
      console.error('sleep loadRecords error:', err)
    })
  },

  prevDay: function () {
    var d = new Date(this.data.targetDate)
    d.setDate(d.getDate() - 1)
    var dateStr = d.getFullYear() + '-' + H.pad2(d.getMonth() + 1) + '-' + H.pad2(d.getDate())
    this.setData({ targetDate: dateStr, dateDisplay: formatDateDisplay(dateStr) })
    this.loadRecords()
  },

  nextDay: function () {
    var self = this
    var d = new Date(self.data.targetDate)
    d.setDate(d.getDate() + 1)
    var dateStr = d.getFullYear() + '-' + H.pad2(d.getMonth() + 1) + '-' + H.pad2(d.getDate())
    if (dateStr > H.nowDate()) {
      wx.showToast({ title: '不能超过今天', icon: 'none' })
      return
    }
    self.setData({ targetDate: dateStr, dateDisplay: formatDateDisplay(dateStr) })
    self.loadRecords()
  },

  onDateChange: function (e) {
    var dateStr = e.detail.value
    this.setData({ targetDate: dateStr, dateDisplay: formatDateDisplay(dateStr) })
    this.loadRecords()
  },

  deleteRecord: function (e) {
    var self = this
    var id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条睡眠记录吗？',
      success: function (res) {
        if (res.confirm) {
          deleteSleep(id).then(function () {
            wx.showToast({ title: '已删除', icon: 'success' })
            self.loadRecords()
          }).catch(function (err) {
            wx.showToast({ title: '删除失败', icon: 'none' })
          })
        }
      }
    })
  },

  goAdd: function () {
    wx.navigateTo({ url: '/pages/sleep/add/add' })
  },

  goTimer: function () {
    wx.navigateTo({ url: '/pages/sleep/timer/timer' })
  },

  editRecord: function (e) {
    var id = e.currentTarget.dataset.id
    var records = this.data.records
    var record = null
    for (var i = 0; i < records.length; i++) {
      if (records[i].id === id) { record = records[i]; break }
    }
    if (record) {
      getApp().globalData.editRecord = record
      wx.setStorageSync('editRecord_sleep', record)
      wx.navigateTo({ url: '/pages/sleep/add/add?mode=edit&id=' + id })
    }
  }
})
