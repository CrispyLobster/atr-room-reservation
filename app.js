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

		// 获取本地存储的用户信息
		const userInfo = wx.getStorageSync('userInfo')
		const hasLogin = wx.getStorageSync('hasLogin')

		if (userInfo && hasLogin) {
			console.log('用户已登录', userInfo)
			this.globalData.userInfo = userInfo
			this.globalData.hasLogin = hasLogin
		} else {
			console.log('用户未登录')
		}

		// 加载本地存储的预约数据
		const appointments = wx.getStorageSync('appointments')
		if (appointments) {
			this.globalData.appointments = appointments
		}
	},
})
