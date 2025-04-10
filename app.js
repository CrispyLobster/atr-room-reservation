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
		wx.cloud.callFunction({
			name: 'login',
			success: res => {
				const openid = res.result.openid
				// 查询用户信息
				wx.cloud
					.database()
					.collection('users')
					.doc(openid)
					.get()
					.then(res => {
						if (res.data) {
							this.globalData.userInfo = res.data
							this.globalData.hasLogin = true
						}
					})
					.catch(err => {
						console.log('用户未登录或不存在', err)
					})
			},
			fail: err => {
				console.error('云函数调用失败', err)
			},
		})
	},
})
