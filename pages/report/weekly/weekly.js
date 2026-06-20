var { getWeeklyReport } = require('../../../utils/api')
var { getBabyId, isDemoUser } = require('../../../utils/baby')

Page({
  data: {
    loading: true,
    error: null,
    report: null,
    babyId: '',
    hasRecords: true
  },

  onLoad: function () {
    if (isDemoUser()) {
      wx.showToast({ title: '体验模式无法使用报告功能', icon: 'none', duration: 2000 })
      wx.navigateBack({ delta: 1 })
      return
    }
    var babyId = getBabyId()
    this.setData({ babyId: babyId })
    this.loadReport()
  },

  loadReport: function () {
    var self = this
    self.setData({ loading: true, error: null })

    getWeeklyReport(getBabyId())
      .then(function (report) {
        self.setData({
          loading: false,
          report: report,
          hasRecords: !(report && report.empty)
        })
      })
      .catch(function (err) {
        self.setData({
          loading: false,
          error: err.message || '加载失败'
        })
      })
  },

  onPullDownRefresh: function () {
    this.loadReport().then(function () {
      wx.stopPullDownRefresh()
    }).catch(function () {
      wx.stopPullDownRefresh()
    })
  },

  goRecord: function () {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
