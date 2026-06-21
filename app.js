/**
 * BabyCare 小程序 - 全局入口
 */
var { getOpenId, getFamilyId, getMyRole } = require('./utils/baby')

App({
  onLaunch: function () {
    var self = this

    // 初始化全局数据
    this.globalData = {
      userInfo: null,
      openid: '',
      familyId: '',
      myRole: '',
      activeBaby: null,
      familyInfo: null,
      baseUrl: 'https://babycare-backend-teha.onrender.com',
    }

    // 从本地缓存读取用户信息
    var userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      self.globalData.userInfo = userInfo
    }

    // 读取身份信息
    var openid = getOpenId()
    var familyId = getFamilyId()
    var myRole = getMyRole()
    self.globalData.openid = openid
    self.globalData.familyId = familyId
    self.globalData.myRole = myRole

    // 未登录则跳转登录页
    if (!openid) {
      console.log('[BabyCare] 未登录，跳转登录页')
      wx.reLaunch({ url: '/pages/login/login' })
      return
    }

    console.log('[BabyCare] App launched, openid:', openid, 'familyId:', familyId)
  },

  onShow: function () {
    var familyId = getFamilyId()
    if (!familyId) {
      wx.showModal({
        title: '提示',
        content: '请先创建家庭信息',
        showCancel: false,
        confirmText: '知道了'
      })
    }
  },

  globalData: {
    userInfo: null,
    openid: '',
    familyId: '',
    myRole: '',
    baseUrl: 'https://babycare-backend-teha.onrender.com',
  },

  getOpenId: function () {
    return this.globalData.openid || getOpenId()
  },

  getFamilyId: function () {
    return this.globalData.familyId || getFamilyId()
  },

  getMyRole: function () {
    return this.globalData.myRole || getMyRole()
  }
})
