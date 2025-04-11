/**
 * 文件: app.js
 * 功能: 应用程序入口文件，负责小程序的初始化、全局数据管理和用户登录状态处理
 * 包含:
 * - 全局数据定义: 用户信息、登录状态、主题颜色等
 * - 应用启动生命周期函数(onLaunch)
 * - 用户信息获取与云数据库交互
 * - 头像临时URL获取与缓存
 *
 * 这是ATR研讨室预约助手小程序的核心文件，管理全局状态和数据流
 */

App({
	globalData: {
		userInfo: null,
		hasLogin: false,
		themeColor: '#3A5FCD', // 主题色 - 深蓝色
		accentColor: '#FF8C00', // 强调色 - 橙色
		bgColor: '#F5F5F5', // 背景色 - 浅灰色
		// 用于存储预约数据的临时对象
		appointments: [],
	},

	onLaunch: function () {
		console.log('App onLaunch')

		// 初始化云开发环境
		if (!wx.cloud) {
			console.error('请使用 2.2.3 或以上的基础库以使用云能力')
		} else {
			wx.cloud.init({
				env: 'cloud1-1gketkbl862fec31', // 请替换为您的云环境ID
				traceUser: true,
			})
		}

		// 获取本地存储中的用户信息
		const storedUserInfo = wx.getStorageSync('userInfo')
		if (storedUserInfo) {
			console.log('从本地存储恢复用户信息')

			// 只有当用户信息完整时才设置登录状态为true
			const isComplete = storedUserInfo.realName && storedUserInfo.studentId && storedUserInfo.phone

			this.globalData.userInfo = storedUserInfo
			this.globalData.hasLogin = isComplete // 只有个人信息完整才视为已登录

			console.log('用户登录状态:', isComplete ? '已登录' : '未完成注册')
		}

		// 获取最新用户信息
		this.fetchUserInfo()
	},

	// 获取用户信息函数
	fetchUserInfo: function () {
		return new Promise((resolve, reject) => {
			console.log('获取用户信息...')
			wx.cloud.callFunction({
				name: 'login',
				success: res => {
					const openid = res.result.openid
					console.log('获取到用户openid:', openid)

					// 查询用户信息
					wx.cloud
						.database()
						.collection('users')
						.doc(openid)
						.get()
						.then(res => {
							if (res.data) {
								console.log('获取到用户信息:', res.data)

								// 从本地存储中获取之前的临时URL
								const currentUserInfo = this.globalData.userInfo || {}
								const previousTempUrl = currentUserInfo.tempAvatarUrl

								// 存储用户信息到全局变量
								this.globalData.userInfo = {
									...res.data,
									// 保留之前的临时URL，如果存在的话
									tempAvatarUrl: previousTempUrl,
								}
								this.globalData.hasLogin = true

								// 将用户信息保存到本地存储
								wx.setStorageSync('userInfo', this.globalData.userInfo)

								// 如果有头像，获取临时路径
								if (res.data.avatarUrl) {
									if (res.data.avatarUrl.indexOf('cloud://') === 0) {
										console.log('检测到云存储头像，路径:', res.data.avatarUrl)
										// 获取临时文件路径
										wx.cloud.getTempFileURL({
											fileList: [res.data.avatarUrl],
											success: tempRes => {
												if (
													tempRes.fileList &&
													tempRes.fileList[0] &&
													tempRes.fileList[0].tempFileURL
												) {
													console.log('获取临时头像URL成功:', tempRes.fileList[0].tempFileURL)

													// 更新到全局数据
													this.globalData.userInfo.tempAvatarUrl = tempRes.fileList[0].tempFileURL

													// 保存更新后的用户信息到本地存储
													wx.setStorageSync('userInfo', this.globalData.userInfo)

													// 刷新全局数据完成后解析Promise
													resolve(this.globalData.userInfo)
												} else {
													console.warn('获取的临时URL格式不符合预期:', tempRes)
													resolve(this.globalData.userInfo)
												}
											},
											fail: err => {
												console.error('获取临时头像URL失败:', err)
												resolve(this.globalData.userInfo)
											},
											complete: () => {
												console.log('临时头像URL处理完成')
											},
										})
									} else {
										console.log('用户头像不是云存储路径，直接使用:', res.data.avatarUrl)
										resolve(this.globalData.userInfo)
									}
								} else {
									console.log('用户没有头像')
									resolve(this.globalData.userInfo)
								}
							} else {
								console.log('未找到用户数据')
								resolve(null)
							}
						})
						.catch(err => {
							console.log('用户未登录或不存在', err)
							reject(err)
						})
				},
				fail: err => {
					console.error('云函数调用失败', err)
					reject(err)
				},
			})
		})
	},
})
