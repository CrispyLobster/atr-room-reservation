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

		// 获取用户登录信息
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
								// 存储用户信息到全局变量
								this.globalData.userInfo = res.data
								this.globalData.hasLogin = true

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
													this.globalData.userInfo.tempAvatarUrl = tempRes.fileList[0].tempFileURL
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
