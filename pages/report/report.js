/**
 * AI 分析报告页面
 *
 * 支持日报 / 周报 / 月报三种视图切换
 * 从后端拉取真实记录数据，交由 AI 生成分析报告
 * 支持数据导出 CSV 功能
 */

var { getDailyReport, getWeeklyReport, getMonthlyReport, fetchAllRecords, getNotes } = require('../../utils/api')
var { getFamilyId, getBabyId } = require('../../utils/baby')

Page({
  data: {
    periodIndex: 0,
    periods: ['日报', '周报', '月报'],
    periodValues: ['daily', 'weekly', 'monthly'],
    report: null,
    isLoading: false,
    hasData: false,
  },

  onLoad: function () {
    this.loadReport()
  },

  onShow: function () {
    if (this._hasLoaded) {
      this.loadReport()
    }
  },

  /* ===== 周期切换 ===== */

  switchPeriod: function (e) {
    var index = Number(e.currentTarget.dataset.index)
    if (index !== this.data.periodIndex) {
      this.setData({ periodIndex: index })
      this.loadReport()
    }
  },

  /* ===== 加载报告 ===== */

  loadReport: function () {
    var self = this
    var babyId = getBabyId()
    var period = self.data.periodValues[self.data.periodIndex]

    self.setData({ isLoading: true, report: null })

    var fetchFn
    if (period === 'daily') {
      fetchFn = getDailyReport(babyId)
    } else if (period === 'weekly') {
      fetchFn = getWeeklyReport(babyId)
    } else {
      fetchFn = getMonthlyReport(babyId)
    }

    fetchFn
      .then(function (report) {
        self.setData({
          report: report,
          isLoading: false,
          hasData: true,
        })
        self._hasLoaded = true
      })
      .catch(function (err) {
        console.error('[Report] 加载失败:', err)
        self.setData({ isLoading: false })
        if (!self.data.report) {
          self.setData({ hasData: false })
        }
        wx.showToast({ title: '报告加载失败', icon: 'none' })
      })
  },

  /* ===== 数据导出 ===== */

  onExportData: function () {
    var self = this
    wx.showActionSheet({
      itemList: ['全部数据', '喂养记录', '睡眠记录', '尿布记录', '成长记录', '疫苗记录', '用药记录', '随手记'],
      success: function (res) {
        var types = ['all', 'feeding', 'sleep', 'diaper', 'growth', 'vaccination', 'medication', 'note']
        var exportType = types[res.tapIndex]
        self._doExport(exportType)
      }
    })
  },

  _doExport: function (exportType) {
    var self = this
    var babyId = getBabyId()

    wx.showLoading({ title: '导出中...', mask: true })

    var promise
    if (exportType === 'all') {
      promise = fetchAllRecords(babyId)
    } else {
      promise = self._fetchByType(exportType, babyId)
    }

    promise.then(function (data) {
      wx.hideLoading()
      if (!data || (Array.isArray(data) && data.length === 0)) {
        wx.showToast({ title: '无数据可导出', icon: 'none' })
        return
      }
      var records = Array.isArray(data) ? data : (data.records || data.list || [])
      if (records.length === 0 && typeof data === 'object') {
        records = [data]
      }
      var csv = self._toCSV(exportType, records)
      if (!csv) {
        wx.showToast({ title: '数据转换失败', icon: 'none' })
        return
      }
      self._shareCSV(csv, exportType)
    }).catch(function (err) {
      wx.hideLoading()
      console.error('[Report] 导出失败:', err)
      wx.showToast({ title: '导出失败', icon: 'none' })
    })
  },

  _fetchByType: function (type, babyId) {
    var api = require('../../utils/api')
    var map = {
      feeding: api.getFeedingRecords,
      sleep: api.getSleepRecords,
      diaper: api.getDiaperRecords,
      growth: api.getGrowthRecords,
      vaccination: api.getVaccinations,
      medication: api.getMedications,
      note: api.getNotes,
    }
    var fn = map[type]
    if (!fn) return Promise.resolve([])
    var todayStr = new Date().toISOString().slice(0, 10)
    if (type === 'note') {
      return fn(babyId, todayStr)
    }
    return fn(babyId)
  },

  _toCSV: function (type, records) {
    if (!records || records.length === 0) return ''

    var headers = {
      feeding: ['时间', '类型', '时长(分钟)', '奶量(ml)', '备注'],
      sleep: ['开始时间', '结束时间', '时长(分钟)', '备注'],
      diaper: ['时间', '类型', '备注'],
      growth: ['日期', '身高(cm)', '体重(kg)', '头围(cm)', '备注'],
      vaccination: ['疫苗名称', '计划日期', '实际日期', '状态'],
      medication: ['药品名称', '剂量', '单位', '频率', '开始时间', '备注'],
      note: ['时间', '内容', '备注'],
    }

    var header = headers[type] || headers['note']
    var lines = [header.join(',')]

    for (var i = 0; i < records.length; i++) {
      var r = records[i]
      var row = []
      if (type === 'feeding' || type === 'all') {
        row = [r.start_time || '', r.feed_type || '', r.duration_minutes || 0, r.amount_ml || 0, this._escapeCSV(r.note || '')]
      } else if (type === 'sleep') {
        row = [r.start_time || '', r.end_time || '', r.duration_minutes || 0, this._escapeCSV(r.note || '')]
      } else if (type === 'diaper') {
        row = [r.time || '', r.diaper_type || '', this._escapeCSV(r.note || '')]
      } else if (type === 'growth') {
        row = [r.record_date || '', r.height_cm || '', r.weight_kg || '', r.head_circumference_cm || '', this._escapeCSV(r.note || '')]
      } else if (type === 'vaccination') {
        row = [this._escapeCSV(r.vaccine_name || ''), r.scheduled_date || '', r.actual_date || '', r.status || '']
      } else if (type === 'medication') {
        row = [this._escapeCSV(r.medicine_name || ''), r.dosage || '', r.unit || '', r.frequency || '', r.start_time || '', this._escapeCSV(r.note || '')]
      } else if (type === 'note') {
        row = [r.time || '', this._escapeCSV(r.text || ''), this._escapeCSV(r.note || '')]
      }
      lines.push(row.join(','))
    }

    return lines.join('\n')
  },

  _escapeCSV: function (str) {
    if (!str) return ''
    var s = String(str)
    if (s.indexOf(',') > -1 || s.indexOf('"') > -1 || s.indexOf('\n') > -1) {
      return '"' + s.replace(/"/g, '""') + '"'
    }
    return s
  },

  _shareCSV: function (csv, type) {
    var fs = wx.getFileSystemManager()
    var fileName = 'babycare_' + type + '_' + new Date().toISOString().slice(0, 10) + '.csv'
    var filePath = wx.env.USER_DATA_PATH + '/' + fileName

    try {
      fs.writeFileSync(filePath, csv, 'utf8')
      wx.openDocument({
        filePath: filePath,
        showMenu: true,
        success: function () {
          wx.showToast({ title: '导出成功', icon: 'success' })
        },
        fail: function (err) {
          console.error('[Report] openDocument 失败:', err)
          wx.setClipboardData({
            data: csv,
            success: function () {
              wx.showToast({ title: '已复制到剪贴板', icon: 'success' })
            }
          })
        }
      })
    } catch (e) {
      console.error('[Report] 写入文件失败:', e)
      wx.setClipboardData({
        data: csv,
        success: function () {
          wx.showToast({ title: '已复制到剪贴板', icon: 'success' })
        }
      })
    }
  },

  /* ===== 工具函数 ===== */

  getFeedTypeLabel: function (type) {
    var map = { left: '左侧', right: '右侧', bottle: '瓶喂' }
    return map[type] || type
  },
})
