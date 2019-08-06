/*
 * weixin相关api的promise封装
 *  
 * @version 1.1
 * @date 20180321
 */
const config = require('../../config/config.js');
// const statisticService = require('./statistic.service.js');

const API_SERVER = config.user_api_server;

const PARSE_OPENID = API_SERVER + "/weixin/oauth/ma/wx9d675c47a74ca443";
const UPDATE_USER_WEIXIN_MA_PROFILE = API_SERVER + "/user/weixin/ma/profile/";

const HOUR_12 = 12 * 60 * 60 * 1000
const HOUR_2 = 2 * 60 * 60 * 1000

class WeixinService {

  /** 
   * 发起网络请求 
   * 
   * 约定：
   * then里已过滤掉返回值外层，只返回response.data
   * catch捕捉非200网络错误和code非0的业务错误
   * 
   * @param {string} url   
   * @param {object} params  
   * @return {Promise}  
   */
  static http(url, method = "GET", params) {
    return new Promise((resolve, reject) => {
      let header = {
        'Content-Type': 'application/json;charset=utf-8',
        'Authentication': wx.getStorageSync('WX-TOKEN') || '',
        'X-From-Terminal': wx.getStorageSync('WX-TERMINAL') || '',
        'X-From-Uuid': wx.getStorageSync('WX-UUID') || ''
      }
      let data = Object.assign({}, params)
      console.log("[HTTP " + method + "]", url, data);
      wx.request({
        url: url,
        data: data,
        method: method,
        header: header,
        success: function(res) {
          if (res.data.code === 0) {
            resolve(res.data.data)
          } else if (res.data.code == 1001) {
            console.log('token过期', res)
            WeixinService.init(true)
            reject("再试一次")
          } else {
            console.log('1.HTTP的错误', res)
            reject(res.data.message)
          }
        },
        fail: function(err) {
          console.log('2.HTTP的错误', err)
          reject(err.errMsg)
        }
      });
    });
  };

  /**
   * 业务初始化，解析openid并获取token
   */
  static init(force = false) {
    let now = new Date().getTime()
    let expireAt = wx.getStorageSync('WX-EXPIRE-AT') || (now - 1)
    if (force || (expireAt < now)) {
      WeixinService.loginComplete()
    } else {
      wx.checkSession({
        success() {
          // session_key 未过期，并且在本生命周期一直有效
          console.log("session ok")
        },
        fail() {
          // session_key 已经失效，需要重新执行登录流程
          WeixinService.loginComplete()
        }
      })
    }
  }

  static loginComplete() {
    this.loginFromWeichat()
      .then(this.loginFromRemoteServer)
      .then(res => {
        console.log('[loginCompelete]', res)
      })
      .catch(err => {
        console.log('[loginCompelete错误]', err)
      })
  }

  /** 
   * 登陆微信 
   * @return {Promise}  
   */
  static loginFromWeichat() {
    console.log('[开始微信登陆]')
    return new Promise((resolve, reject) =>
      wx.login({
        success: resolve,
        fail: reject
      })
    );
  };

  /** 
   * 向服务器请求解析OPENID
   * @param {object} res 原始信息
   * @return {Promise}  
   */
  static loginFromRemoteServer(res) {
    //console.log('[开始向服务器请求解析OPENID]', res)
    let url = PARSE_OPENID + '?js_code=' + res.code
    return new Promise((resolve, reject) =>
      WeixinService.http(url, "GET").then(data => {
        console.log('[loginFromRemoteServer]', data.openid)
        wx.setStorageSync('WX-UUID', data.uuid)
        wx.setStorageSync('WX-OPENID', data.openid)
        wx.setStorageSync('WX-EXPIRE-AT', data.expire_at)
        wx.setStorageSync('WX-TOKEN', data.token)
        wx.setStorageSync('WX-TERMINAL', data.from_terminal)
        resolve(data)
      }).catch(err => {
        console.log('[loginFromRemoteServer错误]', err)
        reject(err)
      })
    );
  }


  /** 
   * 公用Toast
   * @param title提示语
   */
  static showToast(title) {
    wx.showToast({
      title: title,
      icon: 'none',
      duration: 2000
    })
  }

  /**
   * 从wechat拉取用户信息并同步到服务器
   * 成功返回 res {UserInfo}
   * @return {Promise} 
   */
  static syncWechatUserInfo() {
    let user = wx.getStorageSync('WX-USER')
    let now = new Date().getTime()
    if (user && (now - user.update_at < HOUR_12)) {
      //12小时内无需更新
      console.log('User更新跳过')
      return Promise.resolve(user)
    }
    let openid = wx.getStorageSync('WX-OPENID')
    if (!openid) {
      return Promise.reject('openid null')
    }
    return new Promise((resolve, reject) => {
      wx.getUserInfo({
        lang: 'zh_CN',
        success: function(rawData) {
          WeixinService.http(UPDATE_USER_WEIXIN_MA_PROFILE + openid,
            "PUT",
            rawData.userInfo
          ).then((res) => {
            console.log('同步成功', res)
            wx.setStorageSync('WX-USER', res)
            resolve(res)
          }).catch((err) => {
            console.log('同步失败', err)
            reject(err)
          })
        },
        fail: function(error) {
          console.log('从微信获取失败', error)
          reject(error)
        }
      })
    })
  }
}

module.exports = WeixinService;