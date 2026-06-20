/**
 * 宝宝信息 & 家庭共享 & 用户身份管理
 *
 * 存储结构：
 * - openid: 微信用户唯一标识（登录后获取）
 * - familyId: 家庭码（fam-xxxxxxxx），服务端持久化
 * - myRole: 当前用户在家庭中的角色（mom/dad/other）
 * - babyInfo: 兼容旧版宝宝昵称等缓存
 */

var OPENID_KEY = 'babycare_openid'
var FAMILY_ID_KEY = 'babycare_family_id'
var MY_ROLE_KEY = 'babycare_my_role'
var ACTIVE_BABY_KEY = 'babycare_active_baby'
var BABY_INFO_KEY = 'babycare_baby_info'

// ========== OpenID ==========

function getOpenId() {
  return wx.getStorageSync(OPENID_KEY) || ''
}

function setOpenId(openid) {
  wx.setStorageSync(OPENID_KEY, openid)
}

// ========== Family ID ==========

function getFamilyId() {
  return wx.getStorageSync(FAMILY_ID_KEY) || ''
}

function setFamilyId(familyId) {
  wx.setStorageSync(FAMILY_ID_KEY, familyId)
}

// ========== My Role ==========

function getMyRole() {
  return wx.getStorageSync(MY_ROLE_KEY) || ''
}

function setMyRole(role) {
  wx.setStorageSync(MY_ROLE_KEY, role)
}

// ========== Active Baby ==========

function getActiveBaby() {
  var raw = wx.getStorageSync(ACTIVE_BABY_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (e) {
    return null
  }
}

function setActiveBaby(baby) {
  var app = getApp()
  if (baby) {
    var json = JSON.stringify(baby)
    wx.setStorageSync(ACTIVE_BABY_KEY, json)
    if (app) app.globalData.activeBaby = baby
  } else {
    wx.removeStorageSync(ACTIVE_BABY_KEY)
    if (app) app.globalData.activeBaby = null
  }
}

// ========== Baby Info (兼容旧版) ==========

function generateBabyId() {
  var chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  var id = 'bb-'
  for (var i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

function getBabyInfo() {
  var raw = wx.getStorageSync(BABY_INFO_KEY)
  if (!raw) return null
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw) } catch (e) { return null }
  }
  return raw
}

function getBabyId() {
  var active = getActiveBaby()
  if (active && active.id) return active.id
  return getFamilyId() || (getBabyInfo() && getBabyInfo().babyId) || ''
}

function saveBabyInfo(info) {
  wx.setStorageSync(BABY_INFO_KEY, info)
}

module.exports = {
  // 用户身份
  getOpenId: getOpenId,
  setOpenId: setOpenId,
  // 家庭
  getFamilyId: getFamilyId,
  setFamilyId: setFamilyId,
  getMyRole: getMyRole,
  setMyRole: setMyRole,
  // 当前宝宝
  getActiveBaby: getActiveBaby,
  setActiveBaby: setActiveBaby,
  ACTIVE_BABY_KEY: ACTIVE_BABY_KEY,
  // 兼容旧版
  BABY_INFO_KEY: BABY_INFO_KEY,
  generateBabyId: generateBabyId,
  getBabyInfo: getBabyInfo,
  getBabyId: getBabyId,
  saveBabyInfo: saveBabyInfo
}
