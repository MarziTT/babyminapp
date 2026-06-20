var { getVaccinations, updateVaccination, deleteVaccination } = require('../../utils/api')
var { getBabyId, getActiveBaby } = require('../../utils/baby')
var H = require('../../utils/helpers')

var STATUS_MAP = {
  upcoming: '待接种',
  completed: '已完成',
  skipped: '已跳过'
}

// 中国国家免疫规划疫苗时间表
var NATIONAL_SCHEDULE = [
  { month: 0, label: '出生时', vaccines: ['乙肝疫苗(1)', '卡介苗'] },
  { month: 1, label: '1月龄', vaccines: ['乙肝疫苗(2)'] },
  { month: 2, label: '2月龄', vaccines: ['脊灰灭活疫苗(1)'] },
  { month: 3, label: '3月龄', vaccines: ['脊灰灭活疫苗(2)', '百白破(1)'] },
  { month: 4, label: '4月龄', vaccines: ['脊灰灭活疫苗(3)', '百白破(2)'] },
  { month: 5, label: '5月龄', vaccines: ['百白破(3)'] },
  { month: 6, label: '6月龄', vaccines: ['乙肝疫苗(3)', 'A群流脑(1)'] },
  { month: 8, label: '8月龄', vaccines: ['麻腮风(1)', '乙脑减毒活疫苗(1)'] },
  { month: 9, label: '9月龄', vaccines: ['A群流脑(2)'] },
  { month: 18, label: '18月龄', vaccines: ['百白破(4)', '麻腮风(2)', '甲肝减毒活疫苗'] },
  { month: 24, label: '2岁', vaccines: ['乙脑减毒活疫苗(2)'] },
  { month: 36, label: '3岁', vaccines: ['A+C群流脑(1)'] },
  { month: 48, label: '4岁', vaccines: ['脊灰减毒活疫苗(4)'] },
  { month: 72, label: '6岁', vaccines: ['A+C群流脑(2)', '白破'] }
]

Page({
  data: {
    records: [],
    activeTab: '',
    tabs: [
      { key: '', label: '全部', count: 0 },
      { key: 'upcoming', label: '待接种', count: 0 },
      { key: 'completed', label: '已完成', count: 0 },
      { key: 'skipped', label: '已跳过', count: 0 }
    ],
    showSchedule: false,
    schedule: [],
    currentMonthAge: 0,
    babyBirthday: ''
  },

  onLoad: function () {
  },

  onShow: function () {
    this.loadRecords()
  },

  loadRecords: function () {
    var self = this
    var status = self.data.activeTab
    var babyId = getBabyId()

    // 获取当前 tab 记录 + 全部记录（用于计数和接种计划）
    getVaccinations(babyId, status).then(function (data) {
      var records = (data || []).map(function (r) {
        r.statusLabel = STATUS_MAP[r.status] || r.status
        r.displayTime = H.formatDisplayTime(r.scheduled_date || '')
        return r
      })
      self.setData({ records: records })

      // 额外获取全部记录用于计数
      getVaccinations(babyId, '').then(function (allData) {
        var all = allData || []
        var upcoming_count = 0, completed_count = 0, skipped_count = 0
        for (var i = 0; i < all.length; i++) {
          if (all[i].status === 'upcoming') upcoming_count++
          else if (all[i].status === 'completed') completed_count++
          else if (all[i].status === 'skipped') skipped_count++
        }
        var tabs = self.data.tabs.map(function (t) {
          var c = 0
          if (t.key === 'upcoming') c = upcoming_count
          else if (t.key === 'completed') c = completed_count
          else if (t.key === 'skipped') c = skipped_count
          else if (t.key === '') c = all.length
          return { key: t.key, label: t.label, count: c }
        })
        self.setData({ tabs: tabs })

        // 计算接种计划
        self._buildSchedule(all)
      }).catch(function (err) {
        console.error('[Vaccination] 获取数据失败:', err)
        return []
      })
    }).catch(function () {
      self.setData({ records: [] })
    })
  },

  switchTab: function (e) {
    var key = e.currentTarget.dataset.key
    this.setData({ activeTab: key })
    this.loadRecords()
  },

  /* ===== 接种计划 ===== */

  toggleSchedule: function () {
    this.setData({ showSchedule: !this.data.showSchedule })
  },

  _buildSchedule: function (allRecords) {
    var self = this
    var active = getActiveBaby()
    var birthday = (active && active.birthday) || ''
    var monthAge = 0

    if (birthday) {
      var bd = new Date(birthday)
      var now = new Date()
      monthAge = (now.getFullYear() - bd.getFullYear()) * 12 + (now.getMonth() - bd.getMonth())
      if (monthAge < 0) monthAge = 0
    }

    // 构建已完成的疫苗名称集合
    var completedSet = {}
    for (var i = 0; i < allRecords.length; i++) {
      if (allRecords[i].status === 'completed' && allRecords[i].vaccine_name) {
        completedSet[allRecords[i].vaccine_name] = true
      }
    }

    // 标记每个时间段的完成状态
    var schedule = JSON.parse(JSON.stringify(NATIONAL_SCHEDULE))
    for (var s = 0; s < schedule.length; s++) {
      var item = schedule[s]
      item.vaccineItems = []
      for (var v = 0; v < item.vaccines.length; v++) {
        var vName = item.vaccines[v]
        item.vaccineItems.push({
          name: vName,
          done: !!completedSet[vName]
        })
      }
      item.isCurrent = (monthAge >= item.month && monthAge < (schedule[s + 1] ? schedule[s + 1].month : 999))
      item.isPast = monthAge > item.month
    }

    self.setData({
      schedule: schedule,
      currentMonthAge: monthAge,
      babyBirthday: birthday
    })
  },

  quickAddVaccine: function (e) {
    var name = e.currentTarget.dataset.name
    if (!name) return
    wx.navigateTo({ url: '/pages/vaccination/add/add?preset=' + encodeURIComponent(name) })
  },

  /* ===== 记录操作 ===== */

  onLongPress: function (e) {
    var self = this
    var id = e.currentTarget.dataset.id
    var status = e.currentTarget.dataset.status
    wx.showActionSheet({
      itemList: ['标记为已完成', '标记为已跳过'],
      success: function (res) {
        var newStatus = res.tapIndex === 0 ? 'completed' : 'skipped'
        var updateData = { status: newStatus }
        if (newStatus !== 'upcoming') {
          var d = new Date()
          updateData.actual_date = d.getFullYear() + '-' +
            H.pad2(d.getMonth() + 1) + '-' +
            H.pad2(d.getDate())
        }
        updateVaccination(id, updateData).then(function () {
          wx.showToast({ title: '已更新', icon: 'success' })
          self.loadRecords()
        }).catch(function () {
          wx.showToast({ title: '更新失败', icon: 'none' })
        })
      }
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

  goAdd: function () {
    wx.navigateTo({ url: '/pages/vaccination/add/add' })
  }
})
