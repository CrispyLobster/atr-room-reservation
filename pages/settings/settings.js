Page({
	data: {},

	// 清除缓存
	clearCache: function () {
		wx.showModal({
			title: '清除缓存',
			content: '确定要清除本地缓存吗？',
			success: res => {
				if (res.confirm) {
					// 保留关键数据，如用户登录状态
					const userInfo = wx.getStorageSync('userInfo')
					const userProfile = wx.getStorageSync('userProfile')
					const hasLogin = wx.getStorageSync('hasLogin')

					// 清除存储
					wx.clearStorageSync()

					// 恢复关键数据
					if (userInfo) wx.setStorageSync('userInfo', userInfo)
					if (userProfile) wx.setStorageSync('userProfile', userProfile)
					if (hasLogin) wx.setStorageSync('hasLogin', hasLogin)

					wx.showToast({
						title: '缓存已清除',
						icon: 'success',
					})
				}
			},
		})
	},

	// 关于我们
	showAbout: function () {
		wx.showModal({
			title: '关于ATR研讨室预约助手',
			content: 'ATR研讨室预约助手是一款为ATRer提供研讨室预约服务的小程序。\n\n版本: 1.0.0',
			showCancel: false,
		})
	},

	// 联系我们
	contactUs: function () {
		wx.showModal({
			title: '联系我们',
			content: '如有问题或建议，请联系:\n\n邮箱: 36920231153269@stu.xmu.edu.cn\n',
			showCancel: false,
		})
	},
})
