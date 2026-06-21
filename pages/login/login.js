var { login } = require('../../utils/api')
var {
  setOpenId, getOpenId, setFamilyId, getFamilyId, setMyRole,
  backupLoginData, restoreLoginData
} = require('../../utils/baby')

Page({
  data: {
    loading: false,
    error: ''
  },

  onLoad: function () {
    var openid = getOpenId()
    if (openid) {
      this.goHome()
    }
  },

  onLoginTap: function () {
    var self = this
    self.setData({ loading: true, error: '' })

    // 使用 wx.getUserProfile 获取用户信息（含头像和昵称）
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: function (profileRes) {
        var userInfo = profileRes.userInfo
        if (!userInfo) {
          self.setData({ loading: false, error: '需要授权才能使用' })
          return
        }

        wx.login({
          success: function (loginRes) {
            if (!loginRes.code) {
              self.setData({ loading: false, error: '获取登录凭证失败' })
              return
            }

            login(loginRes.code, userInfo.nickName, userInfo.avatarUrl)
              .then(function (res) {
                // 微信登录：先尝试恢复之前备份的登录数据
                restoreLoginData()

                // 覆盖为服务器返回的最新数据
                setOpenId(res.openid)
                wx.setStorageSync('userInfo', {
                  nickname: res.nickname || userInfo.nickName,
                  avatarUrl: res.avatarUrl || userInfo.avatarUrl
                })

                if (res.family) {
                  setFamilyId(res.family.family_id)
                  setMyRole(res.family.role)
                }

                self.setData({ loading: false })
                wx.showToast({ title: '登录成功', icon: 'success', duration: 1200 })
                setTimeout(function () {
                  self.goHome()
                }, 1200)
              })
              .catch(function (err) {
                console.error('[Login] error:', err)
                self.setData({
                  loading: false,
                  error: err.message || '登录失败，请重试'
                })
              })
          },
          fail: function () {
            self.setData({ loading: false, error: '微信登录失败' })
          }
        })
      },
      fail: function () {
        self.setData({ loading: false, error: '需要授权才能使用' })
      }
    })
  },

  onSkip: function () {
    // 体验模式：先备份微信登录数据，再清除当前缓存
    backupLoginData()
    wx.removeStorageSync('babycare_openid')
    wx.removeStorageSync('babycare_family_id')
    wx.removeStorageSync('babycare_my_role')
    wx.removeStorageSync('babycare_active_baby')
    wx.removeStorageSync('babycare_baby_info')
    wx.removeStorageSync('userInfo')

    var demoId = 'demo_' + Date.now()
    setOpenId(demoId)
    wx.setStorageSync('userInfo', {
      nickname: '体验用户',
      avatarUrl: ''
    })
    wx.showToast({ title: '进入体验模式', icon: 'none', duration: 1000 })
    setTimeout(function () {
      wx.switchTab({ url: '/pages/index/index' })
    }, 1000)
  },

  goHome: function () {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
