var H = require('../../../utils/helpers')
var { getVaccinations, updateVaccination, deleteVaccination } = require('../../../utils/api')
var { getBabyId } = require('../../../utils/baby')

var STATUS_MAP = {
  upcoming: '待接种',
  completed: '已完成',
  skipped: '已跳过'
}

Page({
  data: {
    records: []
  },

  onShow: function () {
    this.loadRecords()
  },

  loadRecords: function () {
    var self = this
    var babyId = getBabyId()
    if (!babyId) {
      console.error('[VaccinationList] getBabyId() is empty')
      return
    }
    getVaccinations(babyId, '').then(function (data) {
      var records = (data || []).map(function (r) {
        r.statusLabel = STATUS_MAP[r.status] || r.status || '待接种'
        r.displayTime = H.formatDisplayTime(r.scheduled_date || '')
        return r
      })
      records.sort(function (a, b) {
        return (a.scheduled_date || '') > (b.scheduled_date || '') ? 1 : -1
      })
      self.setData({ records: records })
    }).catch(function (err) {
      console.error('[VaccinationList] 加载失败:', err)
      self.setData({ records: [] })
    })
  },

  deleteRecord: function (e) {
    var self = this
    var id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条接种提醒吗？',
      success: function (res) {
        if (res.confirm) {
          deleteVaccination(id).then(function () {
            wx.showToast({ title: '已删除', icon: 'success' })
            self.loadRecords()
          }).catch(function () {
            wx.showToast({ title: '删除失败', icon: 'none' })
          })
        }
      }
    })
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
      wx.setStorageSync('editRecord_vaccination', record)
      wx.navigateTo({ url: '/pages/vaccination/add/add?mode=edit&id=' + id })
    }
  },

  goAdd: function () {
    wx.navigateTo({ url: '/pages/vaccination/add/add' })
  }
})
