// page/component/pay/result/result.js

let app = getApp();
const weixinService = app.globalData.weixinService;
const configUrl = app.globalData.configUrl;


const formatMoney = function (fen) {
  return fen / 100;
}

Page({

  /**
   * 页面的初始数据
   */
  data: {
    loading: false,
    paySucess: false,
    originPrice: 0,
    finalPrice: 0,
    finalCut: 0,
    logo: 'https://bytehonor.oss-cn-hangzhou.aliyuncs.com/resource/logo/Bitcoin-Logo-Black.jpg'
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (e) {
    console.log("付款结果页面", e)

    this.setData({
      originPrice: 100,
      finalPrice: 1,
      finalCut: 99,
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  },

  requestPayment: function () {
    var self = this

    self.setData({
      loading: true
    })
    // 此处需要先调用wx.login方法获取code，然后在服务端调用微信接口使用code换取下单用户的openId
    // 具体文档参考https://mp.weixin.qq.com/debug/wxadoc/dev/api/api-login.html?t=20161230#wxloginobject
    let openid = wx.getStorageSync('WX-OPENID')
    let time = new Date().getTime()
    let param = {
      openid: openid,
      body: '支付测试',
      spbill_create_ip: '192.168.1.2',
      out_trade_no: 'otn' + time,
      total_fee: 100
    }
    weixinService.http(configUrl.system_api_server + '/weixin/pay/unifiedorder/wxa_test',
      'POST',
      param)
      .then(payargs => {
        console.log('unified order success, response is:', payargs)
        wx.requestPayment({
          timeStamp: payargs.time_stamp,
          nonceStr: payargs.nonce_str,
          package: payargs.package_value,
          signType: payargs.sign_type,
          paySign: payargs.pay_sign,
          success: function (res) {
            console.log('success', res)
            self.setData({
              paySucess: true
            })
            wx.navigateBack({
              delta: 1
            })
          },
          fai: function (res) {
            console.log('fai', res)
          },
          complete: function (res) {
            console.log('complete', res)
            self.setData({
              loading: false
            })
          }
        })
      }).catch(errMsg => {
        console.log('unified order failed', errMsg)
        wx.showToast({
          title: '没点中',
          image: '/image/error_white.png'
        })
        self.setData({
          loading: false
        })
      })
  },
  
})